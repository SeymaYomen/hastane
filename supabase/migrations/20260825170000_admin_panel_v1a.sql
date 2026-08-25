-- Admin Panel V1A: narrow admin RPCs for dashboard counts, departments,
-- user roles, and immutable administrative audit reads.

alter table public.departments
  add column if not exists services text[],
  add column if not exists is_active boolean,
  add column if not exists sort_order integer;

update public.departments
set
  services = coalesce(services, '{}'::text[]),
  is_active = coalesce(is_active, true),
  sort_order = coalesce(sort_order, 0)
where services is null or is_active is null or sort_order is null;

alter table public.departments
  alter column services set default '{}'::text[],
  alter column services set not null,
  alter column is_active set default true,
  alter column is_active set not null,
  alter column sort_order set default 0,
  alter column sort_order set not null;

create index if not exists departments_active_sort_idx
  on public.departments (is_active, sort_order, name);

revoke insert, update, delete on table public.departments
  from public, anon, authenticated;

create function public.admin_get_dashboard_counts()
returns table (
  active_department_count bigint,
  total_doctor_count bigint,
  secretary_count bigint,
  patient_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles as ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ) then
    raise exception 'Yönetici yetkisi bulunamadı.' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.departments as dep where dep.is_active),
    (select count(*) from public.doctors),
    (select count(*) from public.user_roles as ur where ur.role = 'secretary'),
    (select count(*) from public.user_roles as ur where ur.role = 'patient');
end;
$$;

create function public.admin_list_departments()
returns table (
  department_id uuid,
  name text,
  description text,
  services text[],
  is_active boolean,
  sort_order integer,
  created_at timestamptz,
  doctor_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles as ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ) then
    raise exception 'Yönetici yetkisi bulunamadı.' using errcode = '42501';
  end if;

  return query
  select
    dep.id,
    dep.name,
    dep.description,
    dep.services,
    dep.is_active,
    dep.sort_order,
    dep.created_at,
    count(d.id)
  from public.departments as dep
  left join public.doctors as d
    on lower(btrim(d.department)) = lower(btrim(dep.name))
  group by dep.id, dep.name, dep.description, dep.services,
    dep.is_active, dep.sort_order, dep.created_at
  order by dep.sort_order, dep.name, dep.id;
end;
$$;

create function public.admin_create_department(
  p_name text,
  p_description text default null,
  p_services text[] default '{}'::text[],
  p_sort_order integer default 0
)
returns table (
  department_id uuid,
  name text,
  description text,
  services text[],
  is_active boolean,
  sort_order integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_services text[];
  v_id uuid;
  v_created_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select ur.role into v_actor_role
  from public.user_roles as ur
  where ur.user_id = auth.uid()
  for share;

  if v_actor_role is distinct from 'admin' then
    raise exception 'Yönetici yetkisi bulunamadı.' using errcode = '42501';
  end if;

  if v_name = '' or char_length(v_name) > 120
    or char_length(v_description) > 1000
    or p_sort_order is null or p_sort_order not between 0 and 10000
    or cardinality(coalesce(p_services, '{}'::text[])) > 20
    or exists (
      select 1 from unnest(coalesce(p_services, '{}'::text[])) as service(value)
      where nullif(btrim(service.value), '') is null
        or char_length(btrim(service.value)) > 120
    ) then
    raise exception 'Geçersiz bölüm bilgileri.' using errcode = '22023';
  end if;

  select coalesce(array_agg(btrim(service.value) order by service.ordinality), '{}'::text[])
  into v_services
  from unnest(coalesce(p_services, '{}'::text[])) with ordinality as service(value, ordinality);

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('admin_departments_v1a'));

  if exists (
    select 1 from public.departments as dep
    where lower(btrim(dep.name)) = lower(v_name)
  ) then
    raise exception 'Bu bölüm adı zaten kullanılıyor.' using errcode = '23505';
  end if;

  insert into public.departments as dep (name, description, services, is_active, sort_order)
  values (v_name, v_description, v_services, true, p_sort_order)
  returning dep.id, dep.created_at into v_id, v_created_at;

  insert into public.admin_actions_log (
    actor_user_id, action, target_user_id, old_value, new_value, metadata
  ) values (
    auth.uid(),
    'department_created',
    null,
    null,
    v_name,
    jsonb_build_object(
      'department_id', v_id,
      'name', v_name,
      'sort_order', p_sort_order
    )
  );

  return query
  select v_id, v_name, v_description, v_services, true, p_sort_order, v_created_at;
end;
$$;

