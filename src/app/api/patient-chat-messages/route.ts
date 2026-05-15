// GET /api/patient-chat-messages
// Returns patient simulator chat history, formatted for the PatientChatSimulator UI.

import { NextRequest, NextResponse } from 'next/server';
import { getPatientChatHistory, type PatientChatRecord } from '@/services/db/patientChatService';
import type { ResponseType, WorkflowStep } from '@/types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function deriveResponseType(
  mode: string | null,
  qaStatus: string | null,
  riskLevel: string | null,
): ResponseType {
  if (qaStatus === 'fallback_approved' && riskLevel === 'high') return 'urgent_safety';
  switch (mode) {
    case 'send_safe_acknowledgment':         return 'safe_acknowledgment';
    case 'approved_source_answer':           return 'source_answered';
    case 'send_preapproved_safety_response': return riskLevel === 'high' ? 'urgent_safety' : 'preapproved_safety';
    default:                                 return 'draft_review';
  }
}

function toRouteLabel(routeTo: string): string {
  switch (routeTo) {
    case 'clinician':  return 'Clinician';
    case 'billing':    return 'Billing';
    case 'front_desk': return 'Front Desk';
    default:           return 'Staff';
  }
}

function toWorkflowStatusLabel(status: string): string {
  switch (status) {
    case 'needs_clinician_review':   return 'Needs Clinician Review';
    case 'needs_billing_review':     return 'Needs Billing Review';
    case 'needs_front_desk_review':  return 'Needs Front Desk Review';
    case 'ready_for_staff_approval': return 'Ready for Staff Approval';
    case 'resolved_by_ai_draft':     return 'Resolved by AI Draft';
    default:                         return status;
  }
}

function buildWorkflow(record: PatientChatRecord): WorkflowStep | null {
  const { intentData, safetyData, knowledgeData, actionsData, validationData } = record;
  if (!intentData || !safetyData || !knowledgeData || !actionsData || !validationData) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const i = intentData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = safetyData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const k = knowledgeData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = actionsData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = validationData as any;

  return {
    intent: {
      intent: String(i.primary_intent ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      domain: String(i.domain ?? ''),
      confidence: typeof i.confidence === 'number' && i.confidence <= 1
        ? Math.round(i.confidence * 100)
        : Number(i.confidence ?? 0),
    },
    safety: {
      risk: String(s.risk_level ?? '').charAt(0).toUpperCase() + String(s.risk_level ?? '').slice(1),
      review: s.needs_human_review ? 'Required' : 'Not required',
      routeTo: toRouteLabel(String(s.route_to ?? '')),
    },
    knowledge: {
      source: String(k.matched_source_title ?? 'No matching source found'),
      rule: String(k.allowed_content_summary ?? ''),
      relevance: k.relevance,
    },
    planner: {
      status: toWorkflowStatusLabel(String(a.workflow_status ?? '')),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actions: (a.recommended_actions ?? []).map((action: any) => ({
        title:             String(action.title ?? ''),
        role:              toRouteLabel(String(action.assignee_role ?? '')),
        priority:          String(action.priority ?? '').charAt(0).toUpperCase() + String(action.priority ?? '').slice(1),
        reason:            String(action.reason ?? ''),
        requires_approval: Boolean(action.requires_approval),
      })),
    },
    validation: {
      qaStatus: String(v.qa_status ?? '').charAt(0).toUpperCase() + String(v.qa_status ?? '').slice(1).replace('_', ' '),
      canAutoSend:         Boolean(v.can_auto_send),
      requiresHumanReview: Boolean(v.requires_human_review),
      reasonSummary:       String(v.reason_summary ?? ''),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      issues: (v.issues ?? []).map((issue: any) => ({
        type:        String(issue.type ?? ''),
        severity:    String(issue.severity ?? ''),
        description: String(issue.description ?? ''),
      })),
    },
  };
}

export interface PatientHistoryResponseItem {
  patientMessage: { text: string; t: string; patientName: string };
  assistantMessage: { text: string; t: string; responseType: ResponseType; badgeText: string } | null;
  workflow: WorkflowStep | null;
}

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get('clinicId') ?? 'a0000000-0000-0000-0000-000000000001';
  const after    = req.nextUrl.searchParams.get('after') ?? undefined;

  try {
    const records = await getPatientChatHistory(clinicId, after);
    console.log('[api/patient-chat-messages] loaded', records.length, 'records for clinic', clinicId);

    const items: PatientHistoryResponseItem[] = records.map(record => ({
      patientMessage: {
        text: record.messageText,
        t:    formatTime(record.messageTime),
        patientName: record.patientName,
      },
      assistantMessage: record.draftText ? {
        text:         record.draftText,
        t:            formatTime(record.draftTime ?? record.messageTime),
        responseType: deriveResponseType(record.responseMode, record.qaStatus, record.riskLevel),
        badgeText:    record.badgeText ?? '',
      } : null,
      workflow: buildWorkflow(record),
    }));

    return NextResponse.json(items);
  } catch (err) {
    console.error('[api/patient-chat-messages] error:', err);
    return NextResponse.json([]);
  }
}
