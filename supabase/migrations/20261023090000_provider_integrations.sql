-- Provider-backed billing and verified message destinations. Server credentials only.
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create table if not exists public.nexorawildfire_verified_phones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, phone)
);

create table if not exists public.nexorawildfire_message_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  channel text not null check (channel in ('sms','whatsapp')),
  area_name text not null,
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  threshold integer not null default 70 check (threshold between 25 and 100),
  enabled boolean not null default true,
  last_risk integer,
  last_alert_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, channel, area_name)
);

alter table public.nexorawildfire_verified_phones enable row level security;
alter table public.nexorawildfire_message_subscriptions enable row level security;
revoke all on public.nexorawildfire_verified_phones from anon, authenticated;
revoke all on public.nexorawildfire_message_subscriptions from anon, authenticated;
grant all on public.nexorawildfire_verified_phones to service_role;
grant all on public.nexorawildfire_message_subscriptions to service_role;
