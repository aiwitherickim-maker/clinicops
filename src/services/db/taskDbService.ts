import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { DbTask, TaskStatus, TaskPriority } from '@/types/database';
import { TASKS } from '@/data/mockTasks';

// ── Mock fallback ─────────────────────────────────────────────────────────────
const MOCK_DB_TASKS: DbTask[] = TASKS.map(t => ({
  id: t.id,
  clinic_id: 'mock-clinic-id',
  source_message_id: null,
  title: t.title,
  description: t.sub,
  assigned_to: null,
  assigned_role: t.assignee.role,
  priority: t.priority.toLowerCase() as TaskPriority,
  status: (t.status === 'Pending approval' ? 'pending_approval' : t.status.toLowerCase().replace(' ', '_')) as TaskStatus,
  ai_created: t.aiCreated,
  due_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

// ── Service functions ─────────────────────────────────────────────────────────

export async function getTasks(clinicId?: string): Promise<DbTask[]> {
  if (!isSupabaseConfigured()) return MOCK_DB_TASKS;

  const sb = getSupabaseClient()!;
  let query = sb.from('tasks').select('*').order('created_at', { ascending: false });
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[taskDbService] getTasks:', error.message); return MOCK_DB_TASKS; }
  return data ?? MOCK_DB_TASKS;
}

export async function getTaskById(id: string): Promise<DbTask | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_DB_TASKS.find(t => t.id === id) ?? null;
  }

  const sb = getSupabaseClient()!;
  const { data, error } = await sb.from('tasks').select('*').eq('id', id).single();
  if (error) { console.error('[taskDbService] getTaskById:', error.message); return null; }
  return data;
}

export async function createTask(
  values: Omit<DbTask, 'id' | 'created_at' | 'updated_at'>
): Promise<DbTask | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: `task-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...values,
    };
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('tasks') as any).insert(values).select().single();
  if (error) { console.error('[taskDbService] createTask:', error.message); return null; }
  return data;
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<DbTask | null> {
  if (!isSupabaseConfigured()) {
    const task = MOCK_DB_TASKS.find(t => t.id === id);
    return task ? { ...task, status } : null;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('tasks') as any)
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) { console.error('[taskDbService] updateTaskStatus:', error.message); return null; }
  return data;
}

export async function assignTask(
  id: string,
  staffId: string,
  staffRole?: string
): Promise<DbTask | null> {
  if (!isSupabaseConfigured()) {
    const task = MOCK_DB_TASKS.find(t => t.id === id);
    return task ? { ...task, assigned_to: staffId, assigned_role: staffRole ?? task.assigned_role } : null;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('tasks') as any)
    .update({ assigned_to: staffId, assigned_role: staffRole })
    .eq('id', id)
    .select()
    .single();

  if (error) { console.error('[taskDbService] assignTask:', error.message); return null; }
  return data;
}

export async function createTaskFromMessage(
  clinicId: string,
  messageId: string,
  title: string,
  options?: { assignedRole?: string; priority?: TaskPriority; dueAt?: string }
): Promise<DbTask | null> {
  return createTask({
    clinic_id: clinicId,
    source_message_id: messageId,
    title,
    description: null,
    assigned_to: null,
    assigned_role: options?.assignedRole ?? null,
    priority: options?.priority ?? 'medium',
    status: 'pending_approval',
    ai_created: true,
    due_at: options?.dueAt ?? null,
  });
}
