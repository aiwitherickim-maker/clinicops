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
  findPatientCandidates,
  saveBackofficeCommand,
  createBackofficeDraft,
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

export interface PatientMatchInfo {
  status: 'matched' | 'needs_confirmation' | 'ambiguous' | 'not_found';
  query: string;
  selected_patient: { id: string; full_name: string } | null;
  candidates: { id: string; full_name: string }[];
}

export interface BackofficeCommandResult {
  command_type: string;
  patient_match: string | null;        // short display string (patient name or query)
  patient_match_info: PatientMatchInfo | null;  // structured match result for UI
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

function inferSenderRole(draftType: string): string {
  switch (draftType) {
    case 'patient_update':    return 'front_desk';
    case 'internal_note':     return 'care_coordinator';
    default:                  return 'billing';
  }
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export async function runBackofficeWorkflow(
  command: string,
  clinicId = 'a0000000-0000-0000-0000-000000000001',
  staffId?: string,
  confirmedPatientName?: string,
): Promise<BackofficeCommandResult> {
  const logs: StageLog[] = [];

  const result: BackofficeCommandResult = {
    command_type:        'case_lookup',
    patient_match:       null,
    patient_match_info:  null,
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

    const searchName = confirmedPatientName ?? parsedCommand.patient_name;

    if (searchName) {
      logs.push(makeLog('patient_lookup_started',
        confirmedPatientName ? `Using confirmed patient: ${confirmedPatientName}` : `Looking up: ${searchName}`,
        'started'));

      const matchResult = await findPatientCandidates(searchName, clinicId);
      console.log('[backofficeOrchestrator] patient match:', matchResult.status, '| candidates:', matchResult.candidates.map(c => c.full_name));

      result.patient_match_info = {
        status:            matchResult.status,
        query:             matchResult.query,
        selected_patient:  matchResult.selected_patient ? { id: matchResult.selected_patient.id, full_name: matchResult.selected_patient.full_name } : null,
        candidates:        matchResult.candidates.map(c => ({ id: c.id, full_name: c.full_name })),
      };

      // When user already confirmed, treat any single candidate as matched
      const effectiveStatus = confirmedPatientName && matchResult.candidates.length >= 1
        ? 'matched'
        : matchResult.status;
      const patient = effectiveStatus === 'matched'
        ? (matchResult.selected_patient ?? matchResult.candidates[0])
        : null;

      if (effectiveStatus === 'needs_confirmation') {
        const cand = matchResult.candidates[0];
        logs.push(makeLog('patient_needs_confirmation', `Closest match: ${cand.full_name}`, 'completed'));
        result.patient_match      = cand.full_name;
        result.patient_match_info = { ...result.patient_match_info, status: 'needs_confirmation' };
        result.assistant_response = `I found **${cand.full_name}** as the closest match. Should I use this patient?`;
        result.audit_notes = 'Awaiting patient confirmation — no actions taken.';
        return result;
      }

      if (effectiveStatus === 'ambiguous') {
        const names = matchResult.candidates.map(c => c.full_name).join(', ');
        logs.push(makeLog('patient_ambiguous', `Multiple matches found`, 'failed', names));
        result.patient_match      = searchName;
        result.assistant_response = `I found multiple patients matching "${searchName}": ${names}. Which one should I use?`;
        result.audit_notes = 'Ambiguous patient name — awaiting selection.';
        return result;
      }

      if (effectiveStatus === 'not_found' || !patient) {
        logs.push(makeLog('patient_not_found', `No patient found: "${searchName}"`, 'failed'));
        result.assistant_response = `I couldn't find a patient matching "${searchName}". Please try using their full name.`;
        result.audit_notes = 'Patient not found — workflow stopped.';
        return result;
      }

      result.patient_match = patient.full_name;
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

    // ── 7. Save command record (first, to get command_id for draft linking) ──
    const savedCommand = await saveBackofficeCommand({
      clinicId,
      staffId,
      commandText: command,
      commandType: parsedCommand.command_type,
      result: {
        patient_match:   parsedCommand.patient_name,
        blockers_count:  workup.blockers.length,
        tasks_created:   createdItems.filter(i => i.type === 'task' && i.status === 'created').length,
        drafts_prepared: (execution.drafts ?? []).length,
      },
    });
    if (savedCommand) {
      console.log('[backofficeOrchestrator] command record saved:', savedCommand.id);
    } else {
      console.error('[backofficeOrchestrator] saveBackofficeCommand returned null — RLS policy or DB error prevented audit log save');
      result.audit_notes = (result.audit_notes ?? '') + ' Command audit log save failed (RLS or DB error) — workflow output was not affected.';
    }

    // ── 8. Persist drafts to backoffice_drafts ────────────────────────────────
    const patientFromSummary = caseSummary?.patient;
    const apptFromSummary    = caseSummary?.appointments[0];
    const procFromSummary    = caseSummary?.procedures[0];
    const paFromSummary      = caseSummary?.priorAuthorizations[0];
    const bcFromSummary      = caseSummary?.billingCases[0];

    let draftsSaved = 0;
    for (const draft of execution.drafts ?? []) {
      try {
        const senderRole = draft.intended_sender_role
          ?? inferSenderRole(draft.draft_type);
        const saved = await createBackofficeDraft({
          clinicId,
          patientId:      patientFromSummary?.id ?? null,
          appointmentId:  apptFromSummary?.id ?? null,
          procedureId:    procFromSummary?.id ?? null,
          priorAuthId:    paFromSummary?.id ?? null,
          billingCaseId:  bcFromSummary?.id ?? null,
          commandId:      savedCommand?.id ?? null,
          draftType:      draft.draft_type,
          title:          draft.title,
          content:        draft.text,
          intendedSenderRole: senderRole,
          metadata: {
            patient_name: patientFromSummary?.full_name ?? null,
            blockers:     workup.blockers.map(b => b.type),
          },
        });
        if (saved) {
          createdItems.push({ type: 'draft', title: draft.title, status: 'saved', draftId: saved.id });
          draftsSaved++;
        } else {
          createdItems.push({ type: 'draft', title: draft.title, status: 'prepared' });
          console.error('[backofficeOrchestrator] draft save returned null for:', draft.title);
        }
      } catch (e) {
        console.error('[backofficeOrchestrator] draft save failed:', e);
        createdItems.push({ type: 'draft', title: draft.title, status: 'prepared' });
      }
    }

    if (draftsSaved > 0) {
      logs.push(makeLog(
        'drafts_saved',
        `Saved ${pluralise(draftsSaved, 'draft')} to Drafts`,
        'completed',
        execution.drafts?.map(d => d.title).join(' · '),
      ));
      // Update assistant response to mention saved drafts
      result.assistant_response = result.assistant_response
        .replace(/draft prepared/gi, 'draft saved to Drafts')
        .replace(/drafts prepared/gi, 'drafts saved to Drafts');
    } else if ((execution.drafts ?? []).length > 0) {
      logs.push(makeLog(
        'drafts_created',
        `Prepared ${pluralise(execution.drafts!.length, 'draft')} (not saved to DB)`,
        'completed',
      ));
    }

    result.created_items = createdItems.length ? createdItems : (execution.created_items ?? []);

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
