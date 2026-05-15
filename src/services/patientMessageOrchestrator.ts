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
import { runQAAgent } from './agents/qaAgent';
import { runStaffFollowupDraftAgent } from './agents/staffFollowupDraftAgent';
import { createMessage, updateMessageStatus } from './db/messageService';
import { saveAgentAnalysis } from './db/analysisService';
import { createDraft } from './db/draftService';
import { createTaskFromMessage } from './db/taskDbService';
import type { WorkflowStep, ResponseType, StageLog } from '@/types';
import type { MessageStatus, TaskPriority } from '@/types/database';

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
  stageLogs: StageLog[];
}

export async function runPatientMessageWorkflow(
  messageText: string,
  patientName: string,
  clinicId: string,
): Promise<OrchestratorResult> {
  console.log('[orchestrator] starting workflow for:', patientName, '|', messageText.slice(0, 60));

  const stageLogs: StageLog[] = [];
  const log = (
    stage: string,
    label: string,
    status: StageLog['status'] = 'completed',
    details?: string,
  ) => stageLogs.push({ stage, label, status, timestamp: new Date().toISOString(), details });

  log('message_received', 'Received patient message');

  // ── Step 1: Intent Agent (real Claude) ───────────────────────────────────
  const intent = await runIntentAgent(messageText);
  console.log('[orchestrator] intent:', intent);
  const intentLabel  = intent.primary_intent.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const intentConf   = typeof intent.confidence === 'number' && intent.confidence <= 1
    ? Math.round(intent.confidence * 100)
    : intent.confidence;
  log('intent_completed', `Classified intent as ${intentLabel}`, 'completed', `${intent.domain} · ${intentConf}% confidence`);

  // ── Step 2: Safety Agent (real Claude) ───────────────────────────────────
  const safety = await runSafetyAgent(messageText, intent);
  console.log('[orchestrator] safety:', safety);
  const riskLabel  = safety.risk_level.charAt(0).toUpperCase() + safety.risk_level.slice(1);
  const routeLabel = toRouteLabel(safety.route_to);
  log('safety_completed', `Assessed safety risk: ${riskLabel}`, 'completed', `Route to ${routeLabel}`);

  // ── Step 3: Knowledge Agent (real Claude) ────────────────────────────────
  const knowledge = await runKnowledgeAgent(messageText, intent, safety, clinicId);
  console.log('[orchestrator] knowledge:', knowledge);
  if (knowledge.can_answer_directly && knowledge.matched_source_title) {
    log('knowledge_completed', 'Matched approved clinic source', 'completed', knowledge.matched_source_title);
  } else {
    log('knowledge_completed', 'No matching clinic source', 'skipped');
  }

  // ── Step 4: Action Planner Agent (real Claude) ───────────────────────────
  const planner = await runActionPlannerAgent(messageText, intent, safety, knowledge);
  console.log('[orchestrator] planner:', planner);
  log('action_planner_completed', `Planned: ${toWorkflowStatusLabel(planner.workflow_status)}`);

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
  const responseModeLabel: Record<string, string> = {
    send_safe_acknowledgment:         'Safe acknowledgment',
    approved_source_answer:           'Approved source answer',
    send_preapproved_safety_response: 'Safety response',
    draft_patient_reply:              'Staff review draft',
  };
  log('response_completed', `Prepared response: ${responseModeLabel[responseMode] ?? responseMode}`);

  // ── Step 6: QA Agent (real Claude) ───────────────────────────────────────
  const qaResult = await runQAAgent(
    messageText, intent, safety, knowledge, planner, responseResult, responseMode,
  );
  console.log('[orchestrator] qaResult:', qaResult);

  // Select final response text based on QA status
  const finalResponseText =
    (qaResult.qa_status === 'approved' || qaResult.qa_status === 'fallback_approved')
      ? (qaResult.approved_response_text ?? qaResult.safe_fallback_response)
      : qaResult.safe_fallback_response;
  const finalBadgeText = qaResult.badge_text;
  console.log('[orchestrator] final response selected:', qaResult.qa_status);

  if (qaResult.qa_status === 'approved') {
    log('qa_completed', 'QA approved auto-send');
  } else if (qaResult.qa_status === 'fallback_approved') {
    log('qa_completed', 'Used safe fallback response', 'completed');
  } else if (qaResult.qa_status === 'blocked') {
    log('qa_completed', 'QA blocked — requires manual review', 'failed');
  } else {
    log('qa_completed', `QA: ${qaResult.qa_status}`);
  }

  // ── Build WorkflowStep for UI ─────────────────────────────────────────────
  const workflow: WorkflowStep = {
    intent: {
      intent:     intentLabel,
      domain:     intent.domain,
      confidence: intentConf,
    },
    safety: {
      risk:    riskLabel,
      review:  safety.needs_human_review ? 'Required' : 'Not required',
      routeTo: routeLabel,
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
      qaStatus:           qaResult.qa_status.charAt(0).toUpperCase() + qaResult.qa_status.slice(1).replace('_', ' '),
      canAutoSend:        qaResult.can_auto_send,
      requiresHumanReview: qaResult.requires_human_review,
      reasonSummary:      qaResult.reason_summary,
      issues:             qaResult.issues,
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
      route_to:     routeLabel,
      status:       'new',
    });
    console.log('[orchestrator] message saved:', message?.id);
    if (!message) throw new Error('Failed to save patient message');
    messageId = message.id;
    log('patient_message_saved', 'Patient message saved');

    // 2. Save agent analysis
    const analysis = await saveAgentAnalysis({
      message_id: message.id,
      intent:     intent as unknown as Record<string, unknown>,
      safety:     safety as unknown as Record<string, unknown>,
      knowledge:  knowledge as unknown as Record<string, unknown>,
      actions:    planner as unknown as Record<string, unknown>,
      draft:      { text: finalResponseText, mode: responseMode, badge: finalBadgeText },
      validation: qaResult as unknown as Record<string, unknown>,
      final_status: 'approved_for_queue',
    });
    console.log('[orchestrator] analysis saved:', analysis?.id);

    // 3. Update message status
    const finalStatus = toMessageStatus(safety);
    await updateMessageStatus(message.id, finalStatus);

    // 4a. Save the immediate patient response for audit
    const immediateStatus = qaResult.can_auto_send ? 'approved' : 'needs_review';
    await createDraft({
      message_id:  message.id,
      analysis_id: analysis?.id ?? null,
      draft_text:  finalResponseText,
      draft_type:  'immediate_patient_response',
      status:      immediateStatus,
      edited_text: null,
      approved_by: null,
      approved_at: null,
    });

    // 4b. Generate and save staff follow-up draft (shown in Staff Review Inbox)
    const staffDraft = await runStaffFollowupDraftAgent({
      messageText,
      patientName,
      intent,
      safety,
      knowledge,
      planner,
      qaResult,
      clinicPhone: '(734) 555-0142',
    });
    console.log('[orchestrator] staff draft generated:', staffDraft.draft_type, '| role:', staffDraft.intended_sender_role);

    await createDraft({
      message_id:  message.id,
      analysis_id: analysis?.id ?? null,
      draft_text:  staffDraft.draft_text,
      draft_type:  'staff_followup_draft',
      status:      'needs_review',
      edited_text: null,
      approved_by: null,
      approved_at: null,
    });
    log('draft_saved', 'Staff follow-up draft prepared');

    // 5. Create tasks for every create_task action in the planner result
    const taskActions = planner.recommended_actions.filter(a => a.type === 'create_task');
    if (!taskActions.length) {
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
      log('task_created', `Created ${toRouteLabel(action.assignee_role)} follow-up task`, 'completed', action.title);
    }

    if (safety.needs_human_review) {
      log('human_review_required', `${routeLabel} follow-up required`);
    }

  } catch (err) {
    console.error('[orchestrator] Supabase persist error:', err);
    log('failed', 'Database persist failed', 'failed', String(err));
  }

  log('completed', 'Workflow complete');

  // For fallback_approved on clinical-risk, override responseType so badge color is red
  const responseType: ResponseType =
    qaResult.qa_status === 'fallback_approved' && safety.risk_level === 'high'
      ? 'urgent_safety'
      : responseModeToType(responseMode, safety);
  console.log('[orchestrator] responseType:', responseType);

  return {
    workflow,
    draftText: finalResponseText,
    badgeText: finalBadgeText,
    responseType,
    messageId,
    stageLogs,
  };
}
