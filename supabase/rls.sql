-- RLS policies for ClinicOps demo
-- Run this in the Supabase SQL Editor after schema.sql
-- Allows anonymous read access and write access for the demo

ALTER TABLE clinics                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_analyses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_knowledge_sources ENABLE ROW LEVEL SECURITY;

-- Read access for all tables
CREATE POLICY "anon_read" ON clinics                  FOR SELECT USING (true);
CREATE POLICY "anon_read" ON staff                    FOR SELECT USING (true);
CREATE POLICY "anon_read" ON patient_messages         FOR SELECT USING (true);
CREATE POLICY "anon_read" ON agent_analyses           FOR SELECT USING (true);
CREATE POLICY "anon_read" ON draft_responses          FOR SELECT USING (true);
CREATE POLICY "anon_read" ON tasks                    FOR SELECT USING (true);
CREATE POLICY "anon_read" ON clinic_knowledge_sources FOR SELECT USING (true);

-- Write access for tables the app mutates
CREATE POLICY "anon_write" ON patient_messages         FOR ALL USING (true);
CREATE POLICY "anon_write" ON agent_analyses           FOR ALL USING (true);
CREATE POLICY "anon_write" ON draft_responses          FOR ALL USING (true);
CREATE POLICY "anon_write" ON tasks                    FOR ALL USING (true);

SELECT 'RLS policies applied.' AS status;
