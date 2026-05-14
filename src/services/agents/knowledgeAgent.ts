// knowledgeAgent.ts — server-side only. Never import this from client components.
// Fetches active clinic knowledge sources from Supabase and asks Claude to
// select the most relevant one for the incoming patient message.

import Anthropic from '@anthropic-ai/sdk';
import { getKnowledgeSources } from '@/services/db/knowledgeService';
import type { IntentResult } from './intentAgent';
import type { SafetyResult } from './safetyAgent';

export interface KnowledgeResult {
  matched_source_id:       string | null;
  matched_source_title:    string | null;
  matched_source_category: string | null;
  relevance:               'high' | 'medium' | 'low' | 'none';
  allowed_content_summary: string;
  restricted_content:      string;
  can_answer_directly:     boolean;
  requires_human_review:   boolean;
}

const KNOWLEDGE_FALLBACK: KnowledgeResult = {
  matched_source_id:       null,
  matched_source_title:    null,
  matched_source_category: null,
  relevance:               'none',
  allowed_content_summary: 'No approved clinic knowledge source could be confirmed.',
  restricted_content:      'Do not provide patient-facing medical guidance. Route to human review.',
  can_answer_directly:     false,
  requires_human_review:   true,
};

function buildSystemPrompt(sourcesBlock: string): string {
  return `You are the Knowledge Agent for a medical clinic's AI triage system.

Your job: given a patient message, an intent classification, and a safety assessment, select the single most relevant approved knowledge source from the clinic's library. Then determine what the assistant is and is not allowed to say based on that source.

You must respond with ONLY a valid JSON object.
Do not include markdown. Do not include explanation. Do not include extra text.

The JSON must follow this exact shape:
{
  "matched_source_id": "<id string from sources, or null if none match>",
  "matched_source_title": "<title of matched source, or null>",
  "matched_source_category": "<category of matched source, or null>",
  "relevance": "<high | medium | low | none>",
  "allowed_content_summary": "<what the assistant is allowed to say based on the source>",
  "restricted_content": "<what the assistant must NOT say or do>",
  "can_answer_directly": <true | false>,
  "requires_human_review": <true | false>
}

Rules:
- Only use the provided clinic knowledge sources. Do not invent policy.
- If no source is relevant, return relevance "none" and requires_human_review true.
- For clinical symptoms, post-procedure concerns, pain, bleeding, vision changes, or any urgent symptom: requires_human_review must be true and can_answer_directly must be false.
- Never authorize the assistant to give medical advice, diagnosis, or reassurance about symptoms.
- If the source says to escalate, your output must reflect that restriction.

Available clinic knowledge sources:
${sourcesBlock}`;
}

export async function runKnowledgeAgent(
  messageText: string,
  intent:     IntentResult,
  safety:     SafetyResult,
  clinicId:   string,
): Promise<KnowledgeResult> {
  console.log('[knowledgeAgent] ── START ──────────────────────────────────');

  // 1. Load knowledge sources from Supabase
  const sources = await getKnowledgeSources(clinicId);
  console.log(`[knowledgeAgent] loaded ${sources.length} knowledge source(s):`,
    sources.map(s => `[${s.id}] ${s.title}`));

  if (!sources.length) {
    console.warn('[knowledgeAgent] FALLBACK REASON: no knowledge sources available');
    return KNOWLEDGE_FALLBACK;
  }

  // 2. Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[knowledgeAgent] FALLBACK REASON: ANTHROPIC_API_KEY not set');
    return KNOWLEDGE_FALLBACK;
  }

  // 3. Format sources for the prompt
  const sourcesBlock = sources
    .map((s, i) =>
      `[${i + 1}] ID: ${s.id}\nTitle: ${s.title}\nCategory: ${s.category ?? 'General'}\nContent: ${s.content}`,
    )
    .join('\n\n');

  const client = new Anthropic({ apiKey });
  let raw = '';

  try {
    console.log('[knowledgeAgent] calling claude-sonnet-4-6...');

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 512,
      system:     buildSystemPrompt(sourcesBlock),
      messages: [
        {
          role:    'user',
          content: `Patient message: "${messageText}"\n\nIntent: ${JSON.stringify(intent)}\n\nSafety assessment: ${JSON.stringify(safety)}`,
        },
      ],
    });

    raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[knowledgeAgent] raw Claude response:', raw);

    let parsed: KnowledgeResult;
    try {
      parsed = JSON.parse(raw) as KnowledgeResult;
    } catch (parseErr) {
      console.error('[knowledgeAgent] FALLBACK REASON: JSON parse failed');
      console.error('[knowledgeAgent] parse error:', parseErr);
      console.error('[knowledgeAgent] raw text:', raw);
      return { ...KNOWLEDGE_FALLBACK, allowed_content_summary: '[FALLBACK: JSON parse error]' };
    }

    // Safety guard: clinical domain always requires human review
    if (intent.domain === 'Clinical' && !parsed.requires_human_review) {
      console.warn('[knowledgeAgent] clinical domain — forcing requires_human_review=true');
      parsed.requires_human_review = true;
      parsed.can_answer_directly   = false;
    }

    console.log('[knowledgeAgent] final result:', JSON.stringify(parsed));
    return parsed;

  } catch (err) {
    console.error('[knowledgeAgent] FALLBACK REASON: Claude API error:', err);
    console.error('[knowledgeAgent] raw at time of error:', raw);
    return KNOWLEDGE_FALLBACK;
  }
}
