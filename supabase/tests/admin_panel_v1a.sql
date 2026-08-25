-- Run after 20260825170000_admin_panel_v1a.sql in a disposable/local database.
-- The transaction is rolled back; all identities and records are synthetic.

begin;

do $$
declare
  v_admin uuid := '20000000-0000-4000-8000-000000000001';
  v_patient uuid := '20000000-0000-4000-8000-000000000002';
  v_doctor uuid := '20000000-0000-4000-8000-000000000003';
  v_secretary uuid := '20000000-0000-4000-8000-000000000004';
  v_department uuid;
  v_spare_department uuid;
  v_audit_before bigint;
  v_audit_after bigint;
  v_result_signature text;
begin
  if has_table_privilege('authenticated', 'public.departments', 'INSERT')
    or has_table_privilege('authenticated', 'public.departments', 'UPDATE')
    or has_table_privilege('authenticated', 'public.departments', 'DELETE') then
    raise exception 'authenticated must not mutate departments directly';
  end if;

  if has_table_privilege('authenticated', 'public.admin_actions_log', 'SELECT')
    or has_table_privilege('authenticated', 'public.admin_actions_log', 'INSERT')
    or has_table_privilege('authenticated', 'public.admin_actions_log', 'UPDATE')
    or has_table_privilege('authenticated', 'public.admin_actions_log', 'DELETE') then
    raise exception 'authenticated must not access admin_actions_log directly';
  end if;

  insert into auth.users (
    id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (v_admin, 'authenticated', 'authenticated', 'admin.v1a@example.invalid', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (v_patient, 'authenticated', 'authenticated', 'patient.v1a@example.invalid', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (v_doctor, 'authenticated', 'authenticated', 'doctor.v1a@example.invalid', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (v_secretary, 'authenticated', 'authenticated', 'secretary.v1a@example.invalid', '{}'::jsonb, '{}'::jsonb, now(), now());

  insert into public.users (id, email, full_name, phone, tckn, created_at)
  values
    (v_admin, 'admin.v1a@example.invalid', 'Synthetic Admin V1A', '05000000001', '10000000001', now()),
    (v_patient, 'patient.v1a@example.invalid', 'Synthetic Patient V1A', '05000000002', '10000000002', now()),
    (v_secretary, 'secretary.v1a@example.invalid', 'Synthetic Secretary V1A', '05000000004', '10000000004', now());

  update public.user_roles set role = 'admin' where user_id = v_admin;
  update public.user_roles set role = 'doctor' where user_id = v_doctor;
  update public.user_roles set role = 'secretary' where user_id = v_secretary;

  perform set_config('request.jwt.claim.role', 'authenticated', true);

  perform set_config('request.jwt.claim.sub', v_patient::text, true);
  begin
    perform public.admin_list_departments();
    raise exception 'patient unexpectedly called admin department RPC';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', v_secretary::text, true);
  begin
    perform public.admin_list_departments();
    raise exception 'secretary unexpectedly called admin department RPC';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', v_doctor::text, true);
  begin
    perform public.admin_list_departments();
    raise exception 'doctor unexpectedly called admin department RPC';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', v_patient::text, true);
  begin
    perform public.admin_list_users(null, null, 25, 0);
    raise exception 'patient unexpectedly listed the admin user directory';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', v_secretary::text, true);
  begin
    perform public.admin_get_actions(25, 0, null);
    raise exception 'secretary unexpectedly read the admin audit log';
  exception when insufficient_privilege then null;
  end;

  select count(*) into v_audit_before
  from public.admin_actions_log;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);

  select created.department_id into v_department
  from public.admin_create_department(
    'Synthetic V1A Department',
    'Synthetic administrative test department.',
    array['Synthetic service'],
    901
  ) as created;

  if v_department is null or not exists (
    select 1 from public.departments as dep
    where dep.id = v_department
      and dep.name = 'Synthetic V1A Department'
      and dep.is_active
      and dep.sort_order = 901
  ) then
    raise exception 'admin department create failed';
  end if;

  perform public.admin_update_department(
    v_department,
    'Synthetic V1A Department',
    'Updated synthetic administrative description.',
    array['Synthetic service', 'Second synthetic service'],
    902
  );

  if not exists (
    select 1 from public.departments as dep
    where dep.id = v_department
      and dep.description = 'Updated synthetic administrative description.'
      and dep.services = array['Synthetic service', 'Second synthetic service']
      and dep.sort_order = 902
  ) then
    raise exception 'admin department update failed';
  end if;

  select count(*) into v_audit_after
  from public.admin_actions_log;

  perform public.admin_update_department(
    v_department,
    'Synthetic V1A Department',
    'Updated synthetic administrative description.',
    array['Synthetic service', 'Second synthetic service'],
    902
  );

  if (select count(*) from public.admin_actions_log) <> v_audit_after then
    raise exception 'no-op department update must not create an audit row';
  end if;

  insert into public.doctors (
    id, full_name, department, title, experience_years, education,
    languages, specialties, working_days, user_id, created_at
  ) values (
    '20000000-0000-4000-8000-000000000010',
    'Synthetic Doctor V1A',
    'Synthetic V1A Department',
    'Uzm. Dr.',
    1,
    'Synthetic education',
    array['Türkçe'],
    array['Synthetic specialty'],
    array['Pazartesi'],
    v_doctor,
    now()
  );

  select count(*) into v_audit_after
  from public.admin_actions_log;

  begin
    perform public.admin_set_department_active(v_department, false);
    raise exception 'department with an active doctor was unexpectedly deactivated';
  exception when check_violation then null;
  end;

  if not (select dep.is_active from public.departments as dep where dep.id = v_department)
    or (select count(*) from public.admin_actions_log) <> v_audit_after then
    raise exception 'blocked department deactivation changed state or audit history';
  end if;

  select created.department_id into v_spare_department
  from public.admin_create_department(
    'Synthetic V1A Spare Department', null, '{}'::text[], 903
  ) as created;

  perform public.admin_set_department_active(v_spare_department, false);
  perform public.admin_set_department_active(v_spare_department, true);

  if not exists (
    select 1 from public.admin_actions_log as log
    where log.actor_user_id = v_admin
      and log.action = 'department_created'
      and log.metadata->>'department_id' = v_department::text
  ) or not exists (
    select 1 from public.admin_actions_log as log
    where log.actor_user_id = v_admin
      and log.action = 'department_updated'
      and log.metadata->>'department_id' = v_department::text
  ) or not exists (
    select 1 from public.admin_actions_log as log
    where log.actor_user_id = v_admin
      and log.action = 'department_deactivated'
      and log.metadata->>'department_id' = v_spare_department::text
  ) or not exists (
    select 1 from public.admin_actions_log as log
    where log.actor_user_id = v_admin
      and log.action = 'department_activated'
      and log.metadata->>'department_id' = v_spare_department::text
  ) then
    raise exception 'department mutations did not create the required audit rows';
  end if;

  if not exists (
    select 1
    from public.admin_list_users('patient.v1a', 'patient', 10, 0) as listed
    where listed.user_id = v_patient
      and listed.full_name = 'Synthetic Patient V1A'
      and listed.email = 'patient.v1a@example.invalid'
      and listed.role = 'patient'
  ) then
    raise exception 'admin user directory did not return minimal identity fields';
  end if;

  select pg_catalog.pg_get_function_result(
    'public.admin_list_users(text,text,integer,integer)'::regprocedure
  ) into v_result_signature;

  if lower(v_result_signature) like '%tckn%'
    or lower(v_result_signature) like '%phone%' then
    raise exception 'admin user directory exposes TCKN or phone';
  end if;

  begin
    perform public.admin_set_user_role(v_patient, 'doctor');
    raise exception 'generic role RPC unexpectedly assigned doctor role';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_set_user_role(v_doctor, 'patient');
    raise exception 'generic role RPC unexpectedly removed doctor role';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_set_user_role(v_admin, 'patient');
    raise exception 'admin unexpectedly changed their own role';
  exception when insufficient_privilege then null;
  end;

  if not exists (
    select 1
    from public.admin_get_actions(50, 0, 'department_created') as audit
    where audit.actor_user_id = v_admin
      and audit.metadata->>'department_id' = v_department::text
  ) then
    raise exception 'admin audit read RPC did not return safe audit history';
  end if;

  if (select count(*) from public.admin_actions_log) <> v_audit_before + 5 then
    raise exception 'rejected operations created audit rows or expected audit rows are missing';
  end if;
end;
$$;

rollback;
