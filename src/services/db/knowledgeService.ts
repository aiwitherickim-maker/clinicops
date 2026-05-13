import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { DbKnowledgeSource } from '@/types/database';
import { KNOWLEDGE_SOURCES } from '@/data/mockClinic';

// ── Mock fallback ─────────────────────────────────────────────────────────────
const MOCK_KNOWLEDGE: DbKnowledgeSource[] = KNOWLEDGE_SOURCES.map((k, i) => ({
  id: `mock-knowledge-${i}`,
  clinic_id: 'mock-clinic-id',
  title: k.title,
  category: k.tone,
  content: `Content for: ${k.title}`,
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

// ── Service functions ─────────────────────────────────────────────────────────

export async function getKnowledgeSources(clinicId?: string): Promise<DbKnowledgeSource[]> {
  if (!isSupabaseConfigured()) return MOCK_KNOWLEDGE;

  const sb = getSupabaseClient()!;
  let query = sb.from('clinic_knowledge_sources').select('*').eq('active', true).order('title');
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[knowledgeService] getKnowledgeSources:', error.message); return MOCK_KNOWLEDGE; }
  return data ?? MOCK_KNOWLEDGE;
}

export async function createKnowledgeSource(
  values: Omit<DbKnowledgeSource, 'id' | 'created_at' | 'updated_at'>
): Promise<DbKnowledgeSource | null> {
  if (!isSupabaseConfigured()) {
    return { id: `mock-ks-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...values };
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('clinic_knowledge_sources') as any).insert(values).select().single();
  if (error) { console.error('[knowledgeService] createKnowledgeSource:', error.message); return null; }
  return data;
}

export async function toggleKnowledgeSource(id: string, active: boolean): Promise<DbKnowledgeSource | null> {
  if (!isSupabaseConfigured()) {
    const ks = MOCK_KNOWLEDGE.find(k => k.id === id);
    return ks ? { ...ks, active } : null;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('clinic_knowledge_sources') as any)
    .update({ active })
    .eq('id', id)
    .select()
    .single();

  if (error) { console.error('[knowledgeService] toggleKnowledgeSource:', error.message); return null; }
  return data;
}
