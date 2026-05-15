// backofficeOrchestrator.ts — server-side only.
// Orchestrates the 3-stage backoffice workflow:
//   1. Command Agent  → parse natural language intent
//   2. Data retrieval → adminDataService (patient, appointments, insurance, PA, billing)
//   3. Workup Agent   → identify blockers and recommended actions
//   4. Execution Agent → prepare drafts, task specs, assistant response
//   5. DB writes      → create tasks, save command record

import { runBackofficeCommandAgent } from './agents/backofficeCommandAgent';
import { runBackofficeWorkupAgent } from './agents/backofficeWorkupAgent';
import { runBackofficeExecutionAgent } from './agents/backofficeExecutionAgent';
import type { BackofficeBlocker, BackofficeRecommendedAction, BackofficeWorkupResult } from './agents/backofficeWorkupAgent';
import type { BackofficeDraft, BackofficeCreatedItem } from './agents/backofficeExecutionAgent';
import {
  getAdminCaseSummary,
  getPatientByName,
  saveBackofficeCommand,
  AmbiguousPatientError,
} from './adminDataService';
import type { AdminCaseSummary } from './adminDataService';
import { createTask } from './db/taskDbService';
import type { TaskPriority } from '@/types/database';

// ── Stage log ─────────────────────────────────────────────────────────────────

export type StageLogStatus = 'started' | 'completed' | 'skipped' | 'failed';

export interface StageLog {
  stage: string;
  label: string;
  status: StageLogStatus;
  timestamp: string;
  details?: string;
}

function makeLog(stage: string, label: string, status: StageLogStatus, details?: string): StageLog {
  return { stage, label, status, timestamp: new Date().toISOString(), details };
}

// ── Result shape ──────────────────────────────────────────────────────────────

