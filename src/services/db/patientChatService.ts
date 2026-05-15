import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export interface PatientChatRecord {
  messageId: string;
  patientName: string;
  messageText: string;
  messageTime: string;
  draftText: string | null;
  draftTime: string | null;
  responseMode: string | null;
  badgeText: string | null;
  qaStatus: string | null;
  riskLevel: string | null;
  intentData: Record<string, unknown> | null;
  safetyData: Record<string, unknown> | null;
  knowledgeData: Record<string, unknown> | null;
  actionsData: Record<string, unknown> | null;
  validationData: Record<string, unknown> | null;
}

export async function getPatientChatHistory(clinicId: string, after?: string): Promise<PatientChatRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('patient_messages') as any)
    .select(`
      id, patient_name, message_text, created_at,
      agent_analyses ( intent, safety, knowledge, actions, draft, validation ),
      draft_responses ( draft_text, created_at, draft_type )
    `)
    .eq('clinic_id', clinicId)
    .eq('channel', 'simulator')
    .order('created_at', { ascending: true });
  if (after) query = query.gt('created_at', after);
  const { data, error } = await query;

  if (error) {
    console.error('[patientChatService] error:', error.message);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
    const analysis = row.agent_analyses?.[0] ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const immediateDraft = row.draft_responses?.find((d: any) => d.draft_type === 'immediate_patient_response') ?? null;

    return {
      messageId: row.id,
      patientName: row.patient_name,
      messageText: row.message_text,
      messageTime: row.created_at,
      draftText: immediateDraft?.draft_text ?? null,
      draftTime: immediateDraft?.created_at ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseMode: (analysis?.draft as any)?.mode ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      badgeText: (analysis?.draft as any)?.badge ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qaStatus: (analysis?.validation as any)?.qa_status ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      riskLevel: (analysis?.safety as any)?.risk_level ?? null,
      intentData: analysis?.intent ?? null,
      safetyData: analysis?.safety ?? null,
      knowledgeData: analysis?.knowledge ?? null,
      actionsData: analysis?.actions ?? null,
      validationData: analysis?.validation ?? null,
    };
  });
}
