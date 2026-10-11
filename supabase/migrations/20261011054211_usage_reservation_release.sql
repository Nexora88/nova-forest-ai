create unique index if not exists nexorawildfire_usage_request_once
  on public.nexorawildfire_usage_events(user_id, request_id)
  where request_id is not null;
create or replace function public.release_nexorawildfire_usage(p_user_id uuid, p_request_id text)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  delete from public.nexorawildfire_usage_events
   where user_id = p_user_id and request_id = left(p_request_id, 120);
  return found;
end;
$$;
revoke all on function public.release_nexorawildfire_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.release_nexorawildfire_usage(uuid, text) to service_role;