export interface BackofficeCommandResult {
  command_type: string;
  patient_match: string | null;
  case_summary: {
    patient_name: string | null;
    appointment:  string | null;
    insurance:    string | null;
    procedure:    string | null;
    prior_auth:   string | null;
    billing_case: string | null;
  };
  blockers:             BackofficeBlocker[];
  recommended_actions:  BackofficeRecommendedAction[];
  created_items:        BackofficeCreatedItem[];
  drafts:               BackofficeDraft[];
  assistant_response:   string;
  audit_notes:          string;
  stage_logs:           StageLog[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCaseSummaryStrings(s: AdminCaseSummary): BackofficeCommandResult['case_summary'] {
  const appt = s.appointments[0];
  const ins  = s.insuranceProfiles[0];
  const proc = s.procedures[0];
  const pa   = s.priorAuthorizations[0];
  const bc   = s.billingCases[0];

  return {
    patient_name: s.patient.full_name,

    appointment: appt
      ? `${appt.appointment_type ?? 'Appointment'} · ${new Date(appt.appointment_date).toLocaleDateString()} · ${appt.status}`
      : null,

    insurance: ins
      ? `${ins.payer_name}${ins.plan_name ? ` (${ins.plan_name})` : ''} · Member: ${ins.member_id ?? 'N/A'} · Benefits: ${ins.benefits_status}`
      : null,

    procedure: proc
      ? `${proc.procedure_name}${proc.cpt_code ? ` (CPT ${proc.cpt_code})` : ''} · PA required: ${proc.requires_prior_auth ? 'Yes' : 'No'} · Status: ${proc.status}`
      : null,

    prior_auth: pa
      ? `Status: ${pa.status}${pa.auth_number ? ` · Auth# ${pa.auth_number}` : ''}${pa.missing_items?.length ? ` · ${pa.missing_items.length} missing item(s)` : ''}`
      : null,

    billing_case: bc
      ? `Status: ${bc.status} · Benefits: ${bc.benefits_status} · Clearance: ${bc.financial_clearance_status}${bc.estimated_patient_responsibility != null ? ` · Est. responsibility: $${bc.estimated_patient_responsibility.toFixed(2)}` : ''}`
      : null,
  };
}

function pluralise(n: number, word: string) {
  return `${n} ${word}${n !== 1 ? 's' : ''}`;
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export async function runBackofficeWorkflow(
  command: string,
  clinicId = 'a0000000-0000-0000-0000-000000000001',
  staffId?: string,
): Promise<BackofficeCommandResult> {
  const logs: StageLog[] = [];

  const result: BackofficeCommandResult = {
    command_type:        'case_lookup',
    patient_match:       null,
    case_summary:        { patient_name: null, appointment: null, insurance: null, procedure: null, prior_auth: null, billing_case: null },
    blockers:            [],
    recommended_actions: [],
    created_items:       [],
    drafts:              [],
    assistant_response:  '',
    audit_notes:         '',
    stage_logs:          logs,
  };

  try {
    // ── 1. Command received ───────────────────────────────────────────────────
    console.log('[backofficeOrchestrator] command:', command.slice(0, 120));
    logs.push(makeLog('command_received', 'Command received', 'completed'));

    // ── 2. Parse command ──────────────────────────────────────────────────────
    const parsedCommand = await runBackofficeCommandAgent(command);
    console.log('[backofficeOrchestrator] parsed:', JSON.stringify(parsedCommand));

    logs.push(makeLog(
      'command_parsed',
      `Command classified: ${parsedCommand.command_type}`,
      'completed',
      parsedCommand.patient_name ? `Patient: ${parsedCommand.patient_name}` : undefined,
    ));

    result.command_type  = parsedCommand.command_type;
    result.patient_match = parsedCommand.patient_name;

    // ── 3. Patient lookup + data load ─────────────────────────────────────────
    let caseSummary: AdminCaseSummary | null = null;

    if (parsedCommand.patient_name) {
      logs.push(makeLog('patient_lookup_started', `Looking up ${parsedCommand.patient_name}`, 'started'));

      let patient = null;
      try {
        patient = await getPatientByName(parsedCommand.patient_name, clinicId);
      } catch (e) {
        if (e instanceof AmbiguousPatientError) {
          const names = e.matches.map(p => p.full_name).join(', ');
          logs.push(makeLog('patient_not_found', `Ambiguous name — ${e.matches.length} matches`, 'failed', names));
          result.assistant_response = `The name "${parsedCommand.patient_name}" matches multiple patients: ${names}. Please use the full name.`;
          result.audit_notes = 'Ambiguous patient name — workflow stopped.';
          return result;
        }
        throw e;
      }

      if (!patient) {
        logs.push(makeLog('patient_not_found', `No patient found: "${parsedCommand.patient_name}"`, 'failed'));
        result.assistant_response = `I couldn't find a patient matching "${parsedCommand.patient_name}". Please check the name and try again.`;
        result.audit_notes = 'Patient not found — workflow stopped.';
        return result;
      }

      logs.push(makeLog('patient_found', `Found ${patient.full_name}`, 'completed'));

      caseSummary = await getAdminCaseSummary(patient.id);
      if (caseSummary) {
        const parts: string[] = [];
        if (caseSummary.appointments.length)        parts.push(pluralise(caseSummary.appointments.length, 'appointment'));
        if (caseSummary.insuranceProfiles.length)   parts.push('insurance profile');
        if (caseSummary.procedures.length)          parts.push(pluralise(caseSummary.procedures.length, 'procedure'));
        if (caseSummary.priorAuthorizations.length) parts.push('prior authorization');
        if (caseSummary.billingCases.length)        parts.push('billing case');

        logs.push(makeLog('admin_data_loaded', `Loaded ${parts.join(', ')}`, 'completed'));
        result.case_summary = buildCaseSummaryStrings(caseSummary);
        console.log('[backofficeOrchestrator] admin data loaded for:', patient.full_name);
      }
    } else {
      logs.push(makeLog('patient_lookup_started', 'Loading clinic worklist (no specific patient)', 'completed'));
    }

    // ── 4. Workup agent ───────────────────────────────────────────────────────
    let workup: BackofficeWorkupResult = { blockers: [], recommended_actions: [], case_narrative: '' };

    if (caseSummary) {
      workup = await runBackofficeWorkupAgent(parsedCommand, caseSummary);
      console.log('[backofficeOrchestrator] workup blockers:', JSON.stringify(workup.blockers));

      if (workup.failed) {
        logs.push(makeLog('workup_failed', 'Case workup failed — execution skipped', 'failed'));
        result.assistant_response = "I couldn't complete the case workup, so I did not create tasks or make any changes. Please try again.";
        result.audit_notes = 'Workup agent failed to return valid output — execution skipped for safety. No tasks or status updates were applied.';
        return result;
      }

      if (workup.blockers.length > 0) {
        const blockerNames = workup.blockers.map(b => b.type.replace(/_/g, ' ')).join(', ');
        logs.push(makeLog(
          'blockers_identified',
          `Found ${pluralise(workup.blockers.length, 'blocker')}`,
          'completed',
          blockerNames,
        ));
      }

      logs.push(makeLog(
        'recommended_actions_prepared',
        `${pluralise(workup.recommended_actions.length, 'action')} recommended`,
        'completed',
      ));

      result.blockers             = workup.blockers;
      result.recommended_actions  = workup.recommended_actions;
    }

    // ── 5. Execution agent ────────────────────────────────────────────────────
    const execution = await runBackofficeExecutionAgent(parsedCommand, workup, caseSummary);
    console.log('[backofficeOrchestrator] execution:', JSON.stringify({
      tasks: execution.tasks_to_create?.length ?? 0,
      drafts: execution.drafts?.length ?? 0,
    }));

    result.drafts              = execution.drafts ?? [];
    result.assistant_response  = execution.assistant_response;
    result.audit_notes         = execution.audit_notes;

    // ── 6. Create tasks if commanded ──────────────────────────────────────────
    const createdItems: BackofficeCreatedItem[] = [];

    if (parsedCommand.command_type === 'create_tasks' && execution.tasks_to_create?.length) {
      for (const spec of execution.tasks_to_create) {
        try {
          await createTask({
            clinic_id:         clinicId,
            source_message_id: null,
            title:             spec.title,
            description:       spec.description,
            assigned_to:       null,
            assigned_role:     spec.assigned_role,
            priority:          spec.priority as TaskPriority,
            status:            'pending_approval',
            ai_created:        true,
            due_at:            null,
          });
          createdItems.push({ type: 'task', title: spec.title, status: 'created' });
        } catch (e) {
          console.error('[backofficeOrchestrator] task creation failed:', e);
          createdItems.push({ type: 'task', title: spec.title, status: 'skipped' });
        }
      }

      const tasksDone = createdItems.filter(i => i.type === 'task' && i.status === 'created').length;
      if (tasksDone > 0) {
        logs.push(makeLog('tasks_created', `Created ${pluralise(tasksDone, 'task')}`, 'completed'));
      }
    }

    // Add prepared drafts to created_items
    for (const draft of execution.drafts ?? []) {
      createdItems.push({ type: 'draft', title: draft.title, status: 'prepared' });
    }

    if (execution.drafts?.length) {
      logs.push(makeLog(
        'drafts_created',
        `Prepared ${pluralise(execution.drafts.length, 'draft')}`,
        'completed',
        execution.drafts.map(d => d.title).join(' · '),
      ));
    }

    result.created_items = createdItems.length ? createdItems : (execution.created_items ?? []);

    // ── 7. Save command record ────────────────────────────────────────────────
    const saved = await saveBackofficeCommand({
      clinicId,
      staffId,
      commandText:  command,
      commandType:  parsedCommand.command_type,
      result: {
        patient_match:    parsedCommand.patient_name,
        blockers_count:   workup.blockers.length,
        tasks_created:    createdItems.filter(i => i.type === 'task' && i.status === 'created').length,
        drafts_prepared:  (execution.drafts ?? []).length,
      },
    });
    if (saved) {
      console.log('[backofficeOrchestrator] command record saved');
    } else {
      console.error('[backofficeOrchestrator] saveBackofficeCommand returned null — RLS policy or DB error prevented audit log save');
      result.audit_notes = (result.audit_notes ?? '') + ' Command audit log save failed (RLS or DB error) — workflow output was not affected.';
    }

    logs.push(makeLog('completed', 'Workflow completed', 'completed'));
    return result;

  } catch (err) {
    console.error('[backofficeOrchestrator] fatal error:', err);
    logs.push(makeLog('failed', 'Workflow failed', 'failed', String(err)));
    result.assistant_response = 'An unexpected error occurred. Please try again.';
    result.audit_notes        = `Fatal error: ${String(err)}`;
    return result;
  }
}
