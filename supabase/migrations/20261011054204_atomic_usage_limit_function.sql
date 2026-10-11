create or replace function public.consume_nexorawildfire_usage(p_user_id uuid, p_feature text, p_request_id text default null)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
  v_start timestamptz := date_trunc('month', now());
begin
  if p_feature not in ('ndvi_timeseries','risk_raster','enterprise_report') then
    raise exception 'invalid_feature';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select coalesce(plan, 'free') into v_plan from public.profiles where id = p_user_id;
  if not found then v_plan := 'free'; end if;
  v_limit := case v_plan when 'pro' then 100 when 'enterprise' then 1000 else 5 end;
  select coalesce(sum(credits),0)::integer into v_used
    from public.nexorawildfire_usage_events
    where user_id = p_user_id and created_at >= v_start;
  if v_used >= v_limit then
    return jsonb_build_object('allowed', false, 'plan', v_plan, 'used', v_used, 'limit', v_limit,
      'resets_at', (v_start + interval '1 month'));
  end if;
  insert into public.nexorawildfire_usage_events(user_id, feature, credits, request_id)
  values (p_user_id, p_feature, 1, left(p_request_id, 120));
  v_used := v_used + 1;
  return jsonb_build_object('allowed', true, 'plan', v_plan, 'used', v_used, 'limit', v_limit,
    'resets_at', (v_start + interval '1 month'));
end;
$$;
revoke all on function public.consume_nexorawildfire_usage(uuid, text, text) from public, anon, authenticated;
grant execute on function public.consume_nexorawildfire_usage(uuid, text, text) to service_role;
