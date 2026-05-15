import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { DbAgentAnalysis } from '@/types/database';
import { SIM_CONVERSATIONS } from '@/data/mockMessages';

// ── Mock fallback ─────────────────────────────────────────────────────────────
const MOCK_ANALYSIS: DbAgentAnalysis = {
  id: 'mock-analysis-id',
  message_id: 'msg-a',
  intent:    SIM_CONVERSATIONS[0].workflow.intent    as Record<string, unknown>,
  safety:    SIM_CONVERSATIONS[0].workflow.safety    as Record<string, unknown>,
  knowledge: SIM_CONVERSATIONS[0].workflow.knowledge as Record<string, unknown>,
  actions:   SIM_CONVERSATIONS[0].workflow.planner as Record<string, unknown>,
  draft:     { text: 'Draft text here' },
  validation:SIM_CONVERSATIONS[0].workflow.validation as Record<string, unknown>,
  final_status: 'approved_for_queue',
  created_at: new Date().toISOString(),
};

// ── Service functions ─────────────────────────────────────────────────────────

export async function getAnalysisForMessage(messageId: string): Promise<DbAgentAnalysis | null> {
  if (!isSupabaseConfigured()) {
    return messageId === 'msg-a' ? MOCK_ANALYSIS : null;
  }

  const sb = getSupabaseClient()!;
  const { data, error } = await sb
    .from('agent_analyses')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { console.error('[analysisService] getAnalysisForMessage:', error.message); return null; }
  return data;
}

export async function saveAgentAnalysis(
  values: Omit<DbAgentAnalysis, 'id' | 'created_at'>
): Promise<DbAgentAnalysis | null> {
  if (!isSupabaseConfigured()) {
    return { id: `mock-analysis-${Date.now()}`, created_at: new Date().toISOString(), ...values };
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('agent_analyses') as any).insert(values).select().single();
  if (error) { console.error('[analysisService] saveAgentAnalysis:', error.message); return null; }
  return data;
}
