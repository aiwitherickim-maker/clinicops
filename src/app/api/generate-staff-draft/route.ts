// POST /api/generate-staff-draft
// Server-side only. Generates a staff follow-up draft for the Staff Review Inbox.
// Called when staff click "Regenerate" on a message.

import { NextRequest, NextResponse } from 'next/server';
import { runStaffFollowupDraftAgent } from '@/services/agents/staffFollowupDraftAgent';

export interface GenerateStaffDraftRequest {
  messageText: string;
  patientName: string;
  category: string;
  riskLevel: string;
  routeTo: string;
  taskTitle: string;
  taskAssignee: string;
  reason: string;
  clinicPhone?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GenerateStaffDraftRequest;
    const { messageText, patientName, category, riskLevel, routeTo, taskTitle, taskAssignee, reason, clinicPhone } = body;

    if (!messageText?.trim()) {
      return NextResponse.json({ error: 'messageText is required' }, { status: 400 });
    }

    console.log('[api/generate-staff-draft] received:', { patientName, category, riskLevel, routeTo });

    const result = await runStaffFollowupDraftAgent({
      messageText: messageText.trim(),
      patientName: patientName || 'Patient',
      category,
      riskLevel,
      routeTo,
      taskTitle,
      taskAssignee,
      reasonSummary: reason,
      clinicPhone: clinicPhone ?? '(734) 555-0142',
    });

    console.log('[api/generate-staff-draft] draft generated | type:', result.draft_type, '| role:', result.intended_sender_role);

    return NextResponse.json({
      draftText:                  result.draft_text,
      draftType:                  result.draft_type,
      intendedSenderRole:         result.intended_sender_role,
      requiresClinicianApproval:  result.requires_clinician_approval,
      canBeSentByAssignedStaff:   result.can_be_sent_by_assigned_staff,
      missingInformation:         result.missing_information,
      safetyNotes:                result.safety_notes,
      reasonSummary:              result.reason_summary,
    });

  } catch (err) {
    console.error('[api/generate-staff-draft] unhandled error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 },
    );
  }
}
