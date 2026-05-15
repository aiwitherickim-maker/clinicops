// POST /api/analyze-message
// Server-side only. Streams workflow stage logs as NDJSON, then sends the final result.
// Never exposes ANTHROPIC_API_KEY to the browser.

import { NextRequest } from 'next/server';
import { runPatientMessageWorkflow } from '@/services/patientMessageOrchestrator';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messageText, patientName, clinicId } = body;

  if (!messageText?.trim()) {
    return new Response(
      JSON.stringify({ type: 'error', message: 'messageText is required' }) + '\n',
      { status: 400, headers: { 'Content-Type': 'application/x-ndjson' } },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };

      try {
        const result = await runPatientMessageWorkflow(
          messageText.trim(),
          patientName || 'Simulator Patient',
          clinicId  || 'a0000000-0000-0000-0000-000000000001',
          (log) => send({ type: 'stage_log', log }),
        );
        send({ type: 'result', ...result });
      } catch (err) {
        console.error('[api/analyze-message] unhandled error:', err);
        send({ type: 'error', message: String(err) });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
