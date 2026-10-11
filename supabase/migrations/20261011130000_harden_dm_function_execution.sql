-- Harden the existing direct-message helper functions without breaking the
-- authenticated RLS/RPC model. These functions are intentionally available to
-- authenticated users; neither is intended to be callable by anon/PUBLIC.
begin;

alter function public.nexora_is_dm_participant(uuid)
  set search_path = pg_catalog, public, pg_temp;

alter function public.nexora_start_dm(text)
  set search_path = pg_catalog, public, pg_temp;

revoke all on function public.nexora_is_dm_participant(uuid) from public;
revoke all on function public.nexora_is_dm_participant(uuid) from anon;
grant execute on function public.nexora_is_dm_participant(uuid) to authenticated;

revoke all on function public.nexora_start_dm(text) from public;
revoke all on function public.nexora_start_dm(text) from anon;
grant execute on function public.nexora_start_dm(text) to authenticated;

comment on function public.nexora_is_dm_participant(uuid) is
  'SECURITY DEFINER is intentional for the DM RLS membership check. Requires auth.uid(); execute is restricted to authenticated; search_path is pinned.';
comment on function public.nexora_start_dm(text) is
  'SECURITY DEFINER is intentional for creating a DM and participants atomically. Requires auth.uid() and validates recipient handle; execute is restricted to authenticated; search_path is pinned.';

commit;
