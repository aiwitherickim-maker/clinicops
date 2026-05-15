// staffFollowupDraftAgent.ts — server-side only. Never import from client components.
// Generates a staff-reviewable follow-up draft shown in the Staff Review Inbox.
// This is DISTINCT from the Controlled Response Agent, which generates the immediate
// patient-facing response. This agent generates the later staff-sendable follow-up.

import Anthropic from '@anthropic-ai/sdk';
import { SONNET } from './models';
import { parseClaudeJson } from '@/lib/parseClaudeJson';
import type { IntentResult } from './intentAgent';
import type { SafetyResult } from './safetyAgent';
import type { KnowledgeResult } from './knowledgeAgent';
import type { ActionPlannerResult } from './actionPlannerAgent';
import type { QAResult } from './qaAgent';

export type StaffDraftType =
  | 'billing_followup'
  | 'scheduling_followup'
  | 'clinical_followup'
  | 'insurance_followup'
  | 'general_followup';

export type StaffSenderRole = 'billing' | 'front_desk' | 'clinician' | 'office_manager';

export interface StaffFollowupDraftResult {
  draft_text: string;
  draft_type: StaffDraftType;
  intended_sender_role: StaffSenderRole;
  requires_human_approval: boolean;
  requires_clinician_approval: boolean;
  can_be_sent_by_assigned_staff: boolean;
  reason_summary: string;
  missing_information: string[];
  safety_notes: string;
}

export interface StaffFollowupDraftInput {
  messageText: string;
  patientName: string;
  clinicPhone?: string;
  // Rich context from orchestrator pipeline
  intent?: IntentResult;
  safety?: SafetyResult;
  knowledge?: KnowledgeResult;
  planner?: ActionPlannerResult;
  qaResult?: QAResult;
  // Simplified context for inbox regeneration (when full pipeline data isn't available)
  category?: string;
  riskLevel?: string;
  routeTo?: string;
  taskTitle?: string;
  taskAssignee?: string;
  reasonSummary?: string;
}

export const STAFF_DRAFT_FALLBACK: StaffFollowupDraftResult = {
  draft_text: 'Thank you for reaching out. A staff member will review your message and follow up shortly.',
  draft_type: 'general_followup',
  intended_sender_role: 'office_manager',
  requires_human_approval: true,
  requires_clinician_approval: false,
  can_be_sent_by_assigned_staff: true,
  reason_summary: 'Fallback staff follow-up draft used.',
  missing_information: [],
  safety_notes: 'Fallback used due to agent failure.',
};

const SYSTEM_PROMPT = `You are the Staff Follow-up Draft Agent for a medical clinic's AI messaging system.

Your job: generate a staff-reviewable follow-up draft that clinic staff can approve, edit, and send to the patient. This is NOT the immediate auto-sent patient response. This is the later, more complete message that staff will send to resolve the patient's question.

You must respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

The JSON must follow this exact shape:
{
  "draft_text": "<the staff-sendable follow-up draft>",
  "draft_type": "<billing_followup | scheduling_followup | clinical_followup | insurance_followup | general_followup>",
  "intended_sender_role": "<billing | front_desk | clinician | office_manager>",
  "requires_human_approval": true,
  "requires_clinician_approval": <true | false>,
  "can_be_sent_by_assigned_staff": <true | false>,
  "reason_summary": "<why this draft is appropriate, 1–2 sentences>",
  "missing_information": ["<item 1>", "<item 2>"],
  "safety_notes": "<one sentence about any safety consideration>"
}

─── DRAFT WRITING RULES ──────────────────────────────────────────────────────

General:
- Address the patient by their first name: "Hi [first name],"
- Be warm, professional, and concise (2–4 sentences).
- Always say what will happen next.
- Never write in first person as the AI — write as the assigned staff role.
- requires_human_approval is always true.

1. Billing / cost / insurance questions
   - Acknowledge the question and what the patient is asking about.
   - Say the billing team will verify benefits, deductible, prior authorization, and patient responsibility.
   - Do NOT give a specific cost or say insurance covers something unless verified data is explicitly provided as input.
   - Include the clinic phone if the visit is soon.
   - intended_sender_role: "billing"
   - draft_type: "billing_followup" or "insurance_followup"
   - requires_clinician_approval: false
   - missing_information should list "verified insurance benefits" and "patient responsibility estimate" if not available.

2. Scheduling questions
   - Acknowledge the requested change.
   - Do NOT claim the appointment was changed unless scheduling data is explicitly confirmed.
   - Say staff will check availability and follow up to confirm.
   - Ask the patient for preferred times if not already given.
   - intended_sender_role: "front_desk"
   - draft_type: "scheduling_followup"
   - requires_clinician_approval: false
   - missing_information should list "appointment availability" if no slot is confirmed.

3. Clinical symptom / post-procedure questions (high risk)
   - Acknowledge the concern.
   - Do NOT diagnose, reassure, or give treatment instructions.
   - Say the clinical team will follow up.
   - If symptoms are urgent (pain, bleeding, vision changes, post-injection), remind the patient to call the clinic or seek urgent/emergency care if severe or worsening.
   - Include the clinic phone number.
   - intended_sender_role: "clinician"
   - draft_type: "clinical_followup"
   - requires_clinician_approval: true
   - missing_information should list "clinician review and instruction".

4. Patient-specific clinical instruction questions (medium risk)
   - These are questions about whether to start/stop/continue/hold/skip/change/delay any medication, treatment, eye drop, or procedure-prep step.
   - Do NOT give any clinical instruction, even implicitly (no "yes", "no", "usually", or "typically").
   - Tell the patient not to change how they use their medication or treatment based on this chat.
   - Say the clinical team will provide guidance specific to their case.
   - intended_sender_role: "clinician"
   - draft_type: "clinical_followup"
   - requires_clinician_approval: true
   - missing_information should list "clinician instruction on [the specific medication/treatment]".

5. Approved-source general information
   - If a matching knowledge source is available and can_answer_directly=true, you may use it.
   - Do NOT add medical facts not present in the source.
   - intended_sender_role matches the question type (front_desk for general info, billing for costs).

─── OUTPUT RULES ─────────────────────────────────────────────────────────────

requires_human_approval: always true.
requires_clinician_approval: true for any clinical content, medication, or post-procedure concern.
can_be_sent_by_assigned_staff: true unless the content requires clinician sign-off.
missing_information: list items the staff would need to complete or verify before sending.
If nothing is missing, return an empty array [].`;

