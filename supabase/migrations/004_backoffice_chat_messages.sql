-- Migration: backoffice_chat_messages table
-- Run in Supabase SQL Editor after 003_backoffice_drafts.sql has been applied.
-- Safe to run multiple times (IF NOT EXISTS throughout).

create table if not exists backoffice_chat_messages (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid references clinics(id) on delete cascade,
  command_id         uuid references backoffice_commands(id) on delete set null,
  staff_id           uuid references staff(id) on delete set null,
  role               text not null,                          -- 'user' | 'assistant' | 'system'
  content            text not null,
  message_type       text default 'backoffice_command',
  stage_logs         jsonb default '[]'::jsonb,
  linked_patient_id  uuid references patients(id) on delete set null,
  linked_task_ids    jsonb default '[]'::jsonb,
  linked_draft_ids   jsonb default '[]'::jsonb,
  metadata           jsonb default '{}'::jsonb,
  created_at         timestamptz default now()
);

create index if not exists idx_bcm_clinic_id         on backoffice_chat_messages(clinic_id);
create index if not exists idx_bcm_command_id        on backoffice_chat_messages(command_id);
create index if not exists idx_bcm_staff_id          on backoffice_chat_messages(staff_id);
create index if not exists idx_bcm_linked_patient_id on backoffice_chat_messages(linked_patient_id);
create index if not exists idx_bcm_created_at        on backoffice_chat_messages(created_at desc);
