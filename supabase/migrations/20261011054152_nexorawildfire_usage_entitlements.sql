create table if not exists public.nexorawildfire_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('ndvi_timeseries', 'risk_raster', 'enterprise_report')),
  credits integer not null default 1 check (credits > 0 and credits <= 100),
  request_id text,
  created_at timestamptz not null default now()
);
create index if not exists nexorawildfire_usage_events_user_month_idx
  on public.nexorawildfire_usage_events (user_id, created_at desc);
alter table public.nexorawildfire_usage_events enable row level security;
drop policy if exists "Users read own usage events" on public.nexorawildfire_usage_events;
create policy "Users read own usage events"
  on public.nexorawildfire_usage_events for select to authenticated
  using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.nexorawildfire_usage_events from anon, authenticated;
grant select on public.nexorawildfire_usage_events to authenticated;
grant all on public.nexorawildfire_usage_events to service_role;

create or replace function public.protect_profile_entitlements()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user <> 'service_role' and (select auth.uid()) is not null then
    new.plan := old.plan;
    new.tokens := old.tokens;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_entitlements_trigger on public.profiles;
create trigger protect_profile_entitlements_trigger
before update on public.profiles
for each row execute function public.protect_profile_entitlements();
