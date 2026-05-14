-- Migration: add draft_type to draft_responses
-- Run this against your existing Supabase database in the SQL Editor.
-- safe to run multiple times (IF NOT EXISTS / default handles idempotency)

ALTER TABLE draft_responses
  ADD COLUMN IF NOT EXISTS draft_type text DEFAULT 'staff_followup_draft';

-- Back-fill any existing rows that don't have a type yet
UPDATE draft_responses
SET draft_type = 'staff_followup_draft'
WHERE draft_type IS NULL;

-- Index for efficient per-message per-type lookup
CREATE INDEX IF NOT EXISTS idx_draft_responses_message_type
  ON draft_responses(message_id, draft_type);
