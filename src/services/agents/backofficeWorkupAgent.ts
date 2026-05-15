// backofficeWorkupAgent.ts — server-side only. Never import from client components.
// Stage 2: Given admin case data, identify blockers and recommend next actions.

import Anthropic from '@anthropic-ai/sdk';
import { parseClaudeJson } from '@/lib/parseClaudeJson';
import type { ParsedBackofficeCommand } from './backofficeCommandAgent';
import type { AdminCaseSummary } from '@/services/adminDataService';

export interface BackofficeBlocker {
  type: 'benefits_not_verified' | 'prior_auth_not_started' | 'missing_documentation' | 'financial_clearance_blocked' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface BackofficeRecommendedAction {
  type: 'create_task' | 'draft_payer_script' | 'draft_patient_update' | 'update_status' | 'no_action';
  title: string;
  description: string;
  assigned_role: 'billing' | 'front_desk' | 'clinician' | 'office_manager';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requires_approval: boolean;
}

export interface BackofficeWorkupResult {
  blockers: BackofficeBlocker[];
  recommended_actions: BackofficeRecommendedAction[];
  case_narrative: string;
  failed?: true;  // set when the agent/parse failed — orchestrator must gate execution on this
}

const FALLBACK_WORKUP: BackofficeWorkupResult = {
  blockers: [],
  recommended_actions: [],
  case_narrative: 'Unable to complete workup — please review the case manually.',
};

const FAILED_WORKUP: BackofficeWorkupResult = {
  blockers: [],
  recommended_actions: [],
  case_narrative: '',
  failed: true,
};

const SYSTEM_PROMPT = `You are a clinic back-office operations analyst.
Analyze the patient case data. Return ONLY the JSON object — no markdown fences, no preamble, no explanation, no trailing text.

BLOCKER TYPES (use exactly one of these strings):
  benefits_not_verified | prior_auth_not_started | missing_documentation | financial_clearance_blocked | other

SEVERITY: "high" | "medium" | "low"

ACTION TYPES (use exactly one of these strings):
  create_task | draft_payer_script | draft_patient_update | update_status | no_action

ASSIGNED ROLE (use exactly one of these strings):
  billing | front_desk | clinician | office_manager

ACCURACY RULES — never violate:
  1. benefits_status must equal "verified" in data before calling benefits verified
  2. prior_auth.status must equal "approved" before calling PA approved
  3. financial_clearance_status must equal "cleared" before calling case cleared
  4. If requires_prior_auth=true and PA status="not_started" → blocker type "prior_auth_not_started"
  5. Keep ALL string values under 100 characters — longer values break JSON parsing

RETURN EXACTLY THIS SHAPE — no extra fields, no comments:
{
  "blockers": [
    { "type": "benefits_not_verified", "severity": "high", "description": "Blue Cross benefits unverified for retinal surgery" }
  ],
  "recommended_actions": [
    { "type": "create_task", "title": "Verify Blue Cross benefits", "description": "Call payer to verify benefits before surgery.", "assigned_role": "billing", "priority": "urgent", "requires_approval": true }
  ],
  "case_narrative": "Two sentence summary. Keep under 200 characters total."
}`;

export async function runBackofficeWorkupAgent(
  parsedCommand: ParsedBackofficeCommand,
  caseSummary: AdminCaseSummary,
): Promise<BackofficeWorkupResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[backofficeWorkupAgent] no API key — using fallback');
    return FALLBACK_WORKUP;
  }

  const client = new Anthropic({ apiKey });

  const userContent = `Staff intent: ${parsedCommand.context_notes}

Patient case data:
${JSON.stringify(caseSummary, null, 2)}`;

  let raw = '';
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[backofficeWorkupAgent] raw (first 300):', raw.slice(0, 300));

    const parsed = parseClaudeJson<BackofficeWorkupResult>(raw);
    console.log('[backofficeWorkupAgent] blockers:', parsed.blockers?.length, '| actions:', parsed.recommended_actions?.length);
    return parsed;
  } catch (err) {
    console.error('[backofficeWorkupAgent] FAILED — parse or API error:', err instanceof Error ? err.message : err);
    console.error('[backofficeWorkupAgent] raw that failed to parse:', raw.slice(0, 400));
    return FAILED_WORKUP;
  }
}
