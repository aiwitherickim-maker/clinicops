// GET /api/debug-env — checks which env vars are present server-side.
// Returns presence/absence only — never the actual values.
// Remove this route before going to production.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      ? `set (length: ${process.env.ANTHROPIC_API_KEY.length})`
      : 'MISSING ❌',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `set`
      : 'MISSING ❌',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? `set (length: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length})`
      : 'MISSING ❌',
  });
}
