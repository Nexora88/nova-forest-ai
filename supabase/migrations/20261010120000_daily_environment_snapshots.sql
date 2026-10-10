-- Persistent daily environmental history for user-owned saved areas.
-- Apply this migration in Supabase SQL Editor or with the Supabase CLI.
create table if not exists public.nexorawildfire_daily_snapshots (
  id bigint generated always as identity primary key,
  area_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  area_name text not null,
  snapshot_date date not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  temperature_c double precision,
  relative_humidity_pct double precision,
  wind_speed_kmh double precision,
  precipitation_mm double precision,
  soil_moisture double precision,
  vpd_kpa double precision,
  et0_mm double precision,
  rule_based_indicator integer check (rule_based_indicator between 0 and 100),
  data_source text not null default 'Open-Meteo',
  created_at timestamptz not null default now(),
  unique (area_id, snapshot_date)
);

create index if not exists idx_nexora_snapshots_user_date
  on public.nexorawildfire_daily_snapshots (user_id, snapshot_date desc);
create index if not exists idx_nexora_snapshots_area_date
  on public.nexorawildfire_daily_snapshots (area_id, snapshot_date desc);

alter table public.nexorawildfire_daily_snapshots enable row level security;
drop policy if exists "Users can read their own daily snapshots" on public.nexorawildfire_daily_snapshots;
create policy "Users can read their own daily snapshots"
  on public.nexorawildfire_daily_snapshots
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- No client INSERT/UPDATE policy is intentional: the scheduled backend job uses
-- the server-only service-role key. Never expose that key in browser code.
revoke insert, update, delete on public.nexorawildfire_daily_snapshots from anon, authenticated;
grant select on public.nexorawildfire_daily_snapshots to authenticated;
