-- Server-owned opt-in channels and billing state. Apply through Supabase migrations.
create table if not exists public.nexora_notification_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('sms','whatsapp')),
  phone_e164 text not null,
  area_name text not null check (char_length(area_name) between 1 and 120),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  threshold integer not null default 70 check (threshold between 25 and 100),
  consent_at timestamptz not null,
  verification_code_hash text,
  verification_expires_at timestamptz,
  verified_at timestamptz,
  enabled boolean not null default false,
  last_alert_at timestamptz,
  last_risk integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, channel, phone_e164)
);
alter table public.nexora_notification_channels enable row level security;
drop policy if exists "Users can read their notification channels" on public.nexora_notification_channels;
create policy "Users can read their notification channels"
  on public.nexora_notification_channels for select
  using (auth.uid() = user_id);
drop policy if exists "Users can delete their notification channels" on public.nexora_notification_channels;
create policy "Users can delete their notification channels"
  on public.nexora_notification_channels for delete
  using (auth.uid() = user_id);
create index if not exists nexora_notification_channels_active_idx
  on public.nexora_notification_channels(enabled, verified_at, last_alert_at);

create table if not exists public.nexora_billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  price_id text,
  current_period_end bigint,
  plan text not null default 'free' check (plan in ('free','pro','enterprise')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.nexora_billing_subscriptions enable row level security;
drop policy if exists "Users can read their billing subscription" on public.nexora_billing_subscriptions;
create policy "Users can read their billing subscription"
  on public.nexora_billing_subscriptions for select
  using (auth.uid() = user_id);
create index if not exists nexora_billing_subscriptions_status_idx
  on public.nexora_billing_subscriptions(status, plan);

-- Only backend service-role requests may insert/update these tables. No client write policy is granted.
