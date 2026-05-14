-- Migration: backoffice tables for billing and prior auth workflows
-- Run this in the Supabase SQL Editor after schema.sql has been applied.
-- Safe to run multiple times (IF NOT EXISTS throughout).

-- ── Patients ──────────────────────────────────────────────────────────────────
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Appointments ──────────────────────────────────────────────────────────────
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  appointment_date timestamptz not null,
  appointment_type text,
  provider_name text,
  status text default 'scheduled',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Insurance Profiles ────────────────────────────────────────────────────────
create table if not exists insurance_profiles (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  payer_name text not null,
  plan_name text,
  member_id text,
  eligibility_status text default 'unknown',
  benefits_status text default 'not_verified',
  benefits_verified_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Procedures ────────────────────────────────────────────────────────────────
create table if not exists procedures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  procedure_name text not null,
  cpt_code text,
  diagnosis_code text,
  requires_prior_auth boolean default false,
  status text default 'planned',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Prior Authorizations ──────────────────────────────────────────────────────
create table if not exists prior_authorizations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  procedure_id uuid references procedures(id) on delete cascade,
  insurance_profile_id uuid references insurance_profiles(id) on delete set null,
  payer_name text,
  status text default 'not_started',
  auth_number text,
  submitted_at timestamptz,
  approved_at timestamptz,
  expires_at timestamptz,
  missing_items jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Billing Cases ─────────────────────────────────────────────────────────────
create table if not exists billing_cases (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  procedure_id uuid references procedures(id) on delete set null,
  insurance_profile_id uuid references insurance_profiles(id) on delete set null,
  prior_auth_id uuid references prior_authorizations(id) on delete set null,
  status text default 'needs_review',
  benefits_status text default 'not_verified',
  financial_clearance_status text default 'not_cleared',
  estimated_patient_responsibility numeric,
  estimated_allowed_amount numeric,
  estimated_reimbursement numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Backoffice Commands ───────────────────────────────────────────────────────
-- Commands are immutable records — no updated_at column.
create table if not exists backoffice_commands (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  command_text text not null,
  command_type text,
  result jsonb,
  created_at timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_patients_clinic_id
  on patients(clinic_id);

create index if not exists idx_appointments_clinic_id
  on appointments(clinic_id);
create index if not exists idx_appointments_patient_id
  on appointments(patient_id);
create index if not exists idx_appointments_appointment_date
  on appointments(appointment_date);

create index if not exists idx_insurance_profiles_patient_id
  on insurance_profiles(patient_id);

create index if not exists idx_procedures_patient_id
  on procedures(patient_id);
create index if not exists idx_procedures_appointment_id
  on procedures(appointment_id);

create index if not exists idx_prior_authorizations_patient_id
  on prior_authorizations(patient_id);
create index if not exists idx_prior_authorizations_procedure_id
  on prior_authorizations(procedure_id);
create index if not exists idx_prior_authorizations_status
  on prior_authorizations(status);

create index if not exists idx_billing_cases_patient_id
  on billing_cases(patient_id);
create index if not exists idx_billing_cases_status
  on billing_cases(status);
create index if not exists idx_billing_cases_clinic_id
  on billing_cases(clinic_id);

create index if not exists idx_backoffice_commands_clinic_id
  on backoffice_commands(clinic_id);

-- ── Updated_at triggers ───────────────────────────────────────────────────────
-- Reuses the update_updated_at() function defined in schema.sql.

create trigger set_updated_at_patients
  before update on patients
  for each row execute function update_updated_at();

create trigger set_updated_at_appointments
  before update on appointments
  for each row execute function update_updated_at();

create trigger set_updated_at_insurance_profiles
  before update on insurance_profiles
  for each row execute function update_updated_at();

create trigger set_updated_at_procedures
  before update on procedures
  for each row execute function update_updated_at();

create trigger set_updated_at_prior_authorizations
  before update on prior_authorizations
  for each row execute function update_updated_at();

create trigger set_updated_at_billing_cases
  before update on billing_cases
  for each row execute function update_updated_at();
