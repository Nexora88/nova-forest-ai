create table if not exists public.nexorawildfire_alert_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('sms','whatsapp')),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  area_name text not null check (char_length(area_name) between 1 and 120),
  threshold integer not null default 70 check (threshold between 25 and 100),
  enabled boolean not null default true,
  consent_at timestamptz not null,
  last_risk integer,
  last_alert_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, channel, phone_e164, area_name)
);
create index if not exists idx_nova_alert_contacts_enabled on public.nexorawildfire_alert_contacts(enabled, last_alert_at);
alter table public.nexorawildfire_alert_contacts enable row level security;
drop policy if exists "Users manage own opted-in alert contacts" on public.nexorawildfire_alert_contacts;
create policy "Users manage own opted-in alert contacts" on public.nexorawildfire_alert_contacts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.nexorawildfire_alert_contacts to authenticated;
