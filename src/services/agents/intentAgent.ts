// intentAgent.ts — server-side only. Never import this from client components.
// Calls Claude to classify the primary intent of a patient message.

import Anthropic from '@anthropic-ai/sdk';

export interface IntentResult {
  primary_intent: string;
  domain: string;
  confidence: number;
  summary: string;
}

const INTENT_SYSTEM_PROMPT = `You are the Intent Agent for a medical clinic's AI triage system.
Your job: classify the primary intent of an incoming patient message.

You must respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

The JSON must follow this exact shape:
{
  "primary_intent": "<snake_case label>",
  "domain": "<Clinical | Billing | Scheduling | General | Insurance>",
  "confidence": <0.0–1.0>,
  "summary": "<one sentence describing what the patient is asking>"
}

Domain guidance:
- Clinical: symptoms, medications, procedures, post-op concerns, pain, vision, bleeding
- Billing: cost questions, insurance, co-pays, invoices, payment
- Scheduling: appointments, rescheduling, cancellations, availability
- Insurance: insurance cards, coverage verification, prior auth, documents
- General: hours, location, directions, other non-clinical topics

Confidence: how certain you are of the classification (0.0–1.0).`;

const INTENT_FALLBACK: IntentResult = {
  primary_intent: 'general_inquiry',
  domain: 'General',
  confidence: 0.5,
  summary: 'Patient sent a message requiring staff review.',
};

export async function runIntentAgent(messageText: string): Promise<IntentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[intentAgent] ANTHROPIC_API_KEY not set — returning fallback');
    return INTENT_FALLBACK;
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: INTENT_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Patient message: "${messageText}"` },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[intentAgent] raw response:', raw);

    const parsed = JSON.parse(raw) as IntentResult;

    // Normalise confidence to 0–100 range if Claude returns 0–1
    if (parsed.confidence <= 1.0) {
      parsed.confidence = Math.round(parsed.confidence * 100);
    }

    console.log('[intentAgent] parsed result:', parsed);
    return parsed;
  } catch (err) {
    console.error('[intentAgent] error — returning fallback:', err);
    return INTENT_FALLBACK;
  }
}
