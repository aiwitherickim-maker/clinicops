# ClinicOps — Claude Code Instructions

## Git workflow
- After every commit, always push to GitHub immediately using the provided token.
- The user works on their Mac and runs `git pull origin main` to get changes — never leave commits as local-only.
- Push format: set token in remote URL, push, restore clean URL.

## Stack
- Next.js 16 (App Router), TypeScript strict, Tailwind/CSS vars
- Supabase (PostgreSQL) via @supabase/supabase-js
- Claude API via @anthropic-ai/sdk — all API calls server-side only (never in client components)
- Demo clinic ID: `a0000000-0000-0000-0000-000000000001`

## Architecture rules
- Agent files (`src/services/agents/`) are server-side only — never import from client components
- All Claude API calls go through `src/app/api/` routes to protect ANTHROPIC_API_KEY
- Every DB service must check `isSupabaseConfigured()` and fall back to mock data
- Mock fallback pattern applies to all Supabase service files

## Response policy
- Low-risk (scheduling, general): `send_safe_acknowledgment` — auto-sent, no approval
- Clinical-risk: `send_preapproved_safety_response` — pre-approved template, auto-sent
- Human review required: `draft_patient_reply` — only when custom content needs approval
- Never use `send_response` or `send_message` action types
