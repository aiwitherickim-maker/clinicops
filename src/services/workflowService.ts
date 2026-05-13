// workflowService.ts
// Orchestrates the full patient message workflow:
// new → analyzing → agent analysis saved → draft created → task created → needs_review

import { createMessage, updateMessageStatus, progressMessageStatus } from './db/messageService';
import { saveAgentAnalysis } from './db/analysisService';
import { createDraft } from './db/draftService';
import { createTaskFromMessage } from './db/taskDbService';
import type { DbPatientMessage, DbAgentAnalysis, DbDraftResponse, DbTask } from '@/types/database';

export interface WorkflowInput {
  clinicId: string;
  patientName: string;
  messageText: string;
  channel?: string;
}

export interface WorkflowResult {
  message: DbPatientMessage;
  analysis: DbAgentAnalysis | null;
  draft: DbDraftResponse | null;
  task: DbTask | null;
}

// Placeholder agent analysis — replace with real Claude API calls later
function buildMockAnalysis(messageText: string) {
  const isHighRisk = /pain|hurt|bleed|vision|emergency|inject/i.test(messageText);
  const isBilling  = /cost|price|insurance|bill|pay/i.test(messageText);
  const isSchedule = /reschedule|appointment|cancel|move/i.test(messageText);

  const risk    = isHighRisk ? 'High' : isBilling || isSchedule ? 'Medium' : 'Low';
  const domain  = isHighRisk ? 'Clinical' : isBilling ? 'Billing' : isSchedule ? 'Scheduling' : 'General';
  const routeTo = isHighRisk ? 'Clinician' : isBilling ? 'Billing' : 'Front desk';

  return {
    intent:    { intent: domain + ' inquiry', domain, confidence: isHighRisk ? 92 : 78 },
    safety:    { risk, review: isHighRisk ? 'Required' : 'Recommended', routeTo },
    knowledge: { source: 'Clinic policy library', rule: isHighRisk ? 'Do not diagnose or reassure; escalate to clinical team' : 'Standard routing' },
    actions:   { steps: ['Classify message', 'Route to appropriate staff', 'Draft response'] },
    draft:     { text: isHighRisk
      ? "I'm sorry you're experiencing this. I'm flagging this for the clinical team immediately. If you have severe symptoms, please call (734) 555-0142 or seek urgent care."
      : "Thank you for reaching out. A staff member will follow up with you shortly."
    },
    validation:{ status: 'Approved for review queue', issue: 'None detected' },
    finalStatus: 'needs_review',
    riskLevel: risk.toLowerCase(),
    routeTo,
    category: domain,
  };
}

export async function runMessageWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  // 1. Save incoming message with status 'new'
  const message = await createMessage({
    clinic_id: input.clinicId,
    patient_name: input.patientName,
    message_text: input.messageText,
    channel: input.channel ?? 'simulator',
    category: null,
    risk_level: null,
    route_to: null,
    status: 'new',
  });

  if (!message) throw new Error('Failed to save patient message');

  // 2. Mark as 'analyzing'
  await progressMessageStatus(message.id, 'analyzing');

  // 3. Run agent analysis (mock — swap for real Claude API call later)
  const analysisData = buildMockAnalysis(input.messageText);

  const analysis = await saveAgentAnalysis({
    message_id: message.id,
    intent:    analysisData.intent    as Record<string, unknown>,
    safety:    analysisData.safety    as Record<string, unknown>,
    knowledge: analysisData.knowledge as Record<string, unknown>,
    actions:   analysisData.actions   as Record<string, unknown>,
    draft:     analysisData.draft     as Record<string, unknown>,
    validation:analysisData.validation as Record<string, unknown>,
    final_status: analysisData.finalStatus,
  });

  // 4. Update message with classification results
  await updateMessageStatus(message.id, 'needs_review', {
    category:   analysisData.category,
    risk_level: analysisData.riskLevel,
    route_to:   analysisData.routeTo,
  });

  // 5. Create draft response
  const draft = await createDraft({
    message_id:  message.id,
    analysis_id: analysis?.id ?? null,
    draft_text:  analysisData.draft.text,
    status:      'needs_review',
    edited_text: null,
    approved_by: null,
    approved_at: null,
  });

  // 6. Create task for staff
  const priority = analysisData.riskLevel === 'high' ? 'urgent' : analysisData.riskLevel === 'medium' ? 'medium' : 'low';
  const task = await createTaskFromMessage(
    input.clinicId,
    message.id,
    `Review ${analysisData.category} message from ${input.patientName}`,
    { assignedRole: analysisData.routeTo, priority }
  );

  return { message, analysis, draft, task };
}
