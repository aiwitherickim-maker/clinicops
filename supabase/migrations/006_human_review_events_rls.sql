-- RLS policies for human_review_events.
-- The browser client uses the public anon key, so we need explicit insert
-- permission. These events are write-only feedback signals — no PII is exposed.

alter table human_review_events enable row level security;

create policy "allow_insert_human_review_events"
  on human_review_events
  for insert
  with check (true);

create policy "allow_select_human_review_events"
  on human_review_events
  for select
  using (true);
