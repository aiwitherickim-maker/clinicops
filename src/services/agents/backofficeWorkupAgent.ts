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
}

const FALLBACK_WORKUP: BackofficeWorkupResult = {
  blockers: [],
  recommended_actions: [],
  case_narrative: 'Unable to complete workup — please review the case manually.',
};

const SYSTEM_PROMPT = `You are a clinic back-office operations analyst.
You will receive structured data about a patient's billing and prior authorization case.
Identify blockers and recommend next actions.

Return ONLY valid JSON — no markdown fences, no explanation.

Blocker types:
  benefits_not_verified       — insurance benefits have not been confirmed with the payer
  prior_auth_not_started      — PA is required for this procedure but has not been initiated
  missing_documentation       — required documents are absent (clinical notes, referrals, imaging)
  financial_clearance_blocked — the billing case is not cleared to proceed
  other                       — any other material blocker

Severity:
  high   — blocks care delivery or creates significant financial/clinical risk; immediate action needed
  medium — creates risk if not addressed soon; action needed this week
  low    — minor issue; can be addressed in normal workflow

Action types:
  create_task          — create an internal staff task
  draft_payer_script   — write a phone script for calling the payer
  draft_patient_update — write a patient-facing update message
  update_status        — update a status field in the system
  no_action            — nothing actionable at this time

CRITICAL accuracy rules:
  1. Never claim benefits are verified unless benefits_status = "verified" in the data
  2. Never claim prior auth is approved unless prior_authorization.status = "approved"
  3. Never claim financial clearance unless financial_clearance_status = "cleared"
  4. Reference real values from the data (payer name, procedure, dates, amounts)
  5. If the procedure requires_prior_auth = true and PA status = "not_started", that is a blocker

Return this exact shape:
{
  "blockers": [
    {
      "type": "<blocker_type>",
      "severity": "low | medium | high",
      "description": "<specific, referencing real data from the case>"
    }
  ],
  "recommended_actions": [
    {
      "type": "<action_type>",
      "title": "<short action title>",
      "description": "<what to do and why, 1–2 sentences>",
      "assigned_role": "billing | front_desk | clinician | office_manager",
      "priority": "low | medium | high | urgent",
      "requires_approval": true
    }
  ],
  "case_narrative": "<2–3 sentence plain-English summary of case status and what must happen>"
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
    console.error('[backofficeWorkupAgent] error:', err, '| raw:', raw.slice(0, 200));
    return FALLBACK_WORKUP;
  }
}
