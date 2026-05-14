// qaAgent.ts — server-side only. Never import from client components.
// Final validation step: reviews the full workflow output and determines
// whether the generated response is safe and consistent with the intended
// response mode. Does NOT generate creative responses — only validates,
// approves, or provides a conservative fallback.

import Anthropic from '@anthropic-ai/sdk';
import type { IntentResult } from './intentAgent';
import type { SafetyResult } from './safetyAgent';
import type { KnowledgeResult } from './knowledgeAgent';
import type { ActionPlannerResult } from './actionPlannerAgent';
import type { ResponseAgentResult, ResponseMode } from './responseAgent';

export interface QAIssue {
  type:
    | 'medical_advice'
    | 'unsupported_claim'
    | 'wrong_response_mode'
    | 'missing_escalation'
    | 'too_long'
    | 'tone_issue'
    | 'source_grounding_issue'
    | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface QAResult {
  qa_status: 'approved' | 'fallback_approved' | 'needs_revision' | 'blocked';
  can_display_to_patient: boolean;
  can_auto_send: boolean;
  requires_human_review: boolean;
  risk_level: 'low' | 'medium' | 'high' | 'emergency';
  issues: QAIssue[];
  approved_response_text: string | null;
  safe_fallback_response: string;
  badge_text: string;
  reason_summary: string;
}

const GENERIC_FALLBACK: QAResult = {
  qa_status: 'blocked',
  can_display_to_patient: true,
  can_auto_send: false,
  requires_human_review: true,
  risk_level: 'high',
  issues: [{ type: 'other', severity: 'high', description: 'QA validation failed; routing to human review.' }],
  approved_response_text: null,
  safe_fallback_response: "Thanks for reaching out. I'm routing your message to the clinic team so they can follow up.",
  badge_text: 'Needs staff review',
  reason_summary: 'QA validation failed, so the response was routed to human review.',
};

const CLINICAL_FALLBACK: QAResult = {
  qa_status: 'fallback_approved',
  can_display_to_patient: true,
  can_auto_send: true,
  requires_human_review: true,
  risk_level: 'high',
  issues: [{ type: 'other', severity: 'high', description: 'QA validation failed; pre-approved safety escalation used.' }],
  approved_response_text:
    "I'm sorry to hear you're experiencing this. Please do not wait — our clinical team is being alerted now. If your symptoms are severe or worsening, please call us at (734) 555-0142 or seek urgent care immediately.",
  safe_fallback_response:
    "I'm sorry to hear you're experiencing this. Please do not wait — our clinical team is being alerted now. If your symptoms are severe or worsening, please call us at (734) 555-0142 or seek urgent care immediately.",
  badge_text: 'Urgent safety response sent · clinician alerted',
  reason_summary: 'QA validation failed; pre-approved safety escalation sent and case routed to clinician review.',
};

const SYSTEM_PROMPT = `You are the QA Agent for a medical clinic's AI patient messaging system.

You are the final safety check before a patient-facing response is displayed or sent. You review the full workflow output and determine whether the generated response is safe, appropriate, and consistent with the intended response mode.

You do NOT rewrite or improve the response creatively. You only:
- Approve it as-is (approved_response_text = the original response_text)
- Flag issues and send a conservative fallback (approved_response_text = null)
- Block it entirely and send a conservative fallback

You must respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

The JSON must follow this exact shape:
{
  "qa_status": "<approved | fallback_approved | needs_revision | blocked>",
  "can_display_to_patient": <true | false>,
  "can_auto_send": <true | false>,
  "requires_human_review": <true | false>,
  "risk_level": "<low | medium | high | emergency>",
  "issues": [
    {
      "type": "<medical_advice | unsupported_claim | wrong_response_mode | missing_escalation | too_long | tone_issue | source_grounding_issue | other>",
      "severity": "<low | medium | high>",
      "description": "<short explanation>"
    }
  ],
  "approved_response_text": "<original response_text verbatim if approved, otherwise null>",
  "safe_fallback_response": "<conservative fallback text, always populated>",
  "badge_text": "<final UI badge text>",
  "reason_summary": "<1–2 sentence staff-facing explanation of the QA decision>"
}

─── VALIDATION RULES ────────────────────────────────────────────────────────

1. Clinical-risk messages (symptoms, pain, bleeding, vision changes, medications, post-procedure)
BLOCK if the response:
- Diagnoses or names a specific condition
- Reassures about a symptom ("that's normal", "sounds okay", "probably fine")
- Says or implies the patient should wait
- Gives treatment or medication advice
REQUIRE human review if:
- The response includes any personalized clinical guidance
REQUIRE escalation language if:
- risk_level = high or emergency and there is no direction to call the clinic or seek urgent care
Auto-send is ONLY allowed if response_mode = send_preapproved_safety_response and the response uses safe escalation language only.

2. Scheduling messages
- May acknowledge the request and say front desk will follow up.
- Must NOT claim the appointment was changed unless scheduling data confirmed it.
- Auto-send allowed for safe acknowledgment only.

3. Billing / cost / insurance messages
- May give general billing information.
- May say billing team will verify and follow up.
- Must NOT give a final cost or say insurance covers something unless verified.
- Auto-send allowed for safe acknowledgment or approved-source general information.

4. Approved-source answers (response_mode = approved_source_answer)
- Answer must be grounded in the matched clinic knowledge source content.
- Must NOT add unsupported medical or billing facts.
- Flag source_grounding_issue if the response adds facts not present in the source.

5. Response length
- Default: 2–4 sentences. Flag too_long (severity: low) if noticeably longer.
- Do NOT block solely for length unless it is confusing or unsafe.

6. Response mode consistency
- send_safe_acknowledgment: must be low-risk acknowledgment only, no clinical/billing specifics
- send_preapproved_safety_response: must include escalation to clinical team, no diagnosis/reassurance
- approved_source_answer: must be grounded in the provided knowledge source
- draft_patient_reply: can_auto_send must be false, requires_human_review must be true

If response_mode is auto-send but the content includes risky personalized advice → block.

─── OUTPUT RULES ─────────────────────────────────────────────────────────────

approved:
- qa_status = "approved"
- approved_response_text = the original response_text verbatim (do not modify it)
- can_display_to_patient = true
- can_auto_send = true only if response_mode is send_safe_acknowledgment, send_preapproved_safety_response, or approved_source_answer
- issues = [] or low-severity only

fallback_approved (clinical-risk only):
- Use when: the original response failed validation BUT the message is clinical-risk (high/emergency) AND the safe_fallback_response contains proper urgent escalation language ("do not wait", "call", "urgent care").
- qa_status = "fallback_approved"
- approved_response_text = the safe_fallback_response text (the fallback IS the approved text)
- can_display_to_patient = true
- can_auto_send = true (the pre-approved safety template is safe to send)
- requires_human_review = true (staff must still follow up)
- badge_text = "Urgent safety response sent · clinician alerted"
- Keep the original issues for audit purposes
- reason_summary should explain that the generated response failed validation so the pre-approved safety fallback was used

needs_revision:
- qa_status = "needs_revision"
- approved_response_text = null
- Use safe_fallback_response instead
- can_auto_send = false
- requires_human_review = true

blocked:
- Use only when both the original response AND any available fallback are unsafe to display.
- qa_status = "blocked"
- approved_response_text = null
- can_auto_send = false
- requires_human_review = true

safe_fallback_response: always populate. For clinical-risk messages, use urgent escalation language ("please do not wait", "call us", "seek urgent care").
badge_text: short UI label — e.g. "Approved · auto-sent", "QA approved · staff review required", "Urgent safety response sent · clinician alerted", "Needs staff review".`;

export async function runQAAgent(
  messageText: string,
  intent: IntentResult,
  safety: SafetyResult,
  knowledge: KnowledgeResult,
  planner: ActionPlannerResult,
  responseResult: ResponseAgentResult,
  responseMode: ResponseMode,
): Promise<QAResult> {
  console.log('[qaAgent] ── START ──────────────────────────────────');
  console.log('[qaAgent] validating response_mode:', responseMode, '| qa_status expected for risk:', safety.risk_level);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[qaAgent] FALLBACK REASON: ANTHROPIC_API_KEY not set');
    return GENERIC_FALLBACK;
  }

