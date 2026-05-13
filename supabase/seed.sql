-- Seed data for ClinicOps Chat Agent
-- Idempotent seed: safe to run multiple times without creating duplicates

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Clinic
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM clinics WHERE name = 'Ann Arbor Retina Clinic';

WITH clinic_insert AS (
  INSERT INTO clinics (
    id,
    name,
    specialty,
    assistant_name,
    tone,
    created_at,
    updated_at
  ) VALUES (
    'clinic-001',
    'Ann Arbor Retina Clinic',
    'Ophthalmology - Retinal Surgery',
    'ArborCare Assistant',
    'Warm, concise, professional',
    NOW(),
    NOW()
  )
  RETURNING id, name
)
SELECT 'Clinic created:', name FROM clinic_insert;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Staff
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM staff WHERE clinic_id = 'clinic-001';

WITH staff_insert AS (
  INSERT INTO staff (
    id,
    clinic_id,
    name,
    role,
    email,
    created_at,
    updated_at
  ) VALUES
    ('staff-001', 'clinic-001', 'Dr. Sarah Lee', 'Clinician', 'sarah.lee@arborcare.local', NOW(), NOW()),
    ('staff-002', 'clinic-001', 'Maria Alvarez', 'Front Desk', 'maria.alvarez@arborcare.local', NOW(), NOW()),
    ('staff-003', 'clinic-001', 'Sam Park', 'Billing', 'sam.park@arborcare.local', NOW(), NOW()),
    ('staff-004', 'clinic-001', 'Jordan Kim', 'Clinical Assistant', 'jordan.kim@arborcare.local', NOW(), NOW())
  RETURNING id, name, role
)
SELECT 'Staff created:', name || ' (' || role || ')' FROM staff_insert;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Patient Messages
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM patient_messages WHERE clinic_id = 'clinic-001';

WITH messages_insert AS (
  INSERT INTO patient_messages (
    id,
    clinic_id,
    patient_name,
    message_text,
    channel,
    category,
    risk_level,
    route_to,
    status,
    created_at,
    updated_at
  ) VALUES
    (
      'msg-001',
      'clinic-001',
      'Maya Thompson',
      'I had my eye injection yesterday and now I have some pain and blurred vision. Is this normal?',
      'patient_portal',
      'Clinical',
      'high',
      'Clinician',
      'needs_review',
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '2 days'
    ),
    (
      'msg-002',
      'clinic-001',
      'Daniel Brooks',
      'Can I reschedule my appointment next Tuesday to Wednesday instead?',
      'patient_portal',
      'Scheduling',
      'low',
      'Front Desk',
      'new',
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    ),
    (
      'msg-003',
      'clinic-001',
      'Alicia Reed',
      'How much will my retinal surgery cost? Does my insurance cover it?',
      'patient_portal',
      'Billing',
      'medium',
      'Billing',
      'new',
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    ),
    (
      'msg-004',
      'clinic-001',
      'Priya Shah',
      'I''m bleeding a lot after my procedure. Should I be worried? What should I do?',
      'patient_portal',
      'Clinical',
      'high',
      'Clinician',
      'needs_review',
      NOW() - INTERVAL '6 hours',
      NOW() - INTERVAL '6 hours'
    ),
    (
      'msg-005',
      'clinic-001',
      'Robert Chen',
      'What do I need to do to prepare for my appointment next week?',
      'patient_portal',
      'General',
      'low',
      'Front Desk',
      'new',
      NOW() - INTERVAL '4 hours',
      NOW() - INTERVAL '4 hours'
    )
  RETURNING id, patient_name, category, risk_level
)
SELECT 'Message created:', patient_name || ' - ' || category || ' (' || risk_level || ')' FROM messages_insert;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Knowledge Sources
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM clinic_knowledge_sources WHERE clinic_id = 'clinic-001';

