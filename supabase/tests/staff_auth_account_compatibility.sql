-- Run after 20260825180000_staff_auth_account_compatibility.sql in a disposable/local database.
-- The transaction is rolled back; all Auth identities below are synthetic.

begin;

do $$
begin
  -- The production project already has this trigger. Create it transactionally
  -- only when a fresh local migration history does not include the legacy trigger.
  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'auth.users'::regclass
      and trigger_row.tgname = 'on_auth_user_created'
      and not trigger_row.tgisinternal
  ) then
    execute 'create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user()';
  end if;
end;
$$;

do $$
declare
  v_patient uuid := '30000000-0000-4000-8000-000000000001';
  v_staff uuid := '30000000-0000-4000-8000-000000000002';
  v_duplicate_tckn uuid := '30000000-0000-4000-8000-000000000003';
  v_patient_profile_count bigint;
begin
  if not exists (
    select 1
    from pg_catalog.pg_proc as proc
    where proc.oid = 'public.handle_new_user()'::regprocedure
      and proc.prosecdef
      and proc.proconfig @> array['search_path=""']::text[]
  ) then
    raise exception 'handle_new_user must remain SECURITY DEFINER with an empty search_path';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'auth.users'::regclass
      and trigger_row.tgname = 'on_auth_user_created'
      and trigger_row.tgfoid = 'public.handle_new_user()'::regprocedure
      and trigger_row.tgenabled <> 'D'
      and not trigger_row.tgisinternal
  ) then
    raise exception 'patient profile trigger must call handle_new_user and remain enabled';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'auth.users'::regclass
      and trigger_row.tgname = 'on_auth_user_created_role'
      and trigger_row.tgfoid = 'public.handle_new_user_role()'::regprocedure
      and trigger_row.tgenabled <> 'D'
      and not trigger_row.tgisinternal
  ) then
    raise exception 'user role trigger must remain enabled and unchanged';
  end if;

  if has_table_privilege('authenticated', 'public.user_roles', 'INSERT')
    or has_table_privilege('authenticated', 'public.user_roles', 'UPDATE')
    or has_table_privilege('authenticated', 'public.user_roles', 'DELETE') then
    raise exception 'authenticated must not mutate user_roles directly';
  end if;

  insert into auth.users (
    id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    v_patient,
    'authenticated',
    'authenticated',
    'patient.compatibility@example.invalid',
    '{}'::jsonb,
    jsonb_build_object(
      'full_name', '  Synthetic Patient Compatibility  ',
      'tckn', ' 30000000001 '
    ),
    now(),
    now()
  );

  if not exists (
    select 1
    from public.users as patient_profile
    where patient_profile.id = v_patient
      and patient_profile.email = 'patient.compatibility@example.invalid'
      and patient_profile.full_name = 'Synthetic Patient Compatibility'
      and patient_profile.tckn = '30000000001'
  ) then
    raise exception 'complete patient metadata must create a normalized patient profile';
  end if;

  if not exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = v_patient
      and user_role.role = 'patient'
  ) then
    raise exception 'patient Auth identity must still receive the default patient role';
  end if;

  select count(*) into v_patient_profile_count from public.users;

  insert into auth.users (
    id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    v_staff,
    'authenticated',
    'authenticated',
    'staff.compatibility@example.invalid',
    '{}'::jsonb,
    jsonb_build_object('full_name', 'Synthetic Staff Compatibility'),
    now(),
    now()
  );

  if exists (
    select 1 from public.users as patient_profile
    where patient_profile.id = v_staff
  ) or (select count(*) from public.users) <> v_patient_profile_count then
    raise exception 'staff Auth identity without complete patient metadata must not create a patient profile';
  end if;

  if not exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = v_staff
      and user_role.role = 'patient'
  ) then
    raise exception 'staff Auth identity must still receive the current default patient role';
  end if;

  begin
    insert into auth.users (
      id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      v_duplicate_tckn,
      'authenticated',
      'authenticated',
      'duplicate-tckn.compatibility@example.invalid',
      '{}'::jsonb,
      jsonb_build_object(
        'full_name', 'Synthetic Duplicate TCKN',
        'tckn', '30000000001'
      ),
      now(),
      now()
    );
    raise exception 'duplicate patient TCKN was unexpectedly accepted';
  exception when unique_violation then
    null;
  end;

  if exists (
    select 1 from auth.users as auth_user
    where auth_user.id = v_duplicate_tckn
  ) or exists (
    select 1 from public.users as patient_profile
    where patient_profile.id = v_duplicate_tckn
  ) or exists (
    select 1 from public.user_roles as user_role
    where user_role.user_id = v_duplicate_tckn
  ) then
    raise exception 'conflicting patient identity must roll back all related rows';
  end if;
end;
$$;

rollback;
