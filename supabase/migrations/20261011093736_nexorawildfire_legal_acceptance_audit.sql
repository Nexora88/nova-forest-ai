create table if not exists public.nexorawildfire_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notice_version text not null,
  terms_version text not null,
  disclaimer_version text not null,
  language text not null check (language in ('tr','en')),
  accepted_at timestamptz not null,
  safety_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint nexorawildfire_legal_acceptances_unique unique (user_id, notice_version, accepted_at)
);

alter table public.nexorawildfire_legal_acceptances enable row level security;
revoke all on public.nexorawildfire_legal_acceptances from anon;
grant select, insert on public.nexorawildfire_legal_acceptances to authenticated;
revoke update, delete on public.nexorawildfire_legal_acceptances from authenticated;

drop policy if exists "Users can read their own legal acceptance records" on public.nexorawildfire_legal_acceptances;
create policy "Users can read their own legal acceptance records"
  on public.nexorawildfire_legal_acceptances
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own legal acceptance records" on public.nexorawildfire_legal_acceptances;
create policy "Users can create their own legal acceptance records"
  on public.nexorawildfire_legal_acceptances
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
