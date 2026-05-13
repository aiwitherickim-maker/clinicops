import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { DbStaff } from '@/types/database';
import { STAFF } from '@/data/mockClinic';

// ── Mock fallback ─────────────────────────────────────────────────────────────
const MOCK_STAFF: DbStaff[] = STAFF.map((s, i) => ({
  id: `mock-staff-${s.id}`,
  clinic_id: 'mock-clinic-id',
  name: s.name,
  role: s.role,
  email: null,
  created_at: new Date().toISOString(),
}));

// ── Service functions ─────────────────────────────────────────────────────────

export async function getStaff(clinicId?: string): Promise<DbStaff[]> {
  if (!isSupabaseConfigured()) return MOCK_STAFF;

  const sb = getSupabaseClient()!;
  let query = sb.from('staff').select('*').order('name');
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[staffService] getStaff:', error.message); return MOCK_STAFF; }
  return data ?? MOCK_STAFF;
}

export async function getStaffById(id: string): Promise<DbStaff | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_STAFF.find(s => s.id === id) ?? MOCK_STAFF[0];
  }

  const sb = getSupabaseClient()!;
  const { data, error } = await sb.from('staff').select('*').eq('id', id).single();
  if (error) { console.error('[staffService] getStaffById:', error.message); return null; }
  return data;
}

export async function createStaff(
  values: Omit<DbStaff, 'id' | 'created_at'>
): Promise<DbStaff | null> {
  if (!isSupabaseConfigured()) return { id: `mock-${Date.now()}`, created_at: new Date().toISOString(), ...values };

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('staff') as any).insert(values).select().single();
  if (error) { console.error('[staffService] createStaff:', error.message); return null; }
  return data;
}
