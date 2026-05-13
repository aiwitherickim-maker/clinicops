// clinicDataService.ts
// Bridges DB service layer → UI types (InboxMessage, Task).
// Falls back to mock data when Supabase is not configured or returns no rows.

import type { InboxMessage, Task, Staff, Tone, Risk } from '@/types';
import type { DbPatientMessage, DbTask, DbStaff, MessageStatus, TaskStatus } from '@/types/database';
import { getMessages, updateMessageStatus as dbUpdateMessage } from './db/messageService';
import { getTasks, updateTaskStatus as dbUpdateTask } from './db/taskDbService';
import { getStaff } from './db/staffService';
import { INBOX } from '@/data/mockMessages';
import { TASKS } from '@/data/mockTasks';
import { STAFF } from '@/data/mockClinic';

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
    case 'clinical':              return 'stethoscope';
    case 'billing':               return 'dollar';
    case 'scheduling':            return 'calendar';
    case 'post-procedure symptom':return 'eye';
    case 'procedure prep':        return 'pill';
    case 'insurance / documents': return 'file';
    default:                      return 'file';
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

function msgStatusLabel(status: string): string {
  switch (status) {
    case 'needs_review': return 'Needs clinician review';
    case 'new':          return 'New';
    case 'analyzing':    return 'Analyzing…';
    case 'approved':     return 'Approved';
    case 'escalated':    return 'Escalated';
    case 'resolved':     return 'Resolved';
    default:             return status;
  }
}

function dbMessageToInbox(msg: DbPatientMessage): InboxMessage {
  const risk = (msg.risk_level ?? 'low') as Risk;
  const tone = riskToTone(risk);
  return {
    id:          msg.id,
    patient:     msg.patient_name,
    patientShort: msg.patient_name.split(' ').pop() ?? msg.patient_name,
    initials:    toInitials(msg.patient_name),
    message:     msg.message_text,
    category:    msg.category ?? 'General',
    risk,
    status:      msgStatusLabel(msg.status),
    statusTone:  tone,
    received:    formatReceived(msg.created_at),
    routeTo:     msg.route_to ?? 'Staff',
    iconKey:     categoryToIconKey(msg.category),
    iconTone:    tone,
    reason:      `Message from ${msg.patient_name} — awaiting staff review.`,
    draft:       `Thank you for reaching out. A staff member will follow up shortly.`,
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
    case 'resolved':         return 'sage';
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
  const dbStaff = staffList.find(s => s.id === task.assigned_to);
  const assignee: Staff = dbStaff ? dbStaffToUi(dbStaff) : fallbackAssignee(task.assigned_role);

  const patientName = task.source_message_id ? patientNameById[task.source_message_id] : null;
  const source = patientName ? `${patientName} message` : 'Back-office item';

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

export async function getInboxMessages(): Promise<InboxMessage[]> {
  const msgs = await getMessages();
  if (!msgs.length) return INBOX;
  return msgs.map(dbMessageToInbox);
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
