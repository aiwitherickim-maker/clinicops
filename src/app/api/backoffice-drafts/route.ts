// GET /api/backoffice-drafts — list drafts for a clinic
// Server-side only.

import { NextRequest, NextResponse } from 'next/server';
import { getBackofficeDrafts } from '@/services/adminDataService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId  = searchParams.get('clinicId')  ?? 'a0000000-0000-0000-0000-000000000001';
    const patientId = searchParams.get('patientId') ?? undefined;
    const status    = searchParams.get('status')    ?? undefined;
    const limit     = parseInt(searchParams.get('limit') ?? '50', 10);

    const drafts = await getBackofficeDrafts({ clinicId, patientId, status, limit });
    return NextResponse.json({ drafts });
  } catch (err) {
    console.error('[api/backoffice-drafts] GET error:', err);
    return NextResponse.json({ error: 'Internal server error', detail: String(err) }, { status: 500 });
  }
}
