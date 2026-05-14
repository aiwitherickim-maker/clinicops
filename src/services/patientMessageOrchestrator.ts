// patientMessageOrchestrator.ts — server-side only.
// Orchestrates the full patient message workflow:
//   Intent Agent → Safety Agent → Knowledge Agent → Action Planner Agent
//   → Controlled Response Agent
//   → persist to Supabase
//   → return WorkflowStep for UI display

import { runIntentAgent, type IntentResult } from './agents/intentAgent';
import { runSafetyAgent, type SafetyResult } from './agents/safetyAgent';
import { runKnowledgeAgent, type KnowledgeResult } from './agents/knowledgeAgent';
import { runActionPlannerAgent, type ActionPlannerResult } from './agents/actionPlannerAgent';
import { runResponseAgent, type ResponseMode } from './agents/responseAgent';
import { createMessage, updateMessageStatus } from './db/messageService';
import { saveAgentAnalysis } from './db/analysisService';
import { createDraft } from './db/draftService';
import { createTaskFromMessage } from './db/taskDbService';
import type { WorkflowStep, ResponseType } from '@/types';
import type { MessageStatus, TaskPriority } from '@/types/database';

// ─── mock validation agent ────────────────────────────────────────────────────

function mockValidationAgent(safety: SafetyResult) {
  return {
    status: safety.needs_human_review
      ? 'Approved for review queue'
      : 'Approved for automated response',
    issue: 'No autonomous medical advice detected',
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toMessageStatus(safety: SafetyResult): MessageStatus {
  return safety.needs_human_review ? 'needs_review' : 'new';
}

function toTaskPriority(safety: SafetyResult): TaskPriority {
  if (safety.risk_level === 'high') return 'urgent';
  if (safety.risk_level === 'medium') return 'medium';
  return 'low';
}

function toRouteLabel(routeTo: string): string {
  switch (routeTo) {
    case 'clinician':     return 'Clinician';
    case 'billing':       return 'Billing';
    case 'front_desk':    return 'Front Desk';
    default:              return 'Staff';
  }
}

function deriveResponseMode(planner: ActionPlannerResult, knowledge: KnowledgeResult): ResponseMode {
  // Approved-source answer takes priority when knowledge can answer directly
  if (knowledge.can_answer_directly && (knowledge.relevance === 'high' || knowledge.relevance === 'medium')) {
    return 'approved_source_answer';
  }
  const replyAction = planner.recommended_actions.find(a =>
    a.type === 'send_safe_acknowledgment' ||
    a.type === 'send_preapproved_safety_response' ||
    a.type === 'draft_patient_reply',
  );
  if (!replyAction) return 'draft_patient_reply';
  return replyAction.type as ResponseMode;
}

function responseModeToType(mode: ResponseMode, safety: SafetyResult): ResponseType {
  switch (mode) {
    case 'send_safe_acknowledgment':         return 'safe_acknowledgment';
    case 'approved_source_answer':           return 'source_answered';
    case 'send_preapproved_safety_response': return safety.risk_level === 'high' ? 'urgent_safety' : 'preapproved_safety';
    case 'draft_patient_reply':              return 'draft_review';
  }
}

function toWorkflowStatusLabel(status: string): string {
  switch (status) {
    case 'needs_clinician_review':   return 'Needs Clinician Review';
    case 'needs_billing_review':     return 'Needs Billing Review';
    case 'needs_front_desk_review':  return 'Needs Front Desk Review';
    case 'ready_for_staff_approval': return 'Ready for Staff Approval';
    case 'resolved_by_ai_draft':     return 'Resolved by AI Draft';
    default:                         return status;
  }
}

// ─── orchestrator ─────────────────────────────────────────────────────────────

export interface OrchestratorResult {
  workflow: WorkflowStep;
  draftText: string;
  badgeText: string;
  responseType: ResponseType;
  messageId: string | null;
}

export async function runPatientMessageWorkflow(
  messageText: string,
  patientName: string,
  clinicId: string,
): Promise<OrchestratorResult> {
  console.log('[orchestrator] starting workflow for:', patientName, '|', messageText.slice(0, 60));

  // ── Step 1: Intent Agent (real Claude) ───────────────────────────────────
  const intent = await runIntentAgent(messageText);
  console.log('[orchestrator] intent:', intent);

  // ── Step 2: Safety Agent (real Claude) ───────────────────────────────────
  const safety = await runSafetyAgent(messageText, intent);
  console.log('[orchestrator] safety:', safety);

  // ── Step 3: Knowledge Agent (real Claude) ────────────────────────────────
  const knowledge = await runKnowledgeAgent(messageText, intent, safety, clinicId);
  console.log('[orchestrator] knowledge:', knowledge);

  // ── Step 4: Action Planner Agent (real Claude) ───────────────────────────
  const planner = await runActionPlannerAgent(messageText, intent, safety, knowledge);
  console.log('[orchestrator] planner:', planner);

  // ── Step 5: Controlled Response Agent (real Claude) ─────────────────────
  const responseMode = deriveResponseMode(planner, knowledge);
  console.log('[orchestrator] responseMode:', responseMode);

  const responseResult = await runResponseAgent(
    messageText, intent, safety, knowledge, planner, responseMode,
    {
      assistantName: 'ArborCare Assistant',
      tone:          'Professional and warm',
      phone:         '(734) 555-0142',
    },
  );
  console.log('[orchestrator] response agent result:', responseResult);

  // ── Step 6: Mock validation agent ────────────────────────────────────────
  const validation = mockValidationAgent(safety);

  // ── Build WorkflowStep for UI ─────────────────────────────────────────────
  const workflow: WorkflowStep = {
    intent: {
      intent:     intent.primary_intent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      domain:     intent.domain,
      confidence: typeof intent.confidence === 'number' && intent.confidence <= 1
        ? Math.round(intent.confidence * 100)
        : intent.confidence,
    },
    safety: {
      risk:    safety.risk_level.charAt(0).toUpperCase() + safety.risk_level.slice(1),
      review:  safety.needs_human_review ? 'Required' : 'Not required',
      routeTo: toRouteLabel(safety.route_to),
    },
    knowledge: {
      source:    knowledge.matched_source_title   ?? 'No matching source found',
      rule:      knowledge.allowed_content_summary,
      relevance: knowledge.relevance,
    },
    planner: {
      status: toWorkflowStatusLabel(planner.workflow_status),
      actions: planner.recommended_actions.map(a => ({
        title:             a.title,
        role:              toRouteLabel(a.assignee_role),
        priority:          a.priority.charAt(0).toUpperCase() + a.priority.slice(1),
        reason:            a.reason,
        requires_approval: a.requires_approval,
      })),
    },
    validation: {
      status: validation.status,
      issue:  validation.issue,
    },
  };

  // ── Persist to Supabase ───────────────────────────────────────────────────
  let messageId: string | null = null;

  try {
    // 1. Save patient message
    const message = await createMessage({
      clinic_id:    clinicId,
      patient_name: patientName,
      message_text: messageText,
      channel:      'simulator',
      category:     intent.domain,
      risk_level:   safety.risk_level,
      route_to:     toRouteLabel(safety.route_to),
      status:       'new',
    });
    console.log('[orchestrator] message saved:', message?.id);
    if (!message) throw new Error('Failed to save patient message');
    messageId = message.id;

    // 2. Save agent analysis
    const analysis = await saveAgentAnalysis({
      message_id: message.id,
      intent:     intent as unknown as Record<string, unknown>,
      safety:     safety as unknown as Record<string, unknown>,
      knowledge:  knowledge as unknown as Record<string, unknown>,
      actions:    planner as unknown as Record<string, unknown>,
      draft:      { text: responseResult.response_text, mode: responseMode, badge: responseResult.badge_text },
      validation: validation as Record<string, unknown>,
      final_status: 'approved_for_queue',
    });
    console.log('[orchestrator] analysis saved:', analysis?.id);

    // 3. Update message status
    const finalStatus = toMessageStatus(safety);
    await updateMessageStatus(message.id, finalStatus);
    console.log('[orchestrator] message status updated to:', finalStatus);

    // 4. Save draft response
    const draftStatus = responseResult.requires_approval ? 'needs_review' : 'approved';
    const draft = await createDraft({
      message_id:  message.id,
      analysis_id: analysis?.id ?? null,
      draft_text:  responseResult.response_text,
      status:      draftStatus,
      edited_text: null,
      approved_by: null,
      approved_at: null,
    });
    console.log('[orchestrator] draft saved:', draft?.id, '| status:', draftStatus);

    // 5. Create tasks for every create_task action in the planner result
    const taskActions = planner.recommended_actions.filter(a => a.type === 'create_task');
    if (!taskActions.length) {
      // Fallback: ensure at least one task is always created
      taskActions.push({
        type: 'create_task',
        title: `Review ${intent.domain} message from ${patientName}`,
        description: '',
        assignee_role: safety.route_to as ActionPlannerResult['recommended_actions'][0]['assignee_role'],
        priority: toTaskPriority(safety),
        requires_approval: safety.needs_human_review,
        reason: 'Fallback task',
      });
    }
    for (const action of taskActions) {
      const task = await createTaskFromMessage(
        clinicId,
        message.id,
        action.title,
        {
          assignedRole: toRouteLabel(action.assignee_role),
          priority:     action.priority as TaskPriority,
        },
      );
      console.log('[orchestrator] task created:', task?.id, '| priority:', task?.priority);
    }

  } catch (err) {
    console.error('[orchestrator] Supabase persist error:', err);
    // Don't throw — still return the workflow result so the UI works
  }

  const responseType = responseModeToType(responseMode, safety);
  console.log('[orchestrator] responseType:', responseType);

  return {
    workflow,
    draftText: responseResult.response_text,
    badgeText: responseResult.badge_text,
    responseType,
    messageId,
  };
}
