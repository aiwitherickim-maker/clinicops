// POST /api/analyze-message
// Server-side only. Runs the patient message workflow via Claude agents.
// Never exposes ANTHROPIC_API_KEY to the browser.

import { NextRequest, NextResponse } from 'next/server';
import { runPatientMessageWorkflow } from '@/services/patientMessageOrchestrator';

export interface AnalyzeMessageRequest {
  messageText: string;
  patientName: string;
  clinicId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AnalyzeMessageRequest;
    const { messageText, patientName, clinicId } = body;

    if (!messageText?.trim()) {
      return NextResponse.json({ error: 'messageText is required' }, { status: 400 });
    }

    console.log('[api/analyze-message] received:', { patientName, clinicId, messageText: messageText.slice(0, 80) });

    const result = await runPatientMessageWorkflow(
      messageText.trim(),
      patientName || 'Simulator Patient',
      clinicId || 'a0000000-0000-0000-0000-000000000001',
    );

    console.log('[api/analyze-message] workflow complete | messageId:', result.messageId);

    return NextResponse.json({
      workflow:      result.workflow,
      draftText:     result.draftText,
      badgeText:     result.badgeText,
      responseType:  result.responseType,
      messageId:     result.messageId,
    });

  } catch (err) {
    console.error('[api/analyze-message] unhandled error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 },
    );
  }
}
