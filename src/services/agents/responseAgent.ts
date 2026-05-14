// responseAgent.ts — server-side only. Never import from client components.
// Generates patient-facing response text within the safety boundaries
// already decided by the Action Planner. It does NOT decide what is allowed —
// it only generates wording for the assigned response mode.

import Anthropic from '@anthropic-ai/sdk';
import type { IntentResult } from './intentAgent';
import type { SafetyResult } from './safetyAgent';
import type { KnowledgeResult } from './knowledgeAgent';
import type { ActionPlannerResult } from './actionPlannerAgent';

export type ResponseMode =
  | 'send_safe_acknowledgment'
  | 'send_preapproved_safety_response'
  | 'approved_source_answer'
  | 'draft_patient_reply';

export interface ResponseAgentResult {
  response_text: string;
  response_mode: ResponseMode;
  requires_approval: boolean;
  badge_text: string;
  source_title: string | null;
  safety_notes: string;
}

export interface ClinicConfig {
  assistantName: string;
  tone: string;
  phone: string;
}

const FALLBACK: ResponseAgentResult = {
  response_text:
    "Thanks for reaching out. I'm routing your message to the clinic team so they can follow up.",
  response_mode: 'draft_patient_reply',
  requires_approval: true,
  badge_text: 'Draft only · staff review required',
  source_title: null,
  safety_notes: 'Response Agent fallback used.',
};

function buildSystemPrompt(responseMode: ResponseMode, clinic: ClinicConfig): string {
  const modeRules: Record<ResponseMode, string> = {
    send_safe_acknowledgment: `
## Your mode: send_safe_acknowledgment
Use for: scheduling, document receipt, billing acknowledgment, general front-desk questions, and patient-specific clinical instruction questions.
ALLOWED:
- Acknowledge the patient warmly
- Say the relevant staff team will check and follow up shortly
- Ask for missing non-clinical info if needed (e.g. preferred appointment time)
- For patient-specific clinical instruction questions (e.g. "Should I stop my eye drops?", "Can I skip my medication today?"): acknowledge the question, say the clinical team will follow up directly, tell the patient not to change their treatment based on this chat, and include the clinic phone number if it may be time-sensitive.
NOT ALLOWED:
- Claim the appointment was changed or confirmed
- Claim insurance or cost was verified
- Give any clinical instruction, confirmation, or guidance about whether to start/stop/change any medication or treatment
- Answer a clinical instruction question with a "yes" or "no" — always route to clinician
requires_approval: false
badge_text must be: "Safe acknowledgment sent · [relevant team] follow-up created"`,

    send_preapproved_safety_response: `
## Your mode: send_preapproved_safety_response
Use for: clinical-risk messages (symptoms, pain, bleeding, post-procedure concerns, medications).
Length: 3 sentences maximum.
ALLOWED:
- Acknowledge the concern briefly
- Say the clinical team is being alerted now
- Direct patient to call the clinic (include phone) or seek urgent/emergency care if symptoms are severe or worsening
NOT ALLOWED:
- Diagnose or name conditions
- Reassure about the symptom ("that's probably normal", "sounds okay")
- Recommend treatment or medication changes
- Tell the patient to wait
Example: "Thank you for reaching out. Please do not wait on these symptoms — our clinical team is being alerted now. Call us at ${clinic.phone} right away, or seek urgent or emergency care if symptoms are severe or worsening."
requires_approval: false
badge_text must be one of:
  - "Urgent safety response sent · clinician alerted" (if high risk)
  - "Pre-approved safety response sent · clinician follow-up required"`,

    approved_source_answer: `
## Your mode: approved_source_answer
Use for: informational questions where the Knowledge Agent matched an approved source and can_answer_directly=true.
Length: 2–3 sentences. Answer only what was asked.
ALLOWED:
- Answer concisely using ONLY the matched approved source content provided
NOT ALLOWED:
- Add medical facts not present in the approved source
- Give patient-specific billing or coverage decisions as final facts
requires_approval: false
badge_text must be: "Answered from approved clinic source"
source_title must be the matched source title from the Knowledge result`,

    draft_patient_reply: `
## Your mode: draft_patient_reply
Use for: messages where a human must review and approve the text before sending.
ALLOWED:
- Write a clear, concise, clinic-appropriate draft
NOT ALLOWED:
- Imply the message has been sent automatically
requires_approval: true
badge_text must be: "Draft only · staff review required"`,
  };

  return `You are the Controlled Response Agent for ${clinic.assistantName}, a medical clinic's AI patient messaging assistant.

You generate patient-facing response text for a specific response mode. The mode and safety boundaries have already been decided by prior agents. Your only job is to write the response wording within those boundaries.

Tone: ${clinic.tone}
Assistant name: ${clinic.assistantName}
Clinic phone: ${clinic.phone}

You must respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

The JSON must follow this exact shape:
{
  "response_text": "...",
  "response_mode": "${responseMode}",
  "requires_approval": <true | false>,
  "badge_text": "...",
  "source_title": "<approved source title or null>",
  "safety_notes": "<one sentence about any safety consideration>"
}

General writing rules:
- Default length: 2–4 sentences. Never longer unless the mode requires it.
- Do not repeat the patient's question back to them.
- Do not over-explain internal workflow or list every possible factor.
- Be action-oriented: tell the patient what will happen next.
- Do not start with "I" — start with "Thanks", "Our", "Your", or the assistant name.
- Use a warm, professional tone.
- Never give medical advice, diagnosis, or treatment guidance in any mode.

Billing/cost questions specifically:
- You may mention: final cost depends on insurance plan, benefits, deductible, and any prior authorization required.
- Say the billing team will verify and follow up with an accurate estimate.
- Optionally include the clinic phone for urgent questions.
- Do NOT: give a specific cost, say insurance covers it, or explain every possible billing factor.
- Keep to 3–4 sentences maximum.
- Example: "Thanks for reaching out. The final cost and coverage depend on your insurance plan, benefits, deductible, and any required prior authorization. Our billing team will review your information and follow up with an accurate estimate. You can also call us at ${clinic.phone} if you need help sooner."

Scheduling questions specifically:
- 1–3 sentences only.
- Say the front desk will check and confirm.
- Example: "Thanks for reaching out. Our front desk will check Wednesday afternoon availability and follow up to confirm the appointment change."

${modeRules[responseMode]}`;
}

