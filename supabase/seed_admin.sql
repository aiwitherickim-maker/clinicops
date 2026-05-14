-- ClinicOps — Admin / Backoffice Seed Data
-- Idempotent: DELETE then INSERT using fixed UUIDs.
-- Depends on seed.sql having been run first (clinic, staff rows must exist).
--
-- UUID scheme:
--   patients:             f0000000-0000-0000-0000-00000000000{1-5}
--   appointments:         g0000000-0000-0000-0000-00000000000{1-5}
--   insurance_profiles:   h0000000-0000-0000-0000-00000000000{1-5}
--   procedures:           i0000000-0000-0000-0000-00000000000{1-5}
--   prior_authorizations: j0000000-0000-0000-0000-00000000000{1-3}
--   billing_cases:        k0000000-0000-0000-0000-00000000000{1-5}

-- ─────────────────────────────────────────────────────────────────────────────
-- Teardown — delete in reverse dependency order
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM billing_cases
  WHERE id IN (
    'k0000000-0000-0000-0000-000000000001',
    'k0000000-0000-0000-0000-000000000002',
    'k0000000-0000-0000-0000-000000000003',
    'k0000000-0000-0000-0000-000000000004',
    'k0000000-0000-0000-0000-000000000005'
  );

DELETE FROM prior_authorizations
  WHERE id IN (
    'j0000000-0000-0000-0000-000000000001',
    'j0000000-0000-0000-0000-000000000002',
    'j0000000-0000-0000-0000-000000000003'
  );

DELETE FROM procedures
  WHERE id IN (
    'i0000000-0000-0000-0000-000000000001',
    'i0000000-0000-0000-0000-000000000002',
    'i0000000-0000-0000-0000-000000000003',
    'i0000000-0000-0000-0000-000000000004',
    'i0000000-0000-0000-0000-000000000005'
  );

DELETE FROM insurance_profiles
  WHERE id IN (
    'h0000000-0000-0000-0000-000000000001',
    'h0000000-0000-0000-0000-000000000002',
    'h0000000-0000-0000-0000-000000000003',
    'h0000000-0000-0000-0000-000000000004',
    'h0000000-0000-0000-0000-000000000005'
  );

DELETE FROM appointments
  WHERE id IN (
    'g0000000-0000-0000-0000-000000000001',
    'g0000000-0000-0000-0000-000000000002',
    'g0000000-0000-0000-0000-000000000003',
    'g0000000-0000-0000-0000-000000000004',
    'g0000000-0000-0000-0000-000000000005'
  );

