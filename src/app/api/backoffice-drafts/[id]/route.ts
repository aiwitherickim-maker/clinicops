// PATCH /api/backoffice-drafts/[id] — update draft status or content
// Server-side only.

import { NextRequest, NextResponse } from 'next/server';
import { updateBackofficeDraft } from '@/services/adminDataService';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      status?: string;
      title?: string;
      content?: string;
      intended_sender_role?: string;
    };

    const updated = await updateBackofficeDraft(id, {
      ...(body.status               != null && { status: body.status }),
      ...(body.title                != null && { title: body.title }),
      ...(body.content              != null && { content: body.content }),
      ...(body.intended_sender_role != null && { intended_sender_role: body.intended_sender_role }),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Draft not found or update failed' }, { status: 404 });
    }
    return NextResponse.json({ draft: updated });
  } catch (err) {
    console.error('[api/backoffice-drafts/[id]] PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error', detail: String(err) }, { status: 500 });
  }
}
