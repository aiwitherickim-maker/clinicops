import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { DbClinic } from '@/types/database';
import { CLINIC } from '@/data/mockClinic';

// ── Mock fallback ─────────────────────────────────────────────────────────────
const MOCK_CLINIC: DbClinic = {
  id: 'mock-clinic-id',
  name: CLINIC.name,
  specialty: CLINIC.specialty,
  assistant_name: CLINIC.assistant,
  tone: 'Warm, concise, professional',
  created_at: new Date().toISOString(),
};

// ── Service functions ─────────────────────────────────────────────────────────

export async function getClinic(id?: string): Promise<DbClinic | null> {
  if (!isSupabaseConfigured()) return MOCK_CLINIC;

  const sb = getSupabaseClient()!;
  const query = id
    ? sb.from('clinics').select('*').eq('id', id).single()
    : sb.from('clinics').select('*').limit(1).single();

  const { data, error } = await query;
  if (error) { console.error('[clinicService] getClinic:', error.message); return MOCK_CLINIC; }
  return data;
}

export async function upsertClinic(
  values: Partial<Omit<DbClinic, 'id' | 'created_at'>>
): Promise<DbClinic | null> {
  if (!isSupabaseConfigured()) return { ...MOCK_CLINIC, ...values };

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('clinics') as any).upsert({ ...values }).select().single();

  if (error) { console.error('[clinicService] upsertClinic:', error.message); return null; }
  return data;
}
