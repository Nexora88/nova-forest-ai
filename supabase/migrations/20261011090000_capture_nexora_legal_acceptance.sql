create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.capture_nexora_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  selected_language text;
  notice_version text;
  terms_version text;
  disclaimer_version text;
begin
  if meta ->> 'legal_notice_ack' is distinct from 'true'
     or meta ->> 'legal_terms_ack' is distinct from 'true'
     or meta ->> 'legal_safety_ack' is distinct from 'true' then
    return new;
  end if;

  notice_version := nullif(meta ->> 'legal_notice_version', '');
  terms_version := nullif(meta ->> 'legal_terms_version', '');
  disclaimer_version := nullif(meta ->> 'legal_disclaimer_version', '');
  selected_language := case when meta ->> 'legal_language' = 'tr' then 'tr' else 'en' end;

  if notice_version is null or terms_version is null or disclaimer_version is null then
    return new;
  end if;

  insert into public.nexorawildfire_legal_acceptances
    (user_id, notice_version, terms_version, disclaimer_version, language, accepted_at, safety_accepted_at)
  values
    (new.id, notice_version, terms_version, disclaimer_version, selected_language, now(), now());

  return new;
end;
$function$;

revoke all on function private.capture_nexora_legal_acceptance() from public, anon, authenticated;

drop trigger if exists nexora_capture_legal_acceptance on auth.users;
create trigger nexora_capture_legal_acceptance
after insert on auth.users
for each row execute function private.capture_nexora_legal_acceptance();