create function public.admin_update_department(
  p_department_id uuid,
  p_name text,
  p_description text default null,
  p_services text[] default '{}'::text[],
  p_sort_order integer default 0
)
returns table (
  department_id uuid,
  name text,
  description text,
  services text[],
  is_active boolean,
  sort_order integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_services text[];
  v_old_name text;
  v_old_description text;
  v_old_services text[];
  v_is_active boolean;
  v_old_sort_order integer;
  v_created_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select ur.role into v_actor_role
  from public.user_roles as ur
  where ur.user_id = auth.uid()
  for share;

  if v_actor_role is distinct from 'admin' then
    raise exception 'Yönetici yetkisi bulunamadı.' using errcode = '42501';
  end if;

  if p_department_id is null
    or v_name = '' or char_length(v_name) > 120
    or char_length(v_description) > 1000
    or p_sort_order is null or p_sort_order not between 0 and 10000
    or cardinality(coalesce(p_services, '{}'::text[])) > 20
    or exists (
      select 1 from unnest(coalesce(p_services, '{}'::text[])) as service(value)
      where nullif(btrim(service.value), '') is null
        or char_length(btrim(service.value)) > 120
    ) then
    raise exception 'Geçersiz bölüm bilgileri.' using errcode = '22023';
  end if;

  select coalesce(array_agg(btrim(service.value) order by service.ordinality), '{}'::text[])
  into v_services
  from unnest(coalesce(p_services, '{}'::text[])) with ordinality as service(value, ordinality);

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('admin_departments_v1a'));

  select dep.name, dep.description, dep.services, dep.is_active,
    dep.sort_order, dep.created_at
  into v_old_name, v_old_description, v_old_services, v_is_active,
    v_old_sort_order, v_created_at
  from public.departments as dep
  where dep.id = p_department_id
  for update;

  if not found then
    raise exception 'Bölüm bulunamadı.' using errcode = '22023';
  end if;

  if v_old_name is distinct from v_name and exists (
    select 1 from public.doctors as d
    where lower(btrim(d.department)) = lower(btrim(v_old_name))
  ) then
    raise exception 'Aktif doktor bulunan bölümün adı değiştirilemez.' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.departments as dep
    where dep.id <> p_department_id
      and lower(btrim(dep.name)) = lower(v_name)
  ) then
    raise exception 'Bu bölüm adı zaten kullanılıyor.' using errcode = '23505';
  end if;

  if v_old_name is not distinct from v_name
    and v_old_description is not distinct from v_description
    and v_old_services is not distinct from v_services
    and v_old_sort_order is not distinct from p_sort_order then
    return query
    select p_department_id, v_old_name, v_old_description, v_old_services,
      v_is_active, v_old_sort_order, v_created_at;
    return;
  end if;

  update public.departments as dep
  set
    name = v_name,
    description = v_description,
    services = v_services,
    sort_order = p_sort_order
  where dep.id = p_department_id;

  insert into public.admin_actions_log (
    actor_user_id, action, target_user_id, old_value, new_value, metadata
  ) values (
    auth.uid(),
    'department_updated',
    null,
    v_old_name,
    v_name,
    jsonb_build_object(
      'department_id', p_department_id,
      'name', v_name,
      'sort_order', p_sort_order
    )
  );

  return query
  select p_department_id, v_name, v_description, v_services,
    v_is_active, p_sort_order, v_created_at;
end;
$$;

