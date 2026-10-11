-- Persistent daily environmental history for authenticated NexoraWildfire users.
create table if not exists public.nexorawildfire_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid not null references public.nexorawildfire_areas(id) on delete cascade,
  area_name text not null,
  snapshot_date date not null,
  captured_at timestamptz not null default now(),
  provider text not null default 'open-meteo',
  temperature_c double precision,
  relative_humidity_pct double precision,
  wind_speed_kmh double precision,
  precipitation_mm double precision,
  soil_moisture_m3m3 double precision,
  vapor_pressure_deficit_kpa double precision,
  et0_mm double precision,
  environmental_indicator integer not null default 0 check (environmental_indicator between 0 and 100),
  indicator_method text not null default 'transparent_rule_based',
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (area_id, snapshot_date)
);
create index if not exists nxwf_daily_snapshots_user_date_idx on public.nexorawildfire_daily_snapshots(user_id, snapshot_date desc);
create index if not exists nxwf_daily_snapshots_area_date_idx on public.nexorawildfire_daily_snapshots(area_id, snapshot_date desc);
alter table public.nexorawildfire_daily_snapshots enable row level security;
revoke all on public.nexorawildfire_daily_snapshots from anon;
revoke insert, update, delete on public.nexorawildfire_daily_snapshots from authenticated;
grant select on public.nexorawildfire_daily_snapshots to authenticated;
drop policy if exists "Users read own environmental history" on public.nexorawildfire_daily_snapshots;
create policy "Users read own environmental history" on public.nexorawildfire_daily_snapshots
for select to authenticated using ((select auth.uid()) = user_id);
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'nexorawildfire_daily_snapshots') then
    alter publication supabase_realtime add table public.nexorawildfire_daily_snapshots;
  end if;
end $$;
