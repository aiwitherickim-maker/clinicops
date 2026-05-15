-- RLS policies for ClinicOps demo
-- Run this in the Supabase SQL Editor after schema.sql and 002_backoffice_tables.sql
-- Allows anonymous read access and write access for the demo

-- ── Original tables ───────────────────────────────────────────────────────────
ALTER TABLE clinics                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_analyses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read" ON clinics                  FOR SELECT USING (true);
CREATE POLICY "anon_read" ON staff                    FOR SELECT USING (true);
CREATE POLICY "anon_read" ON patient_messages         FOR SELECT USING (true);
CREATE POLICY "anon_read" ON agent_analyses           FOR SELECT USING (true);
CREATE POLICY "anon_read" ON draft_responses          FOR SELECT USING (true);
CREATE POLICY "anon_read" ON tasks                    FOR SELECT USING (true);
CREATE POLICY "anon_read" ON clinic_knowledge_sources FOR SELECT USING (true);

CREATE POLICY "anon_write" ON patient_messages         FOR ALL USING (true);
CREATE POLICY "anon_write" ON agent_analyses           FOR ALL USING (true);
CREATE POLICY "anon_write" ON draft_responses          FOR ALL USING (true);
CREATE POLICY "anon_write" ON tasks                    FOR ALL USING (true);

-- ── Backoffice tables (002_backoffice_tables.sql) ─────────────────────────────
ALTER TABLE patients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures             ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_authorizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_commands    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read"  ON patients             FOR SELECT USING (true);
CREATE POLICY "anon_read"  ON appointments         FOR SELECT USING (true);
CREATE POLICY "anon_read"  ON insurance_profiles   FOR SELECT USING (true);
CREATE POLICY "anon_read"  ON procedures           FOR SELECT USING (true);
CREATE POLICY "anon_read"  ON prior_authorizations FOR SELECT USING (true);
CREATE POLICY "anon_read"  ON billing_cases        FOR SELECT USING (true);
CREATE POLICY "anon_write" ON backoffice_commands  FOR ALL   USING (true);

-- ── backoffice_drafts (003_backoffice_drafts.sql) ─────────────────────────────
ALTER TABLE backoffice_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read"  ON backoffice_drafts FOR SELECT USING (true);
CREATE POLICY "anon_write" ON backoffice_drafts FOR ALL    USING (true);

-- ── backoffice_chat_messages (004_backoffice_chat_messages.sql) ───────────────
ALTER TABLE backoffice_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read"  ON backoffice_chat_messages FOR SELECT USING (true);
CREATE POLICY "anon_write" ON backoffice_chat_messages FOR ALL    USING (true);

SELECT 'RLS policies applied.' AS status;
