import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { DbPatientMessage, MessageStatus } from '@/types/database';
import { INBOX } from '@/data/mockMessages';

// ── Mock fallback ─────────────────────────────────────────────────────────────
const MOCK_MESSAGES: DbPatientMessage[] = INBOX.map((m, i) => ({
  id: m.id,
  clinic_id: 'mock-clinic-id',
  patient_name: m.patient,
  message_text: m.message,
  channel: 'patient_portal',
  category: m.category,
  risk_level: m.risk,
  route_to: m.routeTo,
  status: m.risk === 'high' ? 'needs_review' : 'new' as MessageStatus,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

// ── Service functions ─────────────────────────────────────────────────────────

export async function getMessages(clinicId?: string): Promise<DbPatientMessage[]> {
  if (!isSupabaseConfigured()) return MOCK_MESSAGES;

  const sb = getSupabaseClient()!;
  let query = sb.from('patient_messages').select('*').order('created_at', { ascending: false });
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[messageService] getMessages:', error.message); return MOCK_MESSAGES; }
  return data ?? MOCK_MESSAGES;
}

export async function getMessageById(id: string): Promise<DbPatientMessage | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_MESSAGES.find(m => m.id === id) ?? null;
  }

  const sb = getSupabaseClient()!;
  const { data, error } = await sb.from('patient_messages').select('*').eq('id', id).single();
  if (error) { console.error('[messageService] getMessageById:', error.message); return null; }
  return data;
}

export async function createMessage(
  values: Omit<DbPatientMessage, 'id' | 'created_at' | 'updated_at'>
): Promise<DbPatientMessage | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: `mock-msg-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...values,
    };
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('patient_messages') as any).insert(values).select().single();
  if (error) { console.error('[messageService] createMessage:', error.message); return null; }
  return data;
}

export async function updateMessageStatus(
  id: string,
  status: MessageStatus,
  extraFields?: Partial<Pick<DbPatientMessage, 'category' | 'risk_level' | 'route_to'>>
): Promise<DbPatientMessage | null> {
  if (!isSupabaseConfigured()) {
    const msg = MOCK_MESSAGES.find(m => m.id === id);
    return msg ? { ...msg, status, ...extraFields } : null;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('patient_messages') as any)
    .update({ status, ...extraFields })
    .eq('id', id)
    .select()
    .single();

  if (error) { console.error('[messageService] updateMessageStatus:', error.message); return null; }
  return data;
}

// Full workflow status progression
export async function progressMessageStatus(
  id: string,
  next: MessageStatus
): Promise<DbPatientMessage | null> {
  return updateMessageStatus(id, next);
}
