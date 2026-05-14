-- ClinicOps Chat Agent — Supabase Schema
-- Run this in the Supabase SQL Editor

create extension if not exists "pgcrypto";

-- ── Clinics ──────────────────────────────────────────────────────────────────
create table if not exists clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  assistant_name text,
  tone text,
  created_at timestamptz default now()
);

-- ── Staff ─────────────────────────────────────────────────────────────────────
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  name text not null,
  role text not null,
  email text,
  created_at timestamptz default now()
);

-- ── Patient Messages ─────────────────────────────────────────────────────────
create table if not exists patient_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_name text not null,
  message_text text not null,
  channel text default 'simulator',
  category text,
  risk_level text,
  route_to text,
  status text default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Agent Analyses ───────────────────────────────────────────────────────────
create table if not exists agent_analyses (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references patient_messages(id) on delete cascade,
  intent jsonb,
  safety jsonb,
  knowledge jsonb,
  actions jsonb,
  draft jsonb,
  validation jsonb,
  final_status text,
  created_at timestamptz default now()
);

-- ── Draft Responses ──────────────────────────────────────────────────────────
create table if not exists draft_responses (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references patient_messages(id) on delete cascade,
  analysis_id uuid references agent_analyses(id) on delete set null,
  draft_text text not null,
  draft_type text default 'staff_followup_draft',  -- 'immediate_patient_response' | 'staff_followup_draft'
  status text default 'needs_review',
  edited_text text,
  approved_by uuid references staff(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Tasks ─────────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  source_message_id uuid references patient_messages(id) on delete set null,
  title text not null,
  description text,
  assigned_to uuid references staff(id) on delete set null,
  assigned_role text,
  priority text default 'medium',
  status text default 'open',
  ai_created boolean default false,
  due_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Clinic Knowledge Sources ─────────────────────────────────────────────────
create table if not exists clinic_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  title text not null,
  category text,
  content text not null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_patient_messages_clinic_id on patient_messages(clinic_id);
create index if not exists idx_patient_messages_status on patient_messages(status);
create index if not exists idx_tasks_clinic_id on tasks(clinic_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_agent_analyses_message_id on agent_analyses(message_id);
create index if not exists idx_draft_responses_message_id on draft_responses(message_id);

-- ── Updated_at trigger ───────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_patient_messages
  before update on patient_messages
  for each row execute function update_updated_at();

create trigger set_updated_at_draft_responses
  before update on draft_responses
  for each row execute function update_updated_at();

create trigger set_updated_at_tasks
  before update on tasks
  for each row execute function update_updated_at();

create trigger set_updated_at_clinic_knowledge_sources
  before update on clinic_knowledge_sources
  for each row execute function update_updated_at();
