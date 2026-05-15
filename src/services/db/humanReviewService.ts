import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { DbHumanReviewEvent } from '@/types/database';

export interface HumanReviewEventInput {
  clinicId?:           string;
  messageId?:          string;
  draftId?:            string;
  taskId?:             string;
  staffId?:            string;
  eventType:           string;
  originalAiText?:     string;
  finalText?:          string;
  diff?:               Record<string, unknown>;
  originalRoute?:      string;
  finalRoute?:         string;
  originalRiskLevel?:  string;
  finalRiskLevel?:     string;
  feedbackTags?:       string[];
  staffNote?:          string;
  metadata?:           Record<string, unknown>;
}

export async function logHumanReviewEvent(
  input: HumanReviewEventInput,
): Promise<DbHumanReviewEvent | null> {
  if (!isSupabaseConfigured()) {
    console.log('[humanReviewService] mock log:', input.eventType, {
      message_id: input.messageId,
      tags: input.feedbackTags,
    });
    return null;
  }

  const sb = getSupabaseClient()!;
  const values = {
    clinic_id:           input.clinicId           ?? null,
    message_id:          input.messageId          ?? null,
    draft_id:            input.draftId            ?? null,
    task_id:             input.taskId             ?? null,
    staff_id:            input.staffId            ?? null,
    event_type:          input.eventType,
    original_ai_text:    input.originalAiText     ?? null,
    final_text:          input.finalText          ?? null,
    diff:                input.diff               ?? {},
    original_route:      input.originalRoute      ?? null,
    final_route:         input.finalRoute         ?? null,
    original_risk_level: input.originalRiskLevel  ?? null,
    final_risk_level:    input.finalRiskLevel      ?? null,
    feedback_tags:       input.feedbackTags       ?? [],
    staff_note:          input.staffNote          ?? null,
    metadata:            input.metadata           ?? {},
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('human_review_events') as any)
    .insert(values)
    .select()
    .single();

  if (error) {
    // Non-fatal: event logging should never block the staff action that triggered it.
    console.warn('[humanReviewService] logHumanReviewEvent failed (RLS policy missing? Run migration 006):', error.message);
    return null;
  }
  return data;
}
