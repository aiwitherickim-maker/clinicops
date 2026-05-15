// clinicDataService.ts
// Bridges DB service layer → UI types (InboxMessage, Task).
// Falls back to mock data when Supabase is not configured or returns no rows.

import type { InboxMessage, Task, Staff, Tone, Risk } from '@/types';
import type { DbPatientMessage, DbTask, DbStaff, MessageStatus, TaskStatus } from '@/types/database';
import { getMessages, updateMessageStatus as dbUpdateMessage } from './db/messageService';
import { getTasks, updateTaskStatus as dbUpdateTask, getTasksByMessageId, updateTaskAssignedRole, createTask } from './db/taskDbService';
import { getDraftForMessage, getStaffFollowupDraft, updateDraftStatus } from './db/draftService';
import { getStaff } from './db/staffService';
import { logHumanReviewEvent, computeTextDiff } from './feedbackService';
import { INBOX } from '@/data/mockMessages';
import { TASKS } from '@/data/mockTasks';
import { STAFF } from '@/data/mockClinic';

const DEMO_CLINIC_ID = 'a0000000-0000-0000-0000-000000000001';

// ─── shared helpers ───────────────────────────────────────────────────────────

function toInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatReceived(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffHours = (now.getTime() - d.getTime()) / 3_600_000;
  if (diffHours < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffHours < 48) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDue(iso: string | null): string {
  if (!iso) return 'No due date';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === new Date(now.getTime() + 86_400_000).toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function riskToTone(risk: string | null): Tone {
  if (risk === 'high')   return 'red';
  if (risk === 'medium') return 'amber';
  return 'sage';
}

// Status badge tone — semantic, not risk-based.
function msgStatusTone(status: string, risk: Risk): Tone {
  switch (status) {
    case 'resolved':     return 'sage';   // green — completed
    case 'approved':     return 'sage';   // green — positive
    case 'new':          return 'neutral'; // neutral — not yet triaged
    case 'analyzing':    return 'cream';  // soft amber — in progress
    case 'escalated':    return 'red';    // red — urgent
    case 'needs_review':
      // severity of "needs review" depends on risk
      return risk === 'high' ? 'red' : risk === 'medium' ? 'amber' : 'sage';
    default:             return 'neutral';
  }
}

function roleToTone(role: string | null): Tone {
  switch ((role ?? '').toLowerCase()) {
    case 'clinician':          return 'sage';
    case 'billing':            return 'amber';
    case 'front desk':         return 'sage';
    case 'clinical assistant': return 'cream';
    default:                   return 'neutral';
  }
}

function categoryToIconKey(category: string | null): string {
  switch ((category ?? '').toLowerCase()) {
    case 'clinical':               return 'stethoscope';
    case 'billing':                return 'dollar';
    case 'scheduling':             return 'calendar';
    case 'post-procedure symptom': return 'eye';
    case 'procedure prep':         return 'pill';
    case 'insurance / documents':  return 'file';
    default:                       return 'file';
  }
}

function roleToIconKey(role: string | null): string {
  switch ((role ?? '').toLowerCase()) {
    case 'clinician':  return 'stethoscope';
    case 'billing':    return 'dollar';
    case 'front desk': return 'calendar';
    default:           return 'clipboard';
  }
}

function roleToCategory(role: string | null): string {
  switch ((role ?? '').toLowerCase()) {
    case 'clinician':  return 'clinical';
    case 'billing':    return 'billing';
    case 'front desk': return 'scheduling';
    default:           return 'clinical';
  }
}

// ─── InboxMessage transform ───────────────────────────────────────────────────

function msgStatusLabel(status: string, routeTo?: string | null): string {
  if (status === 'needs_review') {
    const route = (routeTo ?? '').toLowerCase();
    if (route.includes('billing'))    return 'Billing follow-up';
    if (route.includes('front desk') || route.includes('front_desk')) return 'Front desk follow-up';
    return 'Clinician follow-up';
  }
  switch (status) {
    case 'new':       return 'New';
    case 'analyzing': return 'Analyzing…';
    case 'approved':  return 'Ready for approval';
    case 'escalated': return 'Escalated';
    case 'resolved':  return 'Resolved';
    default:          return status;
  }
}

async function dbMessageToInbox(msg: DbPatientMessage): Promise<InboxMessage> {
  const risk       = (msg.risk_level ?? 'low') as Risk;
  const iconTone   = riskToTone(risk);
  const statusTone = msgStatusTone(msg.status, risk);
  const staffDraft = await getStaffFollowupDraft(msg.id);
  return {
    id:           msg.id,
    patient:      msg.patient_name,
    patientShort: msg.patient_name.split(' ').pop() ?? msg.patient_name,
    initials:     toInitials(msg.patient_name),
    message:      msg.message_text,
    category:     msg.category ?? 'General',
    risk,
    status:       msgStatusLabel(msg.status, msg.route_to),
    statusTone,
    received:     formatReceived(msg.created_at),
    routeTo:      msg.route_to ?? 'Staff',
    iconKey:      categoryToIconKey(msg.category),
    iconTone,
    reason:       `Message from ${msg.patient_name} — awaiting staff review.`,
    draft:        staffDraft?.draft_text ?? 'Thank you for reaching out. A staff member will follow up shortly.',
    task: {
      title:    `Review message from ${msg.patient_name}`,
      priority: risk === 'high' ? 'Urgent' : risk === 'medium' ? 'Medium' : 'Low',
      assignee: msg.route_to ?? 'Staff',
    },
    confidence: risk === 'high' ? 88 : risk === 'medium' ? 74 : 90,
  };
}

// ─── Task transform ───────────────────────────────────────────────────────────

function taskStatusLabel(s: string): string {
  switch (s) {
    case 'pending_approval': return 'Pending approval';
    case 'open':             return 'Open';
    case 'in_progress':      return 'In progress';
    case 'needs_review':     return 'Needs review';
    case 'resolved':         return 'Resolved';
    default:                 return 'Open';
  }
}

function taskStatusTone(s: string): Tone {
  switch (s) {
    case 'pending_approval': return 'cream';
    case 'needs_review':     return 'amber';
    case 'resolved':         return 'sage';   // green — completed
    case 'in_progress':      return 'amber';
    default:                 return 'neutral';
  }
}

function priorityLabel(p: string): string {
  switch (p) {
    case 'urgent': return 'Urgent';
    case 'high':   return 'High';
    case 'medium': return 'Medium';
    case 'low':    return 'Low';
    default:       return 'Medium';
  }
}

function dbStaffToUi(s: DbStaff): Staff {
  return {
    id:       s.id,
    name:     s.name,
    role:     s.role,
    initials: toInitials(s.name),
    tone:     roleToTone(s.role),
  };
}

function fallbackAssignee(role: string | null): Staff {
  const found = STAFF.find(s => s.role.toLowerCase() === (role ?? '').toLowerCase());
  return found ?? STAFF[0];
}

function dbTaskToTask(
  task: DbTask,
  staffList: DbStaff[],
  patientNameById: Record<string, string>,
): Task {
  const dbStaff  = staffList.find(s => s.id === task.assigned_to);
  const assignee = dbStaff ? dbStaffToUi(dbStaff) : fallbackAssignee(task.assigned_role);

  const patientName = task.source_message_id ? patientNameById[task.source_message_id] : null;
  const source      = patientName ? `${patientName} message` : 'Back-office item';

  const pLabel = priorityLabel(task.priority) as Task['priority'];
  const pTone  = riskToTone(task.priority === 'urgent' ? 'high' : task.priority);

  return {
    id:           task.id,
    title:        task.title,
    sub:          task.description ?? `Source: ${source}`,
    source,
    iconKey:      roleToIconKey(task.assigned_role),
    tone:         pTone,
    assignee,
    priority:     pLabel,
    priorityTone: pTone,
    status:       taskStatusLabel(task.status) as Task['status'],
    statusTone:   taskStatusTone(task.status),
    due:          formatDue(task.due_at),
    aiCreated:    task.ai_created,
    category:     roleToCategory(task.assigned_role),
  };
}

// ─── public API ───────────────────────────────────────────────────────────────

// Returns only unresolved messages — inbox is a work queue, not a history view.
export async function getInboxMessages(): Promise<InboxMessage[]> {
  const msgs = await getMessages();
  if (!msgs.length) return INBOX;
  return Promise.all(
    msgs
      .filter(m => m.status !== 'resolved')
      .map(dbMessageToInbox),
  );
}

export async function getTaskList(): Promise<Task[]> {
  const [dbTasks, staffList, messages] = await Promise.all([
    getTasks(),
    getStaff(),
    getMessages(),
  ]);
  if (!dbTasks.length) return TASKS;

  const patientNameById: Record<string, string> = {};
  messages.forEach(m => { patientNameById[m.id] = m.patient_name; });

  return dbTasks.map(t => dbTaskToTask(t, staffList, patientNameById));
}

// Resolves a message and cascades to all related tasks and the draft.
export async function resolveMessageWorkflow(messageId: string): Promise<void> {
  // 1. Resolve the patient message
  const msgResult = await dbUpdateMessage(messageId, 'resolved');
  console.log('[resolveMessageWorkflow] message update →', msgResult?.status ?? 'error', { id: messageId });

  // 2. Resolve all tasks linked to this message
  const relatedTasks = await getTasksByMessageId(messageId);
  console.log(`[resolveMessageWorkflow] found ${relatedTasks.length} related task(s)`);

  for (const task of relatedTasks) {
    const taskResult = await dbUpdateTask(task.id, 'resolved');
    console.log(`[resolveMessageWorkflow] task "${task.title}" → ${taskResult?.status ?? 'error'}`, { id: task.id });
  }

  // 3. Approve the staff follow-up draft if one exists
  const draft = await getStaffFollowupDraft(messageId);
  if (draft && draft.status === 'needs_review') {
    const draftResult = await updateDraftStatus(draft.id, 'approved');
    console.log('[resolveMessageWorkflow] staff draft update →', draftResult?.status ?? 'error', { id: draft.id });
  }
}

export async function updateInboxMessageStatus(
  id: string,
  status: MessageStatus,
): Promise<void> {
  await dbUpdateMessage(id, status);
}

export async function updateTaskStatusById(
  id: string,
  status: TaskStatus,
): Promise<void> {
  await dbUpdateTask(id, status);
}

// ── Inbox action workflows (each DB op + human review event log) ──────────────

interface WorkflowResult { success: boolean; error?: string }

export async function approveMessageWorkflow(
  messageId: string,
  draftText:  string,
  clinicId  = DEMO_CLINIC_ID,
): Promise<WorkflowResult> {
  try {
    const draft = await getStaffFollowupDraft(messageId);
    if (draft) {
      const r = await updateDraftStatus(draft.id, 'approved');
      if (!r) throw new Error('Draft approval failed');
    }
    const msg = await dbUpdateMessage(messageId, 'approved');
    if (!msg) throw new Error('Message status update failed');

    await logHumanReviewEvent({
      clinicId, messageId,
      draftId:        draft?.id,
      eventType:      'approved',
      originalAiText: draftText,
      finalText:      draftText,
      feedbackTags:   ['good_as_is'],
    });
    return { success: true };
  } catch (err) {
    console.error('[approveMessageWorkflow]', err);
    return { success: false, error: String(err) };
  }
}

export async function editDraftWorkflow(
  messageId:    string,
  originalText: string,
  editedText:   string,
  clinicId    = DEMO_CLINIC_ID,
): Promise<WorkflowResult> {
  try {
    const draft = await getStaffFollowupDraft(messageId);
    if (!draft) throw new Error('No draft found');

    const r = await updateDraftStatus(draft.id, 'needs_review', { edited_text: editedText });
    if (!r) throw new Error('Draft update failed');

    await logHumanReviewEvent({
      clinicId, messageId,
      draftId:        draft.id,
      eventType:      'edited',
      originalAiText: originalText,
      finalText:      editedText,
      diff:           computeTextDiff(originalText, editedText),
      feedbackTags:   ['edited'],
    });
    return { success: true };
  } catch (err) {
    console.error('[editDraftWorkflow]', err);
    return { success: false, error: String(err) };
  }
}

export async function assignMessageWorkflow(
  messageId:     string,
  newRole:       string,
  previousRoute: string,
  clinicId     = DEMO_CLINIC_ID,
): Promise<WorkflowResult> {
  try {
    const msg = await dbUpdateMessage(messageId, 'needs_review', { route_to: newRole });
    if (!msg) throw new Error('Message route update failed');

    const tasks = await getTasksByMessageId(messageId);
    for (const task of tasks) {
      await updateTaskAssignedRole(task.id, newRole.toLowerCase());
    }

    const routeChanged = previousRoute.toLowerCase() !== newRole.toLowerCase();
    await logHumanReviewEvent({
      clinicId, messageId,
      eventType:     'reassigned',
      originalRoute: previousRoute,
      finalRoute:    newRole,
      feedbackTags:  routeChanged ? ['wrong_route'] : [],
    });
    return { success: true };
  } catch (err) {
    console.error('[assignMessageWorkflow]', err);
    return { success: false, error: String(err) };
  }
}

export async function escalateMessageWorkflow(
  messageId:    string,
  patientName:  string,
  previousRoute: string,
  previousRisk:  string,
  clinicId     = DEMO_CLINIC_ID,
): Promise<WorkflowResult> {
  try {
    const isAlreadyHigh = previousRisk === 'high';
    const msg = await dbUpdateMessage(messageId, 'escalated', {
      route_to:   'Clinician',
      risk_level: isAlreadyHigh ? undefined : 'high',
    });
    if (!msg) throw new Error('Message escalation update failed');

    // Create a clinician task only if one doesn't already exist
    const existingTasks = await getTasksByMessageId(messageId);
    const clinicianTaskExists = existingTasks.some(
      t => (t.assigned_role ?? '').toLowerCase() === 'clinician' && t.status !== 'resolved',
    );
    let newTaskId: string | undefined;
    if (!clinicianTaskExists) {
      const task = await createTask({
        clinic_id:         clinicId,
        source_message_id: messageId,
        title:             `Urgent clinician review — ${patientName}`,
        description:       'Escalated by staff. Requires immediate clinician attention.',
        assigned_to:       null,
        assigned_role:     'clinician',
        priority:          'urgent',
        status:            'open',
        ai_created:        false,
        due_at:            null,
      });
      newTaskId = task?.id;
    }

    const wasUnderEscalated = !previousRoute.toLowerCase().includes('clinician');
    await logHumanReviewEvent({
      clinicId, messageId,
      taskId:             newTaskId,
      eventType:          'escalated',
      originalRoute:      previousRoute,
      finalRoute:         'Clinician',
      originalRiskLevel:  previousRisk,
      finalRiskLevel:     'high',
      feedbackTags:       wasUnderEscalated ? ['under_escalated'] : [],
    });
    return { success: true };
  } catch (err) {
    console.error('[escalateMessageWorkflow]', err);
    return { success: false, error: String(err) };
  }
}

export async function resolveMessageWorkflowWithLog(
  messageId: string,
  clinicId = DEMO_CLINIC_ID,
): Promise<WorkflowResult> {
  try {
    await resolveMessageWorkflow(messageId);
    await logHumanReviewEvent({
      clinicId, messageId,
      eventType:    'resolved',
      feedbackTags: [],
    });
    return { success: true };
  } catch (err) {
    console.error('[resolveMessageWorkflowWithLog]', err);
    return { success: false, error: String(err) };
  }
}
