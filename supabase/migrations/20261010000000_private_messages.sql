-- Private, account-scoped direct messages for NexoraWildfire AI.
create table if not exists public.nexora_dm_directory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null,
  display_name text not null default 'Saha kullanıcısı',
  updated_at timestamptz not null default now(),
  constraint nexora_dm_handle_format check (handle ~ '^[a-z0-9_]{3,24}$')
);
create unique index if not exists nexora_dm_directory_handle_lower_uidx on public.nexora_dm_directory (lower(handle));

create table if not exists public.nexora_dm_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.nexora_dm_participants (
  conversation_id uuid not null references public.nexora_dm_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id,user_id)
);
create index if not exists nexora_dm_participants_user_idx on public.nexora_dm_participants(user_id,joined_at desc);

create table if not exists public.nexora_dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.nexora_dm_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists nexora_dm_messages_conversation_time_idx on public.nexora_dm_messages(conversation_id,created_at desc);

alter table public.nexora_dm_directory enable row level security;
alter table public.nexora_dm_conversations enable row level security;
alter table public.nexora_dm_participants enable row level security;
alter table public.nexora_dm_messages enable row level security;

drop policy if exists nexora_dm_directory_select_authenticated on public.nexora_dm_directory;
create policy nexora_dm_directory_select_authenticated on public.nexora_dm_directory
for select to authenticated using (true);
drop policy if exists nexora_dm_directory_insert_own on public.nexora_dm_directory;
create policy nexora_dm_directory_insert_own on public.nexora_dm_directory
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists nexora_dm_directory_update_own on public.nexora_dm_directory;
create policy nexora_dm_directory_update_own on public.nexora_dm_directory
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.nexora_is_dm_participant(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and exists (
    select 1 from public.nexora_dm_participants p
    where p.conversation_id = p_conversation_id and p.user_id = auth.uid()
  );
$$;
revoke all on function public.nexora_is_dm_participant(uuid) from public, anon;
grant execute on function public.nexora_is_dm_participant(uuid) to authenticated;

drop policy if exists nexora_dm_conversations_select_member on public.nexora_dm_conversations;
create policy nexora_dm_conversations_select_member on public.nexora_dm_conversations
for select to authenticated using (public.nexora_is_dm_participant(id));
drop policy if exists nexora_dm_participants_select_member on public.nexora_dm_participants;
create policy nexora_dm_participants_select_member on public.nexora_dm_participants
for select to authenticated using (public.nexora_is_dm_participant(conversation_id));
drop policy if exists nexora_dm_messages_select_member on public.nexora_dm_messages;
create policy nexora_dm_messages_select_member on public.nexora_dm_messages
for select to authenticated using (public.nexora_is_dm_participant(conversation_id));
drop policy if exists nexora_dm_messages_insert_member on public.nexora_dm_messages;
create policy nexora_dm_messages_insert_member on public.nexora_dm_messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and public.nexora_is_dm_participant(conversation_id)
  and char_length(trim(body)) between 1 and 4000
);

create or replace function public.nexora_start_dm(recipient_handle text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  sender uuid := auth.uid();
  recipient uuid;
  existing_id uuid;
  new_id uuid;
  clean_handle text := lower(trim(coalesce(recipient_handle,'')));
begin
  if sender is null then raise exception 'not_authenticated'; end if;
  if clean_handle !~ '^[a-z0-9_]{3,24}$' then raise exception 'invalid_handle'; end if;
  select user_id into recipient from public.nexora_dm_directory where lower(handle)=clean_handle;
  if recipient is null then raise exception 'recipient_not_found'; end if;
  if recipient=sender then raise exception 'cannot_message_self'; end if;

  select p1.conversation_id into existing_id
  from public.nexora_dm_participants p1
  join public.nexora_dm_participants p2 on p2.conversation_id=p1.conversation_id
  where p1.user_id=sender and p2.user_id=recipient
  group by p1.conversation_id
  limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.nexora_dm_conversations(created_by) values(sender) returning id into new_id;
  insert into public.nexora_dm_participants(conversation_id,user_id) values(new_id,sender),(new_id,recipient);
  return new_id;
end;
$$;
revoke all on function public.nexora_start_dm(text) from public, anon;
grant execute on function public.nexora_start_dm(text) to authenticated;

-- Realtime is optional; polling in the client remains the fallback.
do $$ begin
  alter publication supabase_realtime add table public.nexora_dm_messages;
exception when duplicate_object then null;
end $$;

grant select, insert, update on public.nexora_dm_directory to authenticated;
grant select on public.nexora_dm_conversations, public.nexora_dm_participants, public.nexora_dm_messages to authenticated;
grant insert on public.nexora_dm_messages to authenticated;
