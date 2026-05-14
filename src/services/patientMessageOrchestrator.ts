// patientMessageOrchestrator.ts — server-side only.
// Orchestrates the full patient message workflow:
//   patient message → Intent Agent (Claude) → Safety Agent (Claude)
//   → Knowledge Agent (Claude) → Action Planner Agent (Claude)
//   → mock Drafting/Validation agents
//   → persist to Supabase
//   → return WorkflowStep for UI display

import { runIntentAgent, type IntentResult } from './agents/intentAgent';
import { runSafetyAgent, type SafetyResult } from './agents/safetyAgent';
import { runKnowledgeAgent, type KnowledgeResult } from './agents/knowledgeAgent';
import { runActionPlannerAgent, type ActionPlannerResult } from './agents/actionPlannerAgent';
import { createMessage, updateMessageStatus } from './db/messageService';
import { saveAgentAnalysis } from './db/analysisService';
import { createDraft } from './db/draftService';
import { createTaskFromMessage } from './db/taskDbService';
import type { WorkflowStep } from '@/types';
import type { MessageStatus, TaskPriority } from '@/types/database';

// ─── mock agents ──────────────────────────────────────────────────────────────

function mockDraftingAgent(intent: IntentResult, safety: SafetyResult): string {
  if (safety.risk_level === 'high') {
    return "I'm sorry you're experiencing this. I've flagged your message for our clinical team — someone will follow up with you very shortly. If you have severe or rapidly worsening symptoms, please call us immediately at (734) 555-0142 or go to urgent care.";
  }
  if (intent.domain === 'Billing') {
    return "Thank you for your question about billing. A member of our billing team will review your account and follow up with the details you need.";
  }
  if (intent.domain === 'Scheduling') {
    return "Thank you for reaching out. Our front desk will check availability and confirm your appointment change shortly.";
  }
  return "Thank you for your message. A staff member will review it and follow up with you soon.";
}

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

  // ── Step 5: Mock drafting + validation agents ─────────────────────────────
  const draftText  = mockDraftingAgent(intent, safety);
  const validation = mockValidationAgent(safety);

  console.log('[orchestrator] mock agents complete');

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
        title:    a.title,
        role:     toRouteLabel(a.assignee_role),
        priority: a.priority.charAt(0).toUpperCase() + a.priority.slice(1),
        reason:   a.reason,
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
      draft:      { text: draftText },
      validation: validation as Record<string, unknown>,
      final_status: 'approved_for_queue',
    });
    console.log('[orchestrator] analysis saved:', analysis?.id);

    // 3. Update message status
    const finalStatus = toMessageStatus(safety);
    await updateMessageStatus(message.id, finalStatus);
    console.log('[orchestrator] message status updated to:', finalStatus);

    // 4. Save draft response
    const draft = await createDraft({
      message_id:  message.id,
      analysis_id: analysis?.id ?? null,
      draft_text:  draftText,
      status:      'needs_review',
      edited_text: null,
      approved_by: null,
      approved_at: null,
    });
    console.log('[orchestrator] draft saved:', draft?.id);

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

  return { workflow, draftText, messageId };
}
