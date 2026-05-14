// safetyAgent.ts — server-side only. Never import this from client components.
// Calls Claude to assess the safety risk of a patient message.

import Anthropic from '@anthropic-ai/sdk';
import { parseClaudeJson } from '@/lib/parseClaudeJson';
import type { IntentResult } from './intentAgent';

export interface SafetyResult {
  risk_level: 'high' | 'medium' | 'low';
  needs_human_review: boolean;
  route_to: string;
  allowed_response_type: string;
  safety_reason: string;
}

// Default to maximum safety on any failure — never auto-approve clinical content.
const SAFETY_FALLBACK: SafetyResult = {
  risk_level: 'high',
  needs_human_review: true,
  route_to: 'clinician',
  allowed_response_type: 'safety_escalation_only',
  safety_reason: 'Safety agent failed or timed out — defaulting to human review.',
};

const SAFETY_SYSTEM_PROMPT = `You are the Safety Agent for a medical clinic's AI triage system.
Your job: evaluate whether a patient message is safe for an AI to respond to, or whether it must be escalated to a human.

You must respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

The JSON must follow this exact shape:
{
  "risk_level": "<high | medium | low>",
  "needs_human_review": <true | false>,
  "route_to": "<clinician | billing | front_desk | general_staff>",
  "allowed_response_type": "<safety_escalation_only | informational_only | full_response>",
  "safety_reason": "<one sentence explaining the safety decision>"
}

Safety rules — ALWAYS set risk_level=high and needs_human_review=true if the message involves:
- Any symptom report (pain, bleeding, swelling, vision changes, dizziness, etc.)
- Post-procedure or post-injection concerns
- Medication questions or dosage
- Requests for medical advice or diagnosis
- Urgent or emergency language
- Mental health concerns

Set risk_level=medium and needs_human_review=true and route_to=clinician for:
- Patient-specific clinical instruction questions: any patient asking whether they should start, stop, continue, hold, skip, change, delay, or modify any medication, eye drop, treatment, procedure-prep step, or post-procedure behavior. This includes questions like "Should I stop my eye drops?", "Can I skip my medication today?", "Do I still need the drops after the injection?". These are NOT general FAQ questions — they require clinical judgment and must route to a clinician even if a general source exists.
- Billing disputes or insurance questions requiring case review
- Questions about specific clinical procedures (prep, recovery) without patient-specific instruction
- Prescription refill requests

Set risk_level=low and needs_human_review=false ONLY for:
- Pure scheduling requests (reschedule, cancel, availability)
- Clinic hours, location, contact info
- Non-clinical general inquiries

route_to values:
- clinician: clinical questions, symptoms, medications
- billing: cost, insurance, invoices
- front_desk: scheduling, general info
- general_staff: unclear or mixed`;

export async function runSafetyAgent(
  messageText: string,
  intent: IntentResult,
): Promise<SafetyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[safetyAgent] ANTHROPIC_API_KEY not set — returning fallback');
    return SAFETY_FALLBACK;
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: SAFETY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Patient message: "${messageText}"\n\nIntent classification: ${JSON.stringify(intent)}`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[safetyAgent] raw response:', raw);

    const parsed = parseClaudeJson<SafetyResult>(raw);

    // Enforce: clinical domain always requires human review
    if (intent.domain === 'Clinical' && !parsed.needs_human_review) {
      console.warn('[safetyAgent] clinical domain — forcing needs_human_review=true');
      parsed.needs_human_review = true;
      parsed.risk_level = parsed.risk_level === 'low' ? 'medium' : parsed.risk_level;
    }

    console.log('[safetyAgent] parsed result:', parsed);
    return parsed;
  } catch (err) {
    console.error('[safetyAgent] error — returning fallback:', err);
    return SAFETY_FALLBACK;
  }
}
