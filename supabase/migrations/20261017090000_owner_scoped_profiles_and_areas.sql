-- Ensure account records are scoped to the authenticated owner.
-- The tables may be provisioned by the existing Supabase project rather than migrations,
-- so skip absent tables safely; the app must not treat this as proof of deployed RLS.
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'alter table public.profiles enable row level security';
    execute 'drop policy if exists nexora_profiles_select_own on public.profiles';
    execute 'create policy nexora_profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id)';
    execute 'drop policy if exists nexora_profiles_insert_own on public.profiles';
    execute 'create policy nexora_profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id)';
    execute 'drop policy if exists nexora_profiles_update_own on public.profiles';
    execute 'create policy nexora_profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id)';
  end if;

  if to_regclass('public.nexorawildfire_areas') is not null then
    execute 'alter table public.nexorawildfire_areas enable row level security';
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
