// POST /api/backoffice-command
// Server-side only. Orchestrates the 3-stage backoffice workflow.
// Never exposes ANTHROPIC_API_KEY to the browser.

import { NextRequest, NextResponse } from 'next/server';
import { runBackofficeWorkflow } from '@/services/backofficeOrchestrator';

export interface BackofficeCommandRequest {
  command: string;
  staffId?: string;
  clinicId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BackofficeCommandRequest;
    const { command, staffId, clinicId } = body;

    if (!command?.trim()) {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    console.log('[api/backoffice-command] received:', {
      command: command.slice(0, 120),
      staffId,
      clinicId,
    });

    const result = await runBackofficeWorkflow(
      command.trim(),
      clinicId || 'a0000000-0000-0000-0000-000000000001',
      staffId,
    );

    console.log('[api/backoffice-command] completed | type:', result.command_type, '| patient:', result.patient_match);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/backoffice-command] unhandled error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 },
    );
  }
}