  const client = new Anthropic({ apiKey });
  let raw = '';

  try {
    console.log('[qaAgent] calling claude-sonnet-4-6...');

    const userContent = [
      `Patient message: "${messageText}"`,
      `Intent: ${JSON.stringify(intent)}`,
      `Safety assessment: ${JSON.stringify(safety)}`,
      `Knowledge assessment: ${JSON.stringify(knowledge)}`,
      `Action planner result: ${JSON.stringify(planner)}`,
      `Response mode: ${responseMode}`,
      `Response agent output: ${JSON.stringify(responseResult)}`,
      `Auto-send intended: ${!responseResult.requires_approval}`,
      `Risk level: ${safety.risk_level}`,
    ].join('\n\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 768,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[qaAgent] raw Claude response:', raw);

    const isClinicalRisk = safety.risk_level === 'high' || safety.risk_level === 'medium' && intent.domain === 'Clinical';

    let parsed: QAResult;
    try {
      parsed = JSON.parse(raw) as QAResult;
    } catch (parseErr) {
      console.error('[qaAgent] FALLBACK REASON: JSON parse failed:', parseErr);
      console.error('[qaAgent] raw text:', raw);
      const fallback = isClinicalRisk ? CLINICAL_FALLBACK : GENERIC_FALLBACK;
      return { ...fallback, reason_summary: 'QA fallback used: JSON parse error.' };
    }

    // Hard safety guards — enforce regardless of what Claude returned

    // 1. approved: restore response text if Claude forgot to echo it
    if (parsed.qa_status === 'approved' && !parsed.approved_response_text) {
      parsed.approved_response_text = responseResult.response_text;
    }

    // 2. fallback_approved: set approved_response_text to safe_fallback_response
    if (parsed.qa_status === 'fallback_approved') {
      parsed.approved_response_text = parsed.safe_fallback_response || CLINICAL_FALLBACK.safe_fallback_response;
      parsed.can_display_to_patient = true;
      parsed.requires_human_review = true;
    }

    // 3. blocked/needs_revision on clinical-risk: upgrade to fallback_approved
    //    so patients always receive the pre-approved safety escalation
    if ((parsed.qa_status === 'blocked' || parsed.qa_status === 'needs_revision') && isClinicalRisk) {
      const fallbackText = parsed.safe_fallback_response || CLINICAL_FALLBACK.safe_fallback_response;
      const hasSafeEscalation = /\b(call|urgent|emergency|do not wait|clinical team|immediately)\b/i.test(fallbackText);
      if (hasSafeEscalation) {
        console.log('[qaAgent] clinical-risk blocked/needs_revision → upgrading to fallback_approved');
        parsed.qa_status       = 'fallback_approved';
        parsed.approved_response_text = fallbackText;
        parsed.can_display_to_patient = true;
        parsed.can_auto_send   = true;
        parsed.requires_human_review = true;
        parsed.badge_text      = 'Urgent safety response sent · clinician alerted';
        if (!parsed.reason_summary.includes('fallback')) {
          parsed.reason_summary = 'The generated response failed QA validation. The pre-approved safety escalation response was sent and the case was routed to clinician review.';
        }
      }
    }

    // 4. blocked/needs_revision on non-clinical: ensure no auto-send
    if (parsed.qa_status === 'blocked' || parsed.qa_status === 'needs_revision') {
      parsed.approved_response_text = null;
      parsed.can_auto_send          = false;
      parsed.requires_human_review  = true;
    }

    // 5. draft_patient_reply can never auto-send
    if (responseMode === 'draft_patient_reply') {
      parsed.can_auto_send         = false;
      parsed.requires_human_review = true;
    }

    // 6. Ensure safe_fallback_response is always populated
    if (!parsed.safe_fallback_response) {
      parsed.safe_fallback_response = isClinicalRisk
        ? CLINICAL_FALLBACK.safe_fallback_response
        : GENERIC_FALLBACK.safe_fallback_response;
    }

    console.log('[qaAgent] parsed result:', JSON.stringify(parsed));
    console.log('[qaAgent] qa_status:', parsed.qa_status, '| can_auto_send:', parsed.can_auto_send, '| issues:', parsed.issues.length);
    return parsed;

  } catch (err) {
    console.error('[qaAgent] FALLBACK REASON: Claude API error:', err);
    console.error('[qaAgent] raw at time of error:', raw);
    const isClinicalRisk = safety.risk_level === 'high' || intent.domain === 'Clinical';
    const fallback = isClinicalRisk ? CLINICAL_FALLBACK : GENERIC_FALLBACK;
    return { ...fallback, reason_summary: 'QA fallback used: Claude API error.' };
  }
}
