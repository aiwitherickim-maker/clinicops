-- Migration: backoffice_drafts table
-- Run in Supabase SQL Editor after 002_backoffice_tables.sql has been applied.
-- Safe to run multiple times (IF NOT EXISTS throughout).

create table if not exists backoffice_drafts (
  id                   uuid primary key default gen_random_uuid(),
  clinic_id            uuid references clinics(id) on delete cascade,
  patient_id           uuid references patients(id) on delete set null,
  appointment_id       uuid references appointments(id) on delete set null,
  procedure_id         uuid references procedures(id) on delete set null,
  prior_auth_id        uuid references prior_authorizations(id) on delete set null,
  billing_case_id      uuid references billing_cases(id) on delete set null,
  task_id              uuid references tasks(id) on delete set null,
  command_id           uuid references backoffice_commands(id) on delete set null,
  draft_type           text not null,
  title                text not null,
  content              text not null,
  intended_audience    text default 'internal',
  intended_sender_role text,
  status               text default 'ready_for_review',
  created_by_agent     boolean default true,
  metadata             jsonb default '{}'::jsonb,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists idx_backoffice_drafts_clinic_id  on backoffice_drafts(clinic_id);
create index if not exists idx_backoffice_drafts_patient_id on backoffice_drafts(patient_id);
create index if not exists idx_backoffice_drafts_draft_type on backoffice_drafts(draft_type);
create index if not exists idx_backoffice_drafts_status     on backoffice_drafts(status);
create index if not exists idx_backoffice_drafts_created_at on backoffice_drafts(created_at desc);

create or replace function update_backoffice_drafts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_backoffice_drafts_updated_at on backoffice_drafts;
create trigger trg_backoffice_drafts_updated_at
  before update on backoffice_drafts
  for each row execute function update_backoffice_drafts_updated_at();
