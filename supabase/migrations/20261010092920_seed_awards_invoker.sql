-- Keep the seed award RPC non-privileged; the RLS insert policy independently validates every allowed event.
alter function public.award_nexorawildfire_seed(text,text) security invoker;
grant select, insert on public.nexorawildfire_seed_events to authenticated;
drop policy if exists seed_events_insert_valid on public.nexorawildfire_seed_events;
create policy seed_events_insert_valid on public.nexorawildfire_seed_events
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (
      action='daily' and points=5 and label='Günlük Takip'
      and event_key='daily:'||to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD')
    )
    or
    (
      action='area' and points=50 and label='Alan Koruma'
      and event_key ~ '^area:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and exists (
        select 1 from public.nexorawildfire_areas a
        where a.id = case
          when event_key ~ '^area:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then substring(event_key from 6)::uuid else null end
          and a.user_id=(select auth.uid())
      )
    )
    or
    (
      action='special_day' and points=100 and label='Özel Gün Bonusu'
      and to_char(now() at time zone 'Europe/Istanbul','MM-DD')
        in ('01-01','03-20','03-21','03-22','04-23','05-14','05-19','06-05','08-30','10-16','10-29','11-10','12-05','12-11')
      and event_key='special:'||to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD')
    )
  )
);
revoke all on function public.award_nexorawildfire_seed(text,text) from public, anon;
grant execute on function public.award_nexorawildfire_seed(text,text) to authenticated;