export async function runResponseAgent(
  messageText: string,
  intent: IntentResult,
  safety: SafetyResult,
  knowledge: KnowledgeResult,
  planner: ActionPlannerResult,
  responseMode: ResponseMode,
  clinic: ClinicConfig,
): Promise<ResponseAgentResult> {
  console.log('[responseAgent] ── START ──────────────────────────────────');
  console.log('[responseAgent] mode:', responseMode);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[responseAgent] FALLBACK REASON: ANTHROPIC_API_KEY not set');
    return FALLBACK;
  }

  const client = new Anthropic({ apiKey });
  let raw = '';

  try {
    console.log('[responseAgent] calling claude-sonnet-4-6...');

    const userContent = [
      `Patient message: "${messageText}"`,
      `Intent: ${JSON.stringify(intent)}`,
      `Safety assessment: ${JSON.stringify(safety)}`,
      `Knowledge assessment: ${JSON.stringify(knowledge)}`,
      `Action planner result: ${JSON.stringify(planner)}`,
    ].join('\n\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: buildSystemPrompt(responseMode, clinic),
      messages: [{ role: 'user', content: userContent }],
    });

    raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[responseAgent] raw Claude response:', raw);

    let parsed: ResponseAgentResult;
    try {
      parsed = JSON.parse(raw) as ResponseAgentResult;
    } catch (parseErr) {
      console.error('[responseAgent] FALLBACK REASON: JSON parse failed:', parseErr);
      console.error('[responseAgent] raw text:', raw);
      return { ...FALLBACK, safety_notes: 'Response Agent fallback used: JSON parse error.' };
    }

    // Safety guard: enforce requires_approval rules regardless of what Claude returned
    if (responseMode === 'draft_patient_reply') {
      parsed.requires_approval = true;
    }
    if (
      responseMode === 'send_safe_acknowledgment' ||
      responseMode === 'send_preapproved_safety_response' ||
      responseMode === 'approved_source_answer'
    ) {
      parsed.requires_approval = false;
    }

    // Safety guard: never allow medical reassurance in safety mode
    if (responseMode === 'send_preapproved_safety_response') {
      parsed.response_mode = 'send_preapproved_safety_response';
    }

    console.log('[responseAgent] final result:', JSON.stringify(parsed));
    return parsed;

  } catch (err) {
    console.error('[responseAgent] FALLBACK REASON: Claude API error:', err);
    console.error('[responseAgent] raw at time of error:', raw);
    return { ...FALLBACK, safety_notes: 'Response Agent fallback used: Claude API error.' };
  }
}
