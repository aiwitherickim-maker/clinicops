import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { DbDraftResponse, DraftStatus, DraftType } from '@/types/database';
import { INBOX } from '@/data/mockMessages';

// ── Mock fallback ─────────────────────────────────────────────────────────────
const MOCK_DRAFTS: DbDraftResponse[] = INBOX.map(m => ({
  id: `mock-draft-${m.id}`,
  message_id: m.id,
  analysis_id: null,
  draft_text: m.draft,
  draft_type: 'staff_followup_draft' as DraftType,
  status: 'needs_review' as DraftStatus,
  edited_text: null,
  approved_by: null,
  approved_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

// ── Service functions ─────────────────────────────────────────────────────────

export async function getDraftForMessage(messageId: string): Promise<DbDraftResponse | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_DRAFTS.find(d => d.message_id === messageId) ?? null;
  }

  const sb = getSupabaseClient()!;
  const { data, error } = await sb
    .from('draft_responses')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) { console.error('[draftService] getDraftForMessage:', error.message); return null; }
  return data;
}

export async function getStaffFollowupDraft(messageId: string): Promise<DbDraftResponse | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_DRAFTS.find(d => d.message_id === messageId && d.draft_type === 'staff_followup_draft') ?? null;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('draft_responses') as any)
    .select('*')
    .eq('message_id', messageId)
    .eq('draft_type', 'staff_followup_draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      // Column may not exist yet (migration pending) — fall back to any draft for this message
      console.warn('[draftService] getStaffFollowupDraft fallback:', error.message);
      return getDraftForMessage(messageId);
    }
    return null;
  }
  return data ?? null;
}

export async function createDraft(
  values: Omit<DbDraftResponse, 'id' | 'created_at' | 'updated_at'>
): Promise<DbDraftResponse | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: `mock-draft-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...values,
    };
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('draft_responses') as any).insert(values).select().single();
  if (error) { console.error('[draftService] createDraft:', error.message); return null; }
  return data;
}

export async function updateDraftStatus(
  id: string,
  status: DraftStatus,
  extra?: { edited_text?: string; approved_by?: string }
): Promise<DbDraftResponse | null> {
  if (!isSupabaseConfigured()) {
    const draft = MOCK_DRAFTS.find(d => d.id === id);
    return draft
      ? { ...draft, status, ...extra, approved_at: status === 'approved' ? new Date().toISOString() : null }
      : null;
  }

  const sb = getSupabaseClient()!;
  const update: Record<string, unknown> = { status, ...extra };
  if (status === 'approved') update.approved_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('draft_responses') as any)
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) { console.error('[draftService] updateDraftStatus:', error.message); return null; }
  return data;
}

export async function approveDraft(
  id: string,
  approvedByStaffId: string
): Promise<DbDraftResponse | null> {
  return updateDraftStatus(id, 'approved', { approved_by: approvedByStaffId });
}
