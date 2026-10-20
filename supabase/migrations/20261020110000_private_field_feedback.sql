-- Private, structured pilot feedback. No public read policy is created.
create table if not exists public.nexorawildfire_field_feedback (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('farmer','beekeeper','forestry','researcher','resident','other')),
  region text not null check (char_length(region) between 2 and 80),
  category text not null check (category in ('data_quality','alert_quality','usability','missing_feature','other')),
  usefulness integer not null check (usefulness between 1 and 5),
  scenario text not null check (char_length(scenario) between 10 and 1000),
  observed text not null default '' check (char_length(observed) <= 1500),
  expected text not null default '' check (char_length(expected) <= 1500),
  created_at timestamptz not null default now()
);

alter table public.nexorawildfire_field_feedback enable row level security;
revoke all on table public.nexorawildfire_field_feedback from anon, authenticated;
grant all on table public.nexorawildfire_field_feedback to service_role;
create index if not exists nexorawildfire_field_feedback_created_idx
  on public.nexorawildfire_field_feedback(created_at desc);
