-- human_review_events: feedback loop from staff actions on AI-generated content.
-- Each row captures what a staff member did to an AI draft/route/risk decision.

create table if not exists human_review_events (
  id                  uuid        primary key default gen_random_uuid(),
  clinic_id           uuid        references clinics(id) on delete cascade,
  message_id          uuid        references patient_messages(id) on delete set null,
  draft_id            uuid        references draft_responses(id) on delete set null,
  task_id             uuid        references tasks(id) on delete set null,
  staff_id            uuid        references staff(id) on delete set null,
  event_type          text        not null,          -- approved | edited | reassigned | escalated | resolved
  original_ai_text    text,
  final_text          text,
  diff                jsonb       default '{}'::jsonb,
  original_route      text,
  final_route         text,
  original_risk_level text,
  final_risk_level    text,
  feedback_tags       jsonb       default '[]'::jsonb,
  staff_note          text,
  metadata            jsonb       default '{}'::jsonb,
  created_at          timestamptz default now()
);

create index if not exists hre_clinic_id   on human_review_events(clinic_id);
create index if not exists hre_message_id  on human_review_events(message_id);
create index if not exists hre_draft_id    on human_review_events(draft_id);
create index if not exists hre_task_id     on human_review_events(task_id);
create index if not exists hre_event_type  on human_review_events(event_type);
create index if not exists hre_created_at  on human_review_events(created_at);
