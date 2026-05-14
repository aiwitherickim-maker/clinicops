// backofficeCommandAgent.ts — server-side only. Never import from client components.
// Stage 1: Parse a natural-language staff command into structured intent JSON.

import Anthropic from '@anthropic-ai/sdk';
import { parseClaudeJson } from '@/lib/parseClaudeJson';

export type BackofficeCommandType =
  | 'case_lookup'
  | 'billing_worklist'
  | 'prior_auth_worklist'
  | 'create_tasks'
  | 'draft_payer_script'
  | 'draft_patient_update'
  | 'update_status'
  | 'summarize_blockers';

export interface ParsedBackofficeCommand {
  command_type: BackofficeCommandType;
  patient_name: string | null;
  requested_actions: string[];
  context_notes: string;
}

const FALLBACK: ParsedBackofficeCommand = {
  command_type: 'case_lookup',
  patient_name: null,
  requested_actions: ['case_lookup'],
  context_notes: 'Could not parse command — defaulting to general lookup.',
};

const SYSTEM_PROMPT = `You are an intent parser for a clinic back-office operations system.
Classify the staff command into structured JSON. Return ONLY valid JSON — no markdown fences, no explanation.

Command types (pick the best match):
  case_lookup        — staff wants to see full status of a patient's billing/PA case
  billing_worklist   — staff wants a list of all billing items needing attention (no specific patient)
  prior_auth_worklist — staff wants a list of all open prior auth cases (no specific patient)
  create_tasks       — staff wants internal tasks to be created
  draft_payer_script — staff wants a call script for the insurance payer
  draft_patient_update — staff wants a message to send the patient
  update_status      — staff wants to mark a status field changed
  summarize_blockers — staff wants to know what is blocking a case

Return exactly this shape:
{
  "command_type": "<type>",
  "patient_name": "<full name, or null if none mentioned>",
  "requested_actions": ["<concise action 1>", "..."],
  "context_notes": "<one sentence: what does the staff member actually want?>"
}

Examples:
  "What billing and prior auth work needs attention for Alicia Reed?"
    → case_lookup, "Alicia Reed"
  "Create the benefits verification and prior auth tasks for Alicia."
    → create_tasks, "Alicia Reed"
  "Draft a payer call script for Alicia Reed's Blue Cross prior auth."
    → draft_payer_script, "Alicia Reed"
  "Draft a patient update for Alicia explaining that billing is verifying benefits."
    → draft_patient_update, "Alicia Reed"
  "Show me all open prior auth cases."
    → prior_auth_worklist, null
  "What is blocking Alicia Reed's case?"
    → summarize_blockers, "Alicia Reed"`;

const KNOWN_PATIENTS = [
  'Alicia Reed', 'Maya Thompson', 'Daniel Brooks', 'Priya Shah', 'Robert Chen',
];

function fallbackExtractPatient(command: string): string | null {
  return KNOWN_PATIENTS.find(n => command.toLowerCase().includes(n.toLowerCase())) ?? null;
}

export async function runBackofficeCommandAgent(command: string): Promise<ParsedBackofficeCommand> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[backofficeCommandAgent] no API key — using fallback');
    return { ...FALLBACK, patient_name: fallbackExtractPatient(command) };
  }

  const client = new Anthropic({ apiKey });
  let raw = '';

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Staff command: "${command}"` }],
    });

    raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[backofficeCommandAgent] raw:', raw);

    const parsed = parseClaudeJson<ParsedBackofficeCommand>(raw);
    console.log('[backofficeCommandAgent] parsed:', JSON.stringify(parsed));
    return parsed;
  } catch (err) {
    console.error('[backofficeCommandAgent] error:', err, '| raw:', raw);
    return { ...FALLBACK, patient_name: fallbackExtractPatient(command) };
  }
}
