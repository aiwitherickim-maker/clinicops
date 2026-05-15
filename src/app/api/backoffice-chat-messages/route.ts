// GET /api/backoffice-chat-messages — load recent chat history for a clinic
// Server-side only.

import { NextRequest, NextResponse } from 'next/server';
import { getBackofficeChatMessages } from '@/services/adminDataService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId  = searchParams.get('clinicId') ?? 'a0000000-0000-0000-0000-000000000001';
    const commandId = searchParams.get('commandId') ?? undefined;
    const limit     = parseInt(searchParams.get('limit') ?? '100', 10);
    const after     = searchParams.get('after') ?? undefined;

    const messages = await getBackofficeChatMessages({ clinicId, commandId, limit, after });
    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[api/backoffice-chat-messages] GET error:', err);
    return NextResponse.json({ error: 'Internal server error', detail: String(err) }, { status: 500 });
  }
}
