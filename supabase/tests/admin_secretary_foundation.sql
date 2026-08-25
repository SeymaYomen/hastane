-- Run after 20260825160000_admin_secretary_foundation.sql in a disposable/local database.
-- The transaction is rolled back; all auth identities below are synthetic.

begin;

do $$
declare
  v_admin uuid := '10000000-0000-4000-8000-000000000001';
  v_patient uuid := '10000000-0000-4000-8000-000000000002';
  v_doctor uuid := '10000000-0000-4000-8000-000000000003';
  v_secretary uuid := '10000000-0000-4000-8000-000000000004';
  v_admin_target uuid := '10000000-0000-4000-8000-000000000005';
  v_audit_count bigint;
  v_previous_role text;
  v_new_role text;
begin
  if not (select c.relrowsecurity from pg_catalog.pg_class as c
    where c.oid = 'public.admin_actions_log'::regclass) then
    raise exception 'admin_actions_log RLS must be enabled';
  end if;

  if has_table_privilege('authenticated', 'public.user_roles', 'INSERT')
    or has_table_privilege('authenticated', 'public.user_roles', 'UPDATE')
    or has_table_privilege('authenticated', 'public.user_roles', 'DELETE') then
    raise exception 'authenticated must not mutate user_roles directly';
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
    (v_admin, 'authenticated', 'authenticated', 'admin.foundation@example.invalid', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (v_patient, 'authenticated', 'authenticated', 'patient.foundation@example.invalid', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (v_doctor, 'authenticated', 'authenticated', 'doctor.foundation@example.invalid', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (v_secretary, 'authenticated', 'authenticated', 'secretary.foundation@example.invalid', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (v_admin_target, 'authenticated', 'authenticated', 'admin-target.foundation@example.invalid', '{}'::jsonb, '{}'::jsonb, now(), now());

  update public.user_roles set role = 'admin' where user_id = v_admin;
  update public.user_roles set role = 'doctor' where user_id = v_doctor;
  update public.user_roles set role = 'secretary' where user_id = v_secretary;

  perform set_config('request.jwt.claim.role', 'authenticated', true);

  perform set_config('request.jwt.claim.sub', v_patient::text, true);
  begin
    perform public.admin_set_user_role(v_admin_target, 'secretary');
    raise exception 'patient unexpectedly changed a role';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', v_doctor::text, true);
  begin
    perform public.admin_set_user_role(v_admin_target, 'secretary');
    raise exception 'doctor unexpectedly changed a role';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', v_secretary::text, true);
  begin
    perform public.admin_set_user_role(v_admin_target, 'secretary');
    raise exception 'secretary unexpectedly changed a role';
  exception when insufficient_privilege then null;
  end;

  if (select count(*) from public.admin_actions_log) <> 0 then
    raise exception 'rejected role changes must not create audit rows';
  end if;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);

  select r.previous_role, r.new_role
  into v_previous_role, v_new_role
  from public.admin_set_user_role(v_patient, 'secretary') as r;
  if v_previous_role <> 'patient' or v_new_role <> 'secretary' then
    raise exception 'patient -> secretary returned an invalid result';
  end if;

  select r.previous_role, r.new_role
  into v_previous_role, v_new_role
  from public.admin_set_user_role(v_secretary, 'patient') as r;
  if v_previous_role <> 'secretary' or v_new_role <> 'patient' then
    raise exception 'secretary -> patient returned an invalid result';
  end if;

  select r.previous_role, r.new_role
  into v_previous_role, v_new_role
  from public.admin_set_user_role(v_admin_target, 'admin') as r;
  if v_previous_role <> 'patient' or v_new_role <> 'admin' then
    raise exception 'patient -> admin returned an invalid result';
  end if;

  select count(*) into v_audit_count from public.admin_actions_log;
  if v_audit_count <> 3 then
    raise exception 'each real role change must create one audit row';
  end if;

  if not exists (
    select 1
    from public.admin_actions_log
    where actor_user_id = v_admin
      and action = 'user_role_changed'
      and target_user_id = v_patient
      and old_value = 'patient'
      and new_value = 'secretary'
      and metadata = '{}'::jsonb
  ) then
    raise exception 'role-change audit row has invalid administrative fields';
  end if;

  select r.previous_role, r.new_role
  into v_previous_role, v_new_role
  from public.admin_set_user_role(v_admin_target, 'admin') as r;
  if v_previous_role <> 'admin' or v_new_role <> 'admin'
    or (select count(*) from public.admin_actions_log) <> v_audit_count then
    raise exception 'unchanged role must be deterministic and unaudited';
  end if;

  begin
    perform public.admin_set_user_role(v_admin, 'patient');
    raise exception 'admin unexpectedly changed their own role';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_set_user_role(v_patient, 'doctor');
    raise exception 'generic RPC unexpectedly assigned doctor role';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_set_user_role(v_doctor, 'patient');
    raise exception 'generic RPC unexpectedly removed doctor role';
  exception when insufficient_privilege then null;
  end;

  if (select count(*) from public.admin_actions_log) <> v_audit_count then
    raise exception 'rejected operations must not create audit rows';
  end if;
end;
$$;

rollback;
