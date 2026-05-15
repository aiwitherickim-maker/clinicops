// backofficeExecutionAgent.ts — server-side only. Never import from client components.
// Stage 3: Prepare drafts, task specifications, and the assistant response.

import Anthropic from '@anthropic-ai/sdk';
import { parseClaudeJson } from '@/lib/parseClaudeJson';
import type { ParsedBackofficeCommand } from './backofficeCommandAgent';
import type { BackofficeWorkupResult } from './backofficeWorkupAgent';
import type { AdminCaseSummary } from '@/services/adminDataService';

export interface BackofficeTaskSpec {
  title: string;
  description: string;
  assigned_role: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface BackofficeDraft {
  draft_type: 'payer_call_script' | 'patient_update' | 'internal_note' | 'prior_auth_checklist' | 'appeal_draft' | 'billing_followup';
  title: string;
  text: string;
  intended_sender_role?: string;
}

export interface BackofficeCreatedItem {
  type: 'task' | 'draft' | 'status_update';
  title: string;
  status: 'created' | 'prepared' | 'saved' | 'skipped';
  draftId?: string;
}

export interface BackofficeExecutionResult {
  tasks_to_create: BackofficeTaskSpec[];
  drafts: BackofficeDraft[];
  created_items: BackofficeCreatedItem[];
  assistant_response: string;
  audit_notes: string;
}

const FALLBACK_EXECUTION: BackofficeExecutionResult = {
  tasks_to_create: [],
  drafts: [],
  created_items: [],
  assistant_response: 'I encountered an issue processing this request. Please try again or review the case manually.',
  audit_notes: 'Execution agent fallback used.',
};

function buildSystemPrompt(commandType: string): string {
  const shouldCreateTasks  = commandType === 'create_tasks';
  const shouldDraftPayer   = commandType === 'draft_payer_script';
  const shouldDraftPatient = commandType === 'draft_patient_update';
  const isLookup           = commandType === 'case_lookup' || commandType === 'summarize_blockers';

  return `You are a clinic back-office operations assistant.
You will receive the staff command type, a case workup (blockers + recommended actions), and the full patient case data.
Prepare the outputs appropriate to the command.

Return ONLY valid JSON — no markdown fences, no explanation.

Active outputs for this command type ("${commandType}"):
  tasks_to_create : ${shouldCreateTasks ? 'POPULATE — create one task per recommended action that maps to create_task' : 'leave empty []'}
  drafts          : ${shouldDraftPayer ? 'POPULATE — write payer_call_script' : shouldDraftPatient ? 'POPULATE — write patient_update' : 'leave empty []'}
  assistant_response : ALWAYS populate — ${isLookup ? 'summarise the case status and blockers clearly' : 'describe what was done'}

CRITICAL authority rules — never violate:
  1. Never claim benefits are verified unless data shows benefits_status = "verified"
  2. Never claim PA is approved unless prior_authorization.status = "approved"
  3. Never claim financial clearance unless financial_clearance_status = "cleared"
  4. Payer call scripts must state what to ASK for, not what has been confirmed
  5. Patient updates must not promise a specific timeline unless data confirms one
  6. All created tasks require staff approval before any action is taken
  7. Never state that an external action has been taken (submission, payment, message sent)

DRAFT LENGTH RULES — always follow unless the user explicitly asks for "detailed", "comprehensive", "full checklist", or "training version":
  - payer_call_script:   under 350 words. compact structure only (see format below).
  - patient_update:      2–4 sentences.
  - internal_note:       3–6 bullet points.
  - prior_auth_checklist: 5–10 checklist items, one line each.
  - appeal_draft:        3–5 short paragraphs.
  - billing_followup:    2–3 sentences.

Payer call script format — compact, no decorative dividers (no ===, no ---):

  Title line: Payer Call Script — [Payer Name] / [Patient Name]

  Opening:
  One short paragraph: clinic name, staff name placeholder, patient name + DOB, member ID (or "on file"), procedure name, CPT code, and purpose of call.

  Key questions (5–8 bullets only):
  • [specific question to ask the payer rep]
  • ...

  Document these fields:
  • Reference number
  • Rep name and call time
  • [3–5 most important data points for this specific case]

  Note: One sentence reminding staff not to communicate PA status or coverage to the patient until confirmed in the system.

Patient update format:
  - Warm opening with patient first name
  - What is being worked on (without promising outcome)
  - What patient does NOT need to do right now
  - How they will hear back
  - Clinic number: (734) 555-0142

Return this exact shape:
{
  "tasks_to_create": [
    {
      "title": "...",
      "description": "...",
      "assigned_role": "billing | front_desk | clinician | office_manager",
      "priority": "low | medium | high | urgent"
    }
  ],
  "drafts": [
    {
      "draft_type": "payer_call_script | patient_update | internal_note",
      "title": "...",
      "text": "<complete, ready-to-use draft text>"
    }
  ],
  "created_items": [],
  "assistant_response": "<2–4 sentence natural-language summary for the chat UI>",
  "audit_notes": "<one sentence: what the agent did and what it explicitly did not do>"
}`;
}

export async function runBackofficeExecutionAgent(
  parsedCommand: ParsedBackofficeCommand,
  workup: BackofficeWorkupResult,
  caseSummary: AdminCaseSummary | null,
): Promise<BackofficeExecutionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[backofficeExecutionAgent] no API key — using fallback');
    return FALLBACK_EXECUTION;
  }

  const client = new Anthropic({ apiKey });

  const userContent = `Command type: ${parsedCommand.command_type}
Staff intent: ${parsedCommand.context_notes}

Case workup:
${JSON.stringify(workup, null, 2)}

Patient case data:
${caseSummary ? JSON.stringify(caseSummary, null, 2) : 'No patient data available.'}`;

  let raw = '';
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: buildSystemPrompt(parsedCommand.command_type),
      messages: [{ role: 'user', content: userContent }],
    });

    raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[backofficeExecutionAgent] raw length:', raw.length);

    const parsed = parseClaudeJson<BackofficeExecutionResult>(raw);
    console.log('[backofficeExecutionAgent] tasks:', parsed.tasks_to_create?.length ?? 0, '| drafts:', parsed.drafts?.length ?? 0);
    return parsed;
  } catch (err) {
    console.error('[backofficeExecutionAgent] error:', err, '| raw (first 200):', raw.slice(0, 200));
    return FALLBACK_EXECUTION;
  }
}