create function public.admin_set_department_active(
  p_department_id uuid,
  p_is_active boolean
)
returns table (
  department_id uuid,
  name text,
  description text,
  services text[],
  is_active boolean,
  sort_order integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_name text;
  v_description text;
  v_services text[];
  v_is_active boolean;
  v_sort_order integer;
  v_created_at timestamptz;
  v_action text;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select ur.role into v_actor_role
  from public.user_roles as ur
  where ur.user_id = auth.uid()
  for share;

  if v_actor_role is distinct from 'admin' then
    raise exception 'Yönetici yetkisi bulunamadı.' using errcode = '42501';
  end if;

  if p_department_id is null or p_is_active is null then
    raise exception 'Geçersiz bölüm durumu.' using errcode = '22023';
  end if;

  select dep.name, dep.description, dep.services, dep.is_active,
    dep.sort_order, dep.created_at
  into v_name, v_description, v_services, v_is_active,
    v_sort_order, v_created_at
  from public.departments as dep
  where dep.id = p_department_id
  for update;

  if not found then
    raise exception 'Bölüm bulunamadı.' using errcode = '22023';
  end if;

  if v_is_active = p_is_active then
    return query
    select p_department_id, v_name, v_description, v_services,
      v_is_active, v_sort_order, v_created_at;
    return;
  end if;

  if not p_is_active and exists (
    select 1 from public.doctors as d
    where lower(btrim(d.department)) = lower(btrim(v_name))
  ) then
    raise exception 'Bu bölümde aktif doktorlar bulunduğu için bölüm pasifleştirilemez.'
      using errcode = '23514';
  end if;

  update public.departments as dep
  set is_active = p_is_active
  where dep.id = p_department_id;

  v_action := case when p_is_active
    then 'department_activated'
    else 'department_deactivated'
  end;

  insert into public.admin_actions_log (
    actor_user_id, action, target_user_id, old_value, new_value, metadata
  ) values (
    auth.uid(),
    v_action,
    null,
    v_is_active::text,
    p_is_active::text,
    jsonb_build_object(
      'department_id', p_department_id,
      'name', v_name
    )
  );

  return query
  select p_department_id, v_name, v_description, v_services,
    p_is_active, v_sort_order, v_created_at;
end;
$$;

create function public.admin_list_users(
  p_search text default null,
  p_role text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_role text := nullif(btrim(coalesce(p_role, '')), '');
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles as ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ) then
    raise exception 'Yönetici yetkisi bulunamadı.' using errcode = '42501';
  end if;

  if char_length(v_search) > 100
    or (v_role is not null and v_role not in ('patient', 'doctor', 'secretary', 'admin'))
    or p_limit is null or p_limit not between 1 and 50
    or p_offset is null or p_offset not between 0 and 10000 then
    raise exception 'Geçersiz kullanıcı listeleme isteği.' using errcode = '22023';
  end if;

  return query
  select directory.user_id, directory.full_name, directory.email,
    directory.role, directory.created_at
  from (
    select
      au.id as user_id,
      coalesce(
        nullif(btrim(u.full_name), ''),
        nullif(btrim(d.full_name), ''),
        nullif(split_part(coalesce(au.email, ''), '@', 1), ''),
        'Ad belirtilmemiş'
      ) as full_name,
      coalesce(au.email, '') as email,
      ur.role,
      au.created_at
    from auth.users as au
    join public.user_roles as ur on ur.user_id = au.id
    left join public.users as u on u.id = au.id
    left join public.doctors as d on d.user_id = au.id
  ) as directory
  where (v_role is null or directory.role = v_role)
    and (
      v_search is null
      or strpos(lower(directory.full_name), lower(v_search)) > 0
      or strpos(lower(directory.email), lower(v_search)) > 0
    )
  order by directory.created_at desc, directory.user_id
  limit p_limit offset p_offset;
end;
$$;

create function public.admin_get_actions(
  p_limit integer default 25,
  p_offset integer default 0,
  p_action text default null
)
returns table (
  id uuid,
  actor_user_id uuid,
  actor_display_identity text,
  action text,
  target_user_id uuid,
  target_display_identity text,
  old_value text,
  new_value text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_action text := nullif(btrim(coalesce(p_action, '')), '');
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles as ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ) then
    raise exception 'Yönetici yetkisi bulunamadı.' using errcode = '42501';
  end if;

  if p_limit is null or p_limit not between 1 and 50
    or p_offset is null or p_offset not between 0 and 10000
    or char_length(v_action) > 100 then
    raise exception 'Geçersiz işlem geçmişi isteği.' using errcode = '22023';
  end if;

  return query
  select
    log.id,
    log.actor_user_id,
    case
      when log.actor_user_id is null then 'Sistem / silinmiş kullanıcı'
      else coalesce(
        nullif(btrim(actor_user.full_name), ''),
        nullif(btrim(actor_doctor.full_name), ''),
        nullif(actor_auth.email, ''),
        'Silinmiş kullanıcı'
      )
    end,
    log.action,
    log.target_user_id,
    case
      when log.target_user_id is null then null
      else coalesce(
        nullif(btrim(target_user.full_name), ''),
        nullif(btrim(target_doctor.full_name), ''),
        nullif(target_auth.email, ''),
        'Silinmiş kullanıcı'
      )
    end,
    log.old_value,
    log.new_value,
    log.metadata,
    log.created_at
  from public.admin_actions_log as log
  left join auth.users as actor_auth on actor_auth.id = log.actor_user_id
  left join public.users as actor_user on actor_user.id = log.actor_user_id
  left join public.doctors as actor_doctor on actor_doctor.user_id = log.actor_user_id
  left join auth.users as target_auth on target_auth.id = log.target_user_id
  left join public.users as target_user on target_user.id = log.target_user_id
  left join public.doctors as target_doctor on target_doctor.user_id = log.target_user_id
  where v_action is null or log.action = v_action
  order by log.created_at desc, log.id desc
  limit p_limit offset p_offset;
end;
$$;

revoke all on function public.admin_get_dashboard_counts()
  from public, anon, authenticated;
revoke all on function public.admin_list_departments()
  from public, anon, authenticated;
revoke all on function public.admin_create_department(text, text, text[], integer)
  from public, anon, authenticated;
revoke all on function public.admin_update_department(uuid, text, text, text[], integer)
  from public, anon, authenticated;
revoke all on function public.admin_set_department_active(uuid, boolean)
  from public, anon, authenticated;
revoke all on function public.admin_list_users(text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.admin_get_actions(integer, integer, text)
  from public, anon, authenticated;

grant execute on function public.admin_get_dashboard_counts()
  to authenticated;
grant execute on function public.admin_list_departments()
  to authenticated;
grant execute on function public.admin_create_department(text, text, text[], integer)
  to authenticated;
grant execute on function public.admin_update_department(uuid, text, text, text[], integer)
  to authenticated;
grant execute on function public.admin_set_department_active(uuid, boolean)
  to authenticated;
grant execute on function public.admin_list_users(text, text, integer, integer)
  to authenticated;
grant execute on function public.admin_get_actions(integer, integer, text)
  to authenticated;
