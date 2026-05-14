// actionPlannerAgent.ts — server-side only. Never import from client components.
// Calls Claude to produce a structured action plan for a patient message.

import Anthropic from '@anthropic-ai/sdk';
import type { IntentResult } from './intentAgent';
import type { SafetyResult } from './safetyAgent';
import type { KnowledgeResult } from './knowledgeAgent';

export interface RecommendedAction {
  type: 'create_task' | 'draft_patient_reply' | 'send_safe_acknowledgment' | 'send_preapproved_safety_response' | 'route_to_staff' | 'escalate' | 'no_action';
  title: string;
  description: string;
  assignee_role: 'clinician' | 'billing' | 'front_desk' | 'general_staff';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  requires_approval: boolean;
  reason: string;
}

export interface ActionPlannerResult {
  workflow_status:
    | 'needs_clinician_review'
    | 'needs_billing_review'
    | 'needs_front_desk_review'
    | 'ready_for_staff_approval'
    | 'resolved_by_ai_draft';
  recommended_actions: RecommendedAction[];
}

const FALLBACK: ActionPlannerResult = {
  workflow_status: 'needs_clinician_review',
  recommended_actions: [
    {
      type: 'create_task',
      title: 'Urgent clinician review required',
      description: 'Action planner failed — defaulting to clinician escalation for safety.',
      assignee_role: 'clinician',
      priority: 'urgent',
      requires_approval: true,
      reason: 'Fallback: planner could not evaluate message safely.',
    },
  ],
};

const SYSTEM_PROMPT = `You are the Action Planner Agent for a medical clinic's AI triage system.

Product principle: ClinicOps provides an immediate safe response to every patient message. Humans approve sensitive content — not every response.

You must respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

The JSON must follow this exact shape:
{
  "workflow_status": "<needs_clinician_review | needs_billing_review | needs_front_desk_review | ready_for_staff_approval | resolved_by_ai_draft>",
  "recommended_actions": [
    {
      "type": "<create_task | send_safe_acknowledgment | send_preapproved_safety_response | draft_patient_reply | route_to_staff | escalate | no_action>",
      "title": "<short action title, max 10 words>",
      "description": "<what happens, 1 sentence>",
      "assignee_role": "<clinician | billing | front_desk | general_staff>",
      "priority": "<urgent | high | medium | low>",
      "requires_approval": <true | false>,
      "reason": "<one sentence why>"
    }
  ]
}

Action type rules — choose exactly the right type:
- create_task: always include exactly one as the first action, for staff follow-up
- send_safe_acknowledgment: use for scheduling, billing acknowledgment, general inquiries, document receipt — auto-sent, no approval needed, requires_approval=false
- send_preapproved_safety_response: use for clinical-risk or emergency messages — sends a pre-approved safety template, auto-sent, requires_approval=false
- draft_patient_reply: use ONLY when the response content is uncertain and a human must review the specific text before sending — requires_approval=true
- NEVER use: send_response, send_message, notify_staff

Response type by risk level:
- Low-risk (scheduling, general, billing acknowledgment): create_task + send_safe_acknowledgment, requires_approval=false
- Medium-risk (billing dispute, procedure prep): create_task + send_safe_acknowledgment, requires_approval=false
- Patient-specific clinical instruction question (intent = clinical_instruction_question): create_task assigned to clinician (priority medium or high) + send_safe_acknowledgment. The safe acknowledgment tells the patient their question has been received and the clinical team will follow up. Do NOT use send_preapproved_safety_response unless the message also contains active/urgent symptoms. Do NOT use draft_patient_reply.
- High-risk (symptoms, post-procedure, pain, bleeding): create_task + send_preapproved_safety_response, requires_approval=false
- Emergency (severe symptoms, vision loss, urgent): create_task + send_preapproved_safety_response with priority=urgent, requires_approval=false

Titles:
- send_safe_acknowledgment: "Send safe acknowledgment to patient" or similar, never starts with "Draft"
- send_preapproved_safety_response: "Send pre-approved safety escalation response" — never diagnose, reassure, or recommend treatment
- create_task: describe the staff action needed, e.g. "Escalate to clinician immediately" or "Front desk: check appointment availability"

workflow_status rules:
- needs_clinician_review: clinical symptoms, post-procedure, medications, high-risk
- needs_billing_review: billing disputes, insurance, cost questions
- needs_front_desk_review: scheduling, general inquiries
- ready_for_staff_approval: draft needs human review before sending
- resolved_by_ai_draft: ONLY for pure low-risk with no follow-up needed

Other rules:
- Maximum 2 actions total.
- priority must match risk: high→urgent, medium→medium, low→low.
- assignee_role must match safety route_to: clinician→clinician, billing→billing, front_desk→front_desk.`;

export async function runActionPlannerAgent(
  messageText: string,
  intent: IntentResult,
  safety: SafetyResult,
  knowledge: KnowledgeResult,
): Promise<ActionPlannerResult> {
  console.log('[actionPlannerAgent] ── START ──────────────────────────────────');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[actionPlannerAgent] FALLBACK REASON: ANTHROPIC_API_KEY not set');
    return FALLBACK;
  }

  const client = new Anthropic({ apiKey });
  let raw = '';

  try {
    console.log('[actionPlannerAgent] calling claude-sonnet-4-6...');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            `Patient message: "${messageText}"`,
            `Intent: ${JSON.stringify(intent)}`,
            `Safety assessment: ${JSON.stringify(safety)}`,
            `Knowledge assessment: ${JSON.stringify(knowledge)}`,
          ].join('\n\n'),
        },
      ],
    });

    raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[actionPlannerAgent] raw Claude response:', raw);

    let parsed: ActionPlannerResult;
    try {
      parsed = JSON.parse(raw) as ActionPlannerResult;
    } catch (parseErr) {
      console.error('[actionPlannerAgent] FALLBACK REASON: JSON parse failed:', parseErr);
      console.error('[actionPlannerAgent] raw text:', raw);
      return FALLBACK;
    }

    const isClinicalRisk = intent.domain === 'Clinical' || safety.risk_level === 'high';

    parsed.recommended_actions = parsed.recommended_actions.map(a => {
      let type = a.type as string;

      // Normalize legacy/hallucinated send types to the correct canonical type
      if (type === 'send_response' || type === 'send_message' || type === 'send_patient_response') {
        type = isClinicalRisk ? 'send_preapproved_safety_response' : 'send_safe_acknowledgment';
      }
      if (type === 'notify_staff') {
        type = 'route_to_staff';
      }

      const normalized = type as RecommendedAction['type'];

      // Enforce requires_approval rules regardless of what Claude returned
      let requires_approval = a.requires_approval;
      if (normalized === 'send_safe_acknowledgment' || normalized === 'send_preapproved_safety_response') {
        requires_approval = false; // pre-approved templates — no per-message human approval
      }
      if (normalized === 'draft_patient_reply') {
        requires_approval = true; // human must always review custom drafts
      }

      return { ...a, type: normalized, requires_approval };
    });

    // Ensure at least one action exists
    if (!parsed.recommended_actions?.length) {
      console.warn('[actionPlannerAgent] no actions returned — using fallback actions');
      parsed.recommended_actions = FALLBACK.recommended_actions;
    }

    console.log('[actionPlannerAgent] final result:', JSON.stringify(parsed));
    return parsed;

  } catch (err) {
    console.error('[actionPlannerAgent] FALLBACK REASON: Claude API error:', err);
    console.error('[actionPlannerAgent] raw at time of error:', raw);
    return FALLBACK;
  }
}
