-- Ensure account records are scoped to the authenticated owner.
-- The tables may be provisioned by the existing Supabase project rather than migrations,
-- so skip absent tables safely; the app must not treat this as proof of deployed RLS.
do $
declare existing_policy record;
begin
  if to_regclass('public.profiles') is not null then
    execute 'alter table public.profiles enable row level security';
    for existing_policy in select policyname from pg_policies where schemaname='public' and tablename='profiles' loop
      execute format('drop policy if exists %I on public.profiles', existing_policy.policyname);
    end loop;
    execute 'drop policy if exists nexora_profiles_select_own on public.profiles';
    execute 'create policy nexora_profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id)';
    execute 'drop policy if exists nexora_profiles_insert_own on public.profiles';
    execute 'create policy nexora_profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id)';
    execute 'drop policy if exists nexora_profiles_update_own on public.profiles';
    execute 'create policy nexora_profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id)';
  end if;

  if to_regclass('public.profiles') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
    execute $fn$
      create or replace function public.nexora_prevent_profile_role_escalation()
      returns trigger language plpgsql security invoker set search_path = ''
      as $body$
      begin
        if current_user <> 'service_role' and (select auth.uid()) is not null then
          new.role := old.role;
        end if;
        return new;
      end;
      $body$
    $fn$;
    execute 'drop trigger if exists nexora_prevent_profile_role_escalation_trigger on public.profiles';
    execute 'create trigger nexora_prevent_profile_role_escalation_trigger before update on public.profiles for each row execute function public.nexora_prevent_profile_role_escalation()';
  end if;

  if to_regclass('public.nexorawildfire_areas') is not null then
    execute 'alter table public.nexorawildfire_areas enable row level security';
    for existing_policy in select policyname from pg_policies where schemaname='public' and tablename='nexorawildfire_areas' loop
      execute format('drop policy if exists %I on public.nexorawildfire_areas', existing_policy.policyname);
    end loop;
    execute 'drop policy if exists nexorawildfire_areas_select_own on public.nexorawildfire_areas';
    execute 'create policy nexorawildfire_areas_select_own on public.nexorawildfire_areas for select to authenticated using ((select auth.uid()) = user_id)';
    execute 'drop policy if exists nexorawildfire_areas_insert_own on public.nexorawildfire_areas';
    execute 'create policy nexorawildfire_areas_insert_own on public.nexorawildfire_areas for insert to authenticated with check ((select auth.uid()) = user_id)';
    execute 'drop policy if exists nexorawildfire_areas_update_own on public.nexorawildfire_areas';
    execute 'create policy nexorawildfire_areas_update_own on public.nexorawildfire_areas for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)';
    execute 'drop policy if exists nexorawildfire_areas_delete_own on public.nexorawildfire_areas';
    execute 'create policy nexorawildfire_areas_delete_own on public.nexorawildfire_areas for delete to authenticated using ((select auth.uid()) = user_id)';
  end if;
end $$;