DELETE FROM patients
  WHERE id IN (
    'f0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000004',
    'f0000000-0000-0000-0000-000000000005'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Patients
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO patients (id, clinic_id, full_name, date_of_birth, phone, email, created_at, updated_at)
VALUES
  -- f1: Maya Thompson — recent injection, clinical issue
  (
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Maya Thompson',
    '1985-09-23',
    '(734) 555-1001',
    'maya.thompson@email.local',
    NOW() - INTERVAL '6 months',
    NOW() - INTERVAL '6 months'
  ),
  -- f2: Daniel Brooks — routine follow-up, rescheduling
  (
    'f0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Daniel Brooks',
    '1962-11-08',
    '(734) 555-1002',
    NULL,
    NOW() - INTERVAL '1 year',
    NOW() - INTERVAL '1 year'
  ),
  -- f3: Alicia Reed — KEY BILLING DEMO CASE, surgery in 5 days
  (
    'f0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Alicia Reed',
    '1978-04-12',
    '(734) 555-1003',
    'alicia.reed@email.local',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '3 months'
  ),
  -- f4: Priya Shah — post-procedure complication, urgent
  (
    'f0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Priya Shah',
    '1990-07-15',
    '(734) 555-1004',
    NULL,
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '4 months'
  ),
  -- f5: Robert Chen — prep question, low risk, Medicare
  (
    'f0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'Robert Chen',
    '1955-03-30',
    '(734) 555-1005',
    NULL,
    NOW() - INTERVAL '2 years',
    NOW() - INTERVAL '2 years'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Appointments
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO appointments (id, clinic_id, patient_id, appointment_date, appointment_type, provider_name, status, created_at, updated_at)
VALUES
  -- g1: Maya Thompson — completed injection 2 days ago
  (
    'g0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '2 days',
    'Intravitreal Injection',
    'Dr. Sarah Lee',
    'completed',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  -- g2: Daniel Brooks — routine exam in 6 days
  (
    'g0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000002',
    NOW() + INTERVAL '6 days',
    'Routine Retinal Exam',
    'Dr. Sarah Lee',
    'scheduled',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  -- g3: Alicia Reed — retinal detachment repair surgery in 5 days
  (
    'g0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000003',
    NOW() + INTERVAL '5 days',
    'Retinal Detachment Repair Surgery',
    'Dr. Sarah Lee',
    'scheduled',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  -- g4: Priya Shah — laser photocoagulation completed 6 hours ago
  (
    'g0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000004',
    NOW() - INTERVAL '6 hours',
    'Laser Photocoagulation',
    'Dr. Sarah Lee',
    'completed',
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours'
  ),
  -- g5: Robert Chen — OCT scan + consultation in 8 days
  (
    'g0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000005',
    NOW() + INTERVAL '8 days',
    'OCT Scan + Consultation',
    'Dr. Sarah Lee',
    'scheduled',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Insurance Profiles
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO insurance_profiles (id, clinic_id, patient_id, payer_name, plan_name, member_id, eligibility_status, benefits_status, benefits_verified_at, notes, created_at, updated_at)
VALUES
  -- h1: Maya Thompson — Aetna HMO, verified
  (
    'h0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'Aetna HMO',
    NULL,
    'AET-22019',
    'active',
    'verified',
    NOW() - INTERVAL '2 days',
    NULL,
    NOW() - INTERVAL '6 months',
    NOW() - INTERVAL '2 days'
  ),
  -- h2: Daniel Brooks — UnitedHealthcare PPO, verified
  (
    'h0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000002',
    'UnitedHealthcare PPO',
    NULL,
    'UHC-55782',
    'active',
    'verified',
    NOW() - INTERVAL '7 days',
    NULL,
    NOW() - INTERVAL '1 year',
    NOW() - INTERVAL '7 days'
  ),
  -- h3: Alicia Reed — Blue Cross Blue Shield PPO, NOT VERIFIED (key demo case)
  (
    'h0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000003',
    'Blue Cross Blue Shield',
    'Blue Care Network',
    'BCN-88421',
    'active',
    'not_verified',
    NULL,
    'Benefits verification pending. Surgery scheduled in 5 days — urgent.',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '1 day'
  ),
  -- h4: Priya Shah — Blue Shield of California PPO, verified
  (
    'h0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000004',
    'Blue Shield of California',
    'Blue Shield PPO',
    'BSC-33190',
    'active',
    'verified',
    NOW() - INTERVAL '3 weeks',
    NULL,
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '3 weeks'
  ),
  -- h5: Robert Chen — Medicare Part B, verified
  (
    'h0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000005',
    'Medicare Part B',
    NULL,
    'MED-CHEN-1955',
    'active',
    'verified',
    NOW() - INTERVAL '14 days',
    'Medicare covers 80% after deductible.',
    NOW() - INTERVAL '2 years',
    NOW() - INTERVAL '14 days'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Procedures
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO procedures (id, clinic_id, patient_id, appointment_id, procedure_name, cpt_code, diagnosis_code, requires_prior_auth, status, created_at, updated_at)
VALUES
  -- i1: Maya Thompson — intravitreal injection (completed, no PA)
  (
    'i0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'g0000000-0000-0000-0000-000000000001',
    'Intravitreal Injection (Anti-VEGF)',
    '67028',
    'H35.31',
    FALSE,
    'completed',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  -- i2: Daniel Brooks — dilated fundus exam (planned, no PA)
  (
    'i0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000002',
    'g0000000-0000-0000-0000-000000000002',
    'Dilated Fundus Examination',
    '92228',
    NULL,
    FALSE,
    'planned',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  -- i3: Alicia Reed — retinal detachment repair (planned, PA REQUIRED — key demo case)
  (
    'i0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000003',
    'g0000000-0000-0000-0000-000000000003',
    'Retinal Detachment Repair',
    '67108',
    'H33.001',
    TRUE,
    'planned',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  -- i4: Priya Shah — laser photocoagulation (completed, PA was required and approved)
  (
    'i0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000004',
    'g0000000-0000-0000-0000-000000000004',
    'Laser Photocoagulation',
    '67228',
    'H35.02',
    TRUE,
    'completed',
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours'
  ),
  -- i5: Robert Chen — OCT scan (planned, no PA)
  (
    'i0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000005',
    'g0000000-0000-0000-0000-000000000005',
    'Optical Coherence Tomography',
    '92134',
    NULL,
    FALSE,
    'planned',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Prior Authorizations
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO prior_authorizations (id, clinic_id, patient_id, procedure_id, insurance_profile_id, payer_name, status, auth_number, submitted_at, approved_at, expires_at, missing_items, notes, created_at, updated_at)
VALUES
  -- j1: Alicia Reed — NOT STARTED, multiple missing items (key demo case)
  (
    'j0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000003',
    'i0000000-0000-0000-0000-000000000003',
    'h0000000-0000-0000-0000-000000000003',
    'Blue Cross Blue Shield',
    'not_started',
    NULL,
    NULL,
    NULL,
    NULL,
    '["Medical records from referring physician","Clinical notes documenting medical necessity","OCT imaging results","Failed conservative treatment documentation"]'::jsonb,
    'Surgery in 5 days. PA not started. Must be submitted immediately.',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  -- j2: Priya Shah — APPROVED, auth on file
  (
    'j0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000004',
    'i0000000-0000-0000-0000-000000000004',
    'h0000000-0000-0000-0000-000000000004',
    'Blue Shield of California',
    'approved',
    'PA-2024-77341',
    NOW() - INTERVAL '3 weeks',
    NOW() - INTERVAL '2 weeks',
    NOW() + INTERVAL '6 months',
    '[]'::jsonb,
    NULL,
    NOW() - INTERVAL '3 weeks',
    NOW() - INTERVAL '2 weeks'
  ),
  -- j3: Robert Chen — NOT REQUIRED (Medicare covers OCT)
  (
    'j0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000005',
    'i0000000-0000-0000-0000-000000000005',
    'h0000000-0000-0000-0000-000000000005',
    'Medicare Part B',
    'not_required',
    NULL,
    NULL,
    NULL,
    NULL,
    '[]'::jsonb,
    'Medicare Part B covers OCT without prior authorization.',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Billing Cases
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO billing_cases (id, clinic_id, patient_id, appointment_id, procedure_id, insurance_profile_id, prior_auth_id, status, benefits_status, financial_clearance_status, estimated_patient_responsibility, estimated_allowed_amount, estimated_reimbursement, notes, created_at, updated_at)
VALUES
  -- k1: Maya Thompson — billing cleared, hold for clinical resolution
  (
    'k0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'g0000000-0000-0000-0000-000000000001',
    'i0000000-0000-0000-0000-000000000001',
    'h0000000-0000-0000-0000-000000000001',
    NULL,
    'needs_review',
    'verified',
    'cleared',
    150.00,
    NULL,
    NULL,
    'Post-injection clinical issue flagged. Billing cleared but hold for clinical resolution.',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  -- k2: Daniel Brooks — fully cleared
  (
    'k0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000002',
    'g0000000-0000-0000-0000-000000000002',
    'i0000000-0000-0000-0000-000000000002',
    'h0000000-0000-0000-0000-000000000002',
    NULL,
    'cleared',
    'verified',
    'cleared',
    40.00,
    NULL,
    NULL,
    NULL,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  -- k3: Alicia Reed — BLOCKED, key demo case, surgery in 5 days
  (
    'k0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000003',
    'g0000000-0000-0000-0000-000000000003',
    'i0000000-0000-0000-0000-000000000003',
    'h0000000-0000-0000-0000-000000000003',
    'j0000000-0000-0000-0000-000000000001',
    'blocked',
    'not_verified',
    'not_cleared',
    3200.00,
    18500.00,
    15300.00,
    'Surgery scheduled in 5 days. Benefits not verified. Prior auth not started. Patient asked about cost — needs immediate billing review.',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  -- k4: Priya Shah — needs review, post-procedure complication
  (
    'k0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000004',
    'g0000000-0000-0000-0000-000000000004',
    'i0000000-0000-0000-0000-000000000004',
    'h0000000-0000-0000-0000-000000000004',
    'j0000000-0000-0000-0000-000000000002',
    'needs_review',
    'verified',
    'cleared',
    200.00,
    NULL,
    NULL,
    'Post-procedure complication. Clinical team alerted. Billing hold pending resolution.',
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours'
  ),
  -- k5: Robert Chen — fully cleared, Medicare covers 80%
  (
    'k0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000005',
    'g0000000-0000-0000-0000-000000000005',
    'i0000000-0000-0000-0000-000000000005',
    'h0000000-0000-0000-0000-000000000005',
    'j0000000-0000-0000-0000-000000000003',
    'cleared',
    'verified',
    'cleared',
    0.00,
    NULL,
    NULL,
    'Medicare covers 80%. No PA required.',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );

SELECT 'Admin seed data loaded successfully.' AS status;
