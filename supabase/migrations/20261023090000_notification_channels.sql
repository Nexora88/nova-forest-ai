create table if not exists public.nexorawildfire_notification_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  channel text not null check (channel in ('sms','whatsapp')),
  area_name text not null check (char_length(area_name) between 1 and 120),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  threshold integer not null default 70 check (threshold between 25 and 100),
  consent boolean not null default false,
  enabled boolean not null default false,
  last_risk integer,
  last_alert_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, channel, area_name)
);
create index if not exists nexorawildfire_notification_channels_active_idx
  on public.nexorawildfire_notification_channels (enabled, consent, last_alert_at);
alter table public.nexorawildfire_notification_channels enable row level security;
drop policy if exists "Users manage own notification channels" on public.nexorawildfire_notification_channels;
create policy "Users manage own notification channels"
  on public.nexorawildfire_notification_channels for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.nexorawildfire_notification_channels from anon;
grant select, insert, update, delete on public.nexorawildfire_notification_channels to authenticated;
grant all on public.nexorawildfire_notification_channels to service_role;
