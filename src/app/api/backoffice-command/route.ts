// POST /api/backoffice-command
// Server-side only. Orchestrates the backoffice workflow.
// Returns a streaming NDJSON response:
//   {"t":"step","label":"...","status":"...","details":"..."}  (one per stage)
//   {"t":"done","data":{...full result...}}                     (final)
//   {"t":"error","message":"..."}                               (on failure)

import { NextRequest, NextResponse } from 'next/server';
import { runBackofficeWorkflow } from '@/services/backofficeOrchestrator';
import type { StageLog } from '@/services/backofficeOrchestrator';

export interface BackofficeCommandRequest {
  command: string;
  staffId?: string;
  clinicId?: string;
  confirmedPatientName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BackofficeCommandRequest;
    const { command, staffId, clinicId, confirmedPatientName } = body;

    if (!command?.trim()) {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      start(controller) {
        const emit = (obj: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
        };

        runBackofficeWorkflow(
          command.trim(),
          clinicId || 'a0000000-0000-0000-0000-000000000001',
          staffId,
          confirmedPatientName,
          (step: StageLog) => emit({ t: 'step', ...step }),
        )
          .then(result => {
            console.log('[api/backoffice-command] completed | type:', result.command_type, '| patient:', result.patient_match);
            emit({ t: 'done', data: result });
            controller.close();
          })
          .catch(err => {
            console.error('[api/backoffice-command] orchestrator error:', err);
            emit({ t: 'error', message: String(err) });
            controller.close();
          });
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    console.error('[api/backoffice-command] unhandled error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 },
    );
  }
}
