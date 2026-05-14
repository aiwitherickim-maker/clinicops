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
  console.log('[intentAgent] ── START ──────────────────────────────────');
  console.log('[intentAgent] input message:', messageText);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[intentAgent] FALLBACK REASON: ANTHROPIC_API_KEY is not set in .env.local');
    return { ...INTENT_FALLBACK, summary: '[FALLBACK: no API key]' };
  }
  console.log('[intentAgent] API key present, length:', apiKey.length);

  const client = new Anthropic({ apiKey });
  let raw = '';

  try {
    console.log('[intentAgent] calling claude-sonnet-4-6...');
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: INTENT_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Patient message: "${messageText}"` },
      ],
    });

    raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[intentAgent] raw Claude response:', raw);

    let parsed: IntentResult;
    try {
      parsed = JSON.parse(raw) as IntentResult;
    } catch (parseErr) {
      console.error('[intentAgent] FALLBACK REASON: JSON parse failed');
      console.error('[intentAgent] parse error:', parseErr);
      console.error('[intentAgent] raw text that failed to parse:', raw);
      return { ...INTENT_FALLBACK, summary: '[FALLBACK: JSON parse error]' };
    }

    // Normalise confidence to 0–100 if Claude returns 0–1
    if (parsed.confidence > 0 && parsed.confidence <= 1.0) {
      parsed.confidence = Math.round(parsed.confidence * 100);
    }

    console.log('[intentAgent] final parsed result:', JSON.stringify(parsed));
    return parsed;

  } catch (err) {
    console.error('[intentAgent] FALLBACK REASON: Claude API call threw an error');
    console.error('[intentAgent] error:', err);
    console.error('[intentAgent] raw at time of error:', raw);
    return { ...INTENT_FALLBACK, summary: '[FALLBACK: Claude API error]' };
  }
}
