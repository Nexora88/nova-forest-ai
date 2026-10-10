-- Make seed points server-authoritative and prevent client-chosen event keys.
revoke insert, update, delete on public.nexorawildfire_seed_events from anon, authenticated;
grant select on public.nexorawildfire_seed_events to authenticated;

create or replace function public.award_nexorawildfire_seed(p_action text, p_event_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  pts integer;
  lbl text;
  expected_key text;
  local_day text := to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
  day_mmdd text := to_char(now() at time zone 'Europe/Istanbul','MM-DD');
  area_id uuid;
  affected bigint := 0;
  total integer := 0;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if length(coalesce(p_event_key,'')) < 3 or length(p_event_key) > 120 then
    raise exception 'invalid_event_key';
  end if;

  if p_action='daily' then
    pts:=5; lbl:='Günlük Takip'; expected_key:='daily:'||local_day;
    if p_event_key<>expected_key then raise exception 'daily_event_must_be_today'; end if;
  elsif p_action='area' then
    pts:=50; lbl:='Alan Koruma';
    if p_event_key !~ '^area:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'invalid_area_event';
    end if;
    area_id:=substring(p_event_key from 6)::uuid;
    if not exists(select 1 from public.nexorawildfire_areas a where a.id=area_id and a.user_id=uid) then
      raise exception 'area_not_owned';
    end if;
    expected_key:='area:'||area_id::text;
    if p_event_key<>expected_key then raise exception 'invalid_area_event'; end if;
  elsif p_action='special_day' then
    if day_mmdd not in ('01-01','03-20','03-21','03-22','04-23','05-14','05-19','06-05','08-30','10-16','10-29','11-10','12-05','12-11') then
      raise exception 'no_special_day_bonus_today';
    end if;
    pts:=100; lbl:='Özel Gün Bonusu'; expected_key:='special:'||local_day;
    if p_event_key<>expected_key then raise exception 'special_day_event_must_be_today'; end if;
  elsif p_action='report' then
    raise exception 'reports_not_enabled';
  else
    raise exception 'invalid_action';
  end if;

  insert into public.nexorawildfire_seed_events(user_id,action,points,label,event_key)
  values(uid,p_action,pts,lbl,expected_key)
  on conflict (user_id,event_key) do nothing;
  get diagnostics affected = row_count;

  select coalesce(sum(points),0) into total
  from public.nexorawildfire_seed_events where user_id=uid;

  return jsonb_build_object(
    'awarded', affected > 0,
    'points', case when affected > 0 then pts else 0 end,
    'total', total
  );
end;
$$;
revoke all on function public.award_nexorawildfire_seed(text,text) from public, anon;
grant execute on function public.award_nexorawildfire_seed(text,text) to authenticated;
