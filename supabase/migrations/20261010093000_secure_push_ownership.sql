-- Bind every push endpoint to the account that enrolled it.
alter table public.nexorawildfire_push_subscriptions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Unowned legacy subscriptions cannot safely be attributed to a user.
delete from public.nexorawildfire_push_subscriptions where user_id is null;
alter table public.nexorawildfire_push_subscriptions alter column user_id set not null;
create index if not exists nexorawildfire_push_user_idx
  on public.nexorawildfire_push_subscriptions(user_id,updated_at desc);

alter table public.nexorawildfire_push_subscriptions enable row level security;
drop policy if exists push_subscriptions_select_own on public.nexorawildfire_push_subscriptions;
create policy push_subscriptions_select_own on public.nexorawildfire_push_subscriptions
for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists push_subscriptions_insert_own on public.nexorawildfire_push_subscriptions;
create policy push_subscriptions_insert_own on public.nexorawildfire_push_subscriptions
for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists push_subscriptions_update_own on public.nexorawildfire_push_subscriptions;
create policy push_subscriptions_update_own on public.nexorawildfire_push_subscriptions
for update to authenticated using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);
drop policy if exists push_subscriptions_delete_own on public.nexorawildfire_push_subscriptions;
create policy push_subscriptions_delete_own on public.nexorawildfire_push_subscriptions
for delete to authenticated using ((select auth.uid())=user_id);

grant select, insert, update, delete on public.nexorawildfire_push_subscriptions to authenticated;