function buildUserContent(input: StaffFollowupDraftInput): string {
  const parts: string[] = [
    `Patient message: "${input.messageText}"`,
    `Patient name: ${input.patientName}`,
  ];

  if (input.intent)    parts.push(`Intent classification: ${JSON.stringify(input.intent)}`);
  if (input.safety)    parts.push(`Safety assessment: ${JSON.stringify(input.safety)}`);
  if (input.knowledge) parts.push(`Knowledge assessment: ${JSON.stringify(input.knowledge)}`);
  if (input.planner)   parts.push(`Action planner result: ${JSON.stringify(input.planner)}`);
  if (input.qaResult)  parts.push(`QA result: ${JSON.stringify(input.qaResult)}`);

  // Simplified context fields (from inbox regeneration)
  if (input.category)      parts.push(`Category: ${input.category}`);
  if (input.riskLevel)     parts.push(`Risk level: ${input.riskLevel}`);
  if (input.routeTo)       parts.push(`Assigned route: ${input.routeTo}`);
  if (input.taskTitle)     parts.push(`Task: ${input.taskTitle}`);
  if (input.taskAssignee)  parts.push(`Assigned to: ${input.taskAssignee}`);
  if (input.reasonSummary) parts.push(`Reason summary: ${input.reasonSummary}`);
  if (input.clinicPhone)   parts.push(`Clinic phone: ${input.clinicPhone}`);

  return parts.join('\n\n');
}

export async function runStaffFollowupDraftAgent(
  input: StaffFollowupDraftInput,
): Promise<StaffFollowupDraftResult> {
  console.log('[staffFollowupDraftAgent] ── START ──────────────────────────────────');
  console.log('[staffFollowupDraftAgent] patient:', input.patientName, '| message:', input.messageText.slice(0, 60));
  console.log('[staffFollowupDraftAgent] category:', input.category ?? input.intent?.domain, '| risk:', input.riskLevel ?? input.safety?.risk_level, '| routeTo:', input.routeTo ?? input.safety?.route_to);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[staffFollowupDraftAgent] FALLBACK REASON: ANTHROPIC_API_KEY not set');
    return { ...STAFF_DRAFT_FALLBACK, reason_summary: 'Fallback: no API key.' };
  }

  const client = new Anthropic({ apiKey });
  let raw = '';

  try {
    console.log('[staffFollowupDraftAgent] calling ' + SONNET + '...');

    const response = await client.messages.create({
      model: SONNET,
      max_tokens: 768,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserContent(input) }],
    });

    raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[staffFollowupDraftAgent] raw Claude response:', raw);

    let parsed: StaffFollowupDraftResult;
    try {
      parsed = parseClaudeJson<StaffFollowupDraftResult>(raw);
    } catch (parseErr) {
      console.error('[staffFollowupDraftAgent] FALLBACK REASON: JSON parse failed:', parseErr);
      console.error('[staffFollowupDraftAgent] raw text:', raw);
      return { ...STAFF_DRAFT_FALLBACK, safety_notes: 'Fallback: JSON parse error.' };
    }

    // Hard guards
    parsed.requires_human_approval = true;
    if (!parsed.missing_information) parsed.missing_information = [];
    if (!parsed.draft_text?.trim()) {
      console.error('[staffFollowupDraftAgent] FALLBACK REASON: empty draft_text');
      return { ...STAFF_DRAFT_FALLBACK, safety_notes: 'Fallback: empty draft returned.' };
    }

    console.log('[staffFollowupDraftAgent] parsed result:', JSON.stringify(parsed));
    return parsed;

  } catch (err) {
    console.error('[staffFollowupDraftAgent] FALLBACK REASON: Claude API error:', err);
    console.error('[staffFollowupDraftAgent] raw at time of error:', raw);
    return { ...STAFF_DRAFT_FALLBACK, safety_notes: 'Fallback: Claude API error.' };
  }
}
