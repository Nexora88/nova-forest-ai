create or replace function public.protect_profile_entitlements()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user <> 'service_role' and (select auth.uid()) is not null then
    if tg_op = 'INSERT' then
      new.plan := 'free';
      new.tokens := 50;
    else
      new.plan := old.plan;
      new.tokens := old.tokens;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_entitlements_trigger on public.profiles;
create trigger protect_profile_entitlements_trigger
before insert or update on public.profiles
for each row execute function public.protect_profile_entitlements();
