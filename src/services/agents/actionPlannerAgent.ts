// actionPlannerAgent.ts — server-side only. Never import from client components.
// Calls Claude to produce a structured action plan for a patient message.

import Anthropic from '@anthropic-ai/sdk';
import type { IntentResult } from './intentAgent';
import type { SafetyResult } from './safetyAgent';
import type { KnowledgeResult } from './knowledgeAgent';

export interface RecommendedAction {
  type: 'create_task' | 'draft_patient_reply' | 'route_to_staff' | 'escalate' | 'no_action';
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

Your job: given a patient message and the prior agent assessments (intent, safety, knowledge), create a concrete, minimal action plan for handling this message.

You must respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

The JSON must follow this exact shape:
{
  "workflow_status": "<needs_clinician_review | needs_billing_review | needs_front_desk_review | ready_for_staff_approval | resolved_by_ai_draft>",
  "recommended_actions": [
    {
      "type": "<create_task | draft_patient_reply | route_to_staff | escalate | no_action>",
      "title": "<short action title, max 10 words>",
      "description": "<what staff need to do, 1 sentence>",
      "assignee_role": "<clinician | billing | front_desk | general_staff>",
      "priority": "<urgent | high | medium | low>",
      "requires_approval": <true | false>,
      "reason": "<one sentence why this action is needed>"
    }
  ]
}

workflow_status rules:
- needs_clinician_review: any clinical symptom, post-procedure concern, medication question, or high-risk message
- needs_billing_review: billing disputes, cost questions, insurance issues
- needs_front_desk_review: scheduling requests, general inquiries
- ready_for_staff_approval: draft is ready but needs a human to approve before sending
- resolved_by_ai_draft: ONLY for pure scheduling/general inquiries with low risk and no human review required

recommended_actions rules:
- Always include exactly 1 create_task action as the first action.
- Optionally include 1 draft_patient_reply action to queue a draft for human approval.
- Maximum 2 actions total — keep the plan tight.
- NEVER use type "send_response", "send_message", or "notify_staff" — use draft_patient_reply or route_to_staff instead.
- For clinical-risk messages, the draft_patient_reply title must begin with "Draft" not "Send".
- priority must match the safety risk_level: high→urgent or high, medium→medium, low→low.
- If safety.needs_human_review is true, requires_approval must be true for all actions.
- Never set requires_approval=false for clinical content.
- assignee_role must match the safety route_to: clinician→clinician, billing→billing, front_desk→front_desk, general_staff→general_staff.`;

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

    // Normalize action types: collapse legacy/hallucinated send types
    const SEND_TYPE_ALIASES = new Set([
      'send_response', 'send_message', 'send_patient_response', 'notify_staff',
    ]);
    const isClinicalRisk = safety.needs_human_review || intent.domain === 'Clinical';

    parsed.recommended_actions = parsed.recommended_actions.map(a => {
      let type = a.type as string;
      let title = a.title;

      // Map send-type aliases → draft_patient_reply
      if (SEND_TYPE_ALIASES.has(type)) {
        type = 'draft_patient_reply';
      }

      // Rewrite "Send" titles → "Draft" for clinical-risk draft actions
      if (isClinicalRisk && type === 'draft_patient_reply' && /\bsend\b/i.test(title)) {
        title = title.replace(/\bSend\b/g, 'Draft').replace(/\bsend\b/g, 'draft');
        // Capitalise first letter
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }

      return {
        ...a,
        type: type as RecommendedAction['type'],
        title,
      };
    });

    // Safety guard: needs_human_review forces requires_approval=true on every action
    if (safety.needs_human_review) {
      parsed.recommended_actions = parsed.recommended_actions.map(a => ({
        ...a,
        requires_approval: true,
      }));
    }

    // Safety guard: draft_patient_reply on clinical-risk always requires approval
    if (isClinicalRisk) {
      parsed.recommended_actions = parsed.recommended_actions.map(a =>
        a.type === 'draft_patient_reply' ? { ...a, requires_approval: true } : a,
      );
    }

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