WITH knowledge_insert AS (
  INSERT INTO clinic_knowledge_sources (
    id,
    clinic_id,
    title,
    category,
    content,
    active,
    created_at,
    updated_at
  ) VALUES
    (
      'ks-001',
      'clinic-001',
      'Post-Injection Escalation Policy',
      'Clinical',
      'For any patient reporting pain, vision changes, or unusual symptoms within 48 hours of injection: immediately escalate to Dr. Sarah Lee. Do not reassure or delay.',
      TRUE,
      NOW(),
      NOW()
    ),
    (
      'ks-002',
      'clinic-001',
      'Procedure Prep Instructions',
      'Clinical',
      'Patients should avoid food/drink 4 hours before procedure. Bring a valid ID and insurance card. Arrange for someone to drive home. Avoid strenuous activity for 7 days post-procedure.',
      TRUE,
      NOW(),
      NOW()
    ),
    (
      'ks-003',
      'clinic-001',
      'Billing FAQ',
      'Billing',
      'Routine retinal exams: covered by most insurance. Injections: usually covered with copay ($150-$300 per injection). Surgery: requires pre-auth. We file claims directly. Uninsured patients qualify for 10% discount.',
      TRUE,
      NOW(),
      NOW()
    ),
    (
      'ks-004',
      'clinic-001',
      'Clinic Hours & Location',
      'General',
      'Ann Arbor Retina Clinic, 123 Medical Plaza Drive, Ann Arbor, MI 48103. Phone: (734) 555-0142. Hours: M-F 8am-5pm, Sat 9am-1pm. Closed Sundays and major holidays.',
      TRUE,
      NOW(),
      NOW()
    ),
    (
      'ks-005',
      'clinic-001',
      'Insurance Document Policy',
      'Billing',
      'We accept most major insurance plans. For out-of-network claims, we provide itemized receipts for patient reimbursement. Prior authorization required for surgery and certain procedures.',
      TRUE,
      NOW(),
      NOW()
    )
  RETURNING id, title, category
)
SELECT 'Knowledge source created:', title || ' (' || category || ')' FROM knowledge_insert;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Tasks (connected to staff, patient messages, and clinic)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM tasks WHERE clinic_id = 'clinic-001';

WITH tasks_insert AS (
  INSERT INTO tasks (
    id,
    clinic_id,
    source_message_id,
    title,
    description,
    assigned_to,
    assigned_role,
    priority,
    status,
    ai_created,
    due_at,
    created_at,
    updated_at
  ) VALUES
    (
      'task-001',
      'clinic-001',
      'msg-001',
      'Review Clinical message from Maya Thompson',
      'Patient reports post-injection pain and vision changes. Urgent review needed.',
      'staff-001',
      'Clinician',
      'urgent',
      'pending_approval',
      TRUE,
      NOW() + INTERVAL '2 hours',
      NOW() - INTERVAL '1 day 20 hours',
      NOW() - INTERVAL '1 day 20 hours'
    ),
    (
      'task-002',
      'clinic-001',
      'msg-002',
      'Review Scheduling message from Daniel Brooks',
      'Patient requests to move Tuesday appointment to Wednesday.',
      'staff-002',
      'Front Desk',
      'low',
      'pending_approval',
      TRUE,
      NOW() + INTERVAL '1 day',
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    ),
    (
      'task-003',
      'clinic-001',
      'msg-003',
      'Review Billing message from Alicia Reed',
      'Patient asking about surgery cost and insurance coverage.',
      'staff-003',
      'Billing',
      'medium',
      'pending_approval',
      TRUE,
      NOW() + INTERVAL '1 day 12 hours',
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    ),
    (
      'task-004',
      'clinic-001',
      'msg-004',
      'URGENT: Review Clinical message from Priya Shah',
      'Patient reports significant bleeding post-procedure. Requires immediate clinical assessment.',
      'staff-001',
      'Clinician',
      'urgent',
      'pending_approval',
      TRUE,
      NOW() + INTERVAL '1 hour',
      NOW() - INTERVAL '6 hours',
      NOW() - INTERVAL '6 hours'
    ),
    (
      'task-005',
      'clinic-001',
      'msg-005',
      'Review General message from Robert Chen',
      'Patient asking for pre-appointment prep instructions.',
      'staff-002',
      'Front Desk',
      'low',
      'pending_approval',
      TRUE,
      NOW() + INTERVAL '2 days',
      NOW() - INTERVAL '4 hours',
      NOW() - INTERVAL '4 hours'
    )
  RETURNING id, title, priority, status
)
SELECT 'Task created:', title || ' (' || priority || ')' FROM tasks_insert;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed complete
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'Seed data loaded successfully.' AS status;
