-- Seed data for ClinicOps Chat Agent
-- Idempotent: safe to run multiple times without creating duplicates
-- Uses fixed UUIDs so references stay consistent across runs

-- ─────────────────────────────────────────────────────────────────────────────
-- Stable IDs
-- ─────────────────────────────────────────────────────────────────────────────
-- clinic  : a0000000-0000-0000-0000-000000000001
-- staff   : b0000000-0000-0000-0000-00000000000{1-4}
-- messages: c0000000-0000-0000-0000-00000000000{1-5}
-- knowledge: d0000000-0000-0000-0000-00000000000{1-5}
-- tasks   : e0000000-0000-0000-0000-00000000000{1-5}

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Clinic
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM clinics WHERE id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO clinics (id, name, specialty, assistant_name, tone, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Ann Arbor Retina Clinic',
  'Ophthalmology - Retinal Surgery',
  'ArborCare Assistant',
  'Warm, concise, professional',
  NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Staff
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM staff WHERE clinic_id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO staff (id, clinic_id, name, role, email, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Dr. Sarah Lee',  'Clinician',          'sarah.lee@arborcare.local',    NOW()),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Maria Alvarez',  'Front Desk',         'maria.alvarez@arborcare.local', NOW()),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Sam Park',       'Billing',            'sam.park@arborcare.local',      NOW()),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Jordan Kim',     'Clinical Assistant', 'jordan.kim@arborcare.local',    NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Patient Messages
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM patient_messages WHERE clinic_id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO patient_messages (id, clinic_id, patient_name, message_text, channel, category, risk_level, route_to, status, created_at, updated_at)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Maya Thompson',
    'I had my eye injection yesterday and now I have some pain and blurred vision. Is this normal?',
    'patient_portal', 'Clinical', 'high', 'Clinician', 'needs_review',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Daniel Brooks',
    'Can I reschedule my appointment next Tuesday to Wednesday instead?',
    'patient_portal', 'Scheduling', 'low', 'Front Desk', 'new',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Alicia Reed',
    'How much will my retinal surgery cost? Does my insurance cover it?',
    'patient_portal', 'Billing', 'medium', 'Billing', 'new',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Priya Shah',
    'I''m bleeding a lot after my procedure. Should I be worried? What should I do?',
    'patient_portal', 'Clinical', 'high', 'Clinician', 'needs_review',
    NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'Robert Chen',
    'What do I need to do to prepare for my appointment next week?',
    'patient_portal', 'General', 'low', 'Front Desk', 'new',
    NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Knowledge Sources
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM clinic_knowledge_sources WHERE clinic_id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO clinic_knowledge_sources (id, clinic_id, title, category, content, active, created_at, updated_at)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Post-Injection Escalation Policy',
    'Clinical',
    'For any patient reporting pain, vision changes, or unusual symptoms within 48 hours of injection: immediately escalate to Dr. Sarah Lee. Do not reassure or delay.',
    TRUE, NOW(), NOW()
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Procedure Prep Instructions',
    'Clinical',
    'Patients should avoid food/drink 4 hours before procedure. Bring a valid ID and insurance card. Arrange for someone to drive home. Avoid strenuous activity for 7 days post-procedure.',
    TRUE, NOW(), NOW()
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Billing FAQ',
    'Billing',
    'Routine retinal exams: covered by most insurance. Injections: usually covered with copay ($150–$300 per injection). Surgery: requires pre-auth. We file claims directly. Uninsured patients qualify for 10% discount.',
    TRUE, NOW(), NOW()
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Clinic Hours & Location',
    'General',
    'Ann Arbor Retina Clinic, 123 Medical Plaza Drive, Ann Arbor, MI 48103. Phone: (734) 555-0142. Hours: M–F 8am–5pm, Sat 9am–1pm. Closed Sundays and major holidays.',
    TRUE, NOW(), NOW()
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'Insurance Document Policy',
    'Billing',
    'We accept most major insurance plans. For out-of-network claims, we provide itemized receipts for patient reimbursement. Prior authorization required for surgery and certain procedures.',
    TRUE, NOW(), NOW()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Tasks (linked to staff and patient messages)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM tasks WHERE clinic_id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO tasks (id, clinic_id, source_message_id, title, description, assigned_to, assigned_role, priority, status, ai_created, due_at, created_at, updated_at)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Review Clinical message from Maya Thompson',
    'Patient reports post-injection pain and vision changes. Urgent clinical review required.',
    'b0000000-0000-0000-0000-000000000001', 'Clinician', 'urgent', 'pending_approval',
    TRUE, NOW() + INTERVAL '2 hours',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'Review Scheduling message from Daniel Brooks',
    'Patient requests to move Tuesday appointment to Wednesday.',
    'b0000000-0000-0000-0000-000000000002', 'Front Desk', 'low', 'pending_approval',
    TRUE, NOW() + INTERVAL '1 day',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000003',
    'Review Billing message from Alicia Reed',
    'Patient asking about surgery cost and insurance coverage.',
    'b0000000-0000-0000-0000-000000000003', 'Billing', 'medium', 'pending_approval',
    TRUE, NOW() + INTERVAL '1 day 12 hours',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000004',
    'URGENT: Review Clinical message from Priya Shah',
    'Patient reports significant bleeding post-procedure. Requires immediate clinical assessment.',
    'b0000000-0000-0000-0000-000000000001', 'Clinician', 'urgent', 'pending_approval',
    TRUE, NOW() + INTERVAL '1 hour',
    NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'
  ),
  (
    'e0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000005',
    'Review General message from Robert Chen',
    'Patient asking for pre-appointment preparation instructions.',
    'b0000000-0000-0000-0000-000000000002', 'Front Desk', 'low', 'pending_approval',
    TRUE, NOW() + INTERVAL '2 days',
    NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'
  );

SELECT 'Seed data loaded successfully.' AS status;
