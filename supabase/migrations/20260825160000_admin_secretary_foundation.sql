-- Admin + Secretary Foundation V1: exact role set, audited admin role changes,
-- and no direct frontend mutation privileges.

alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('patient', 'doctor', 'secretary', 'admin'));

revoke insert, update, delete on table public.user_roles
  from public, anon, authenticated;

create table public.admin_actions_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  target_user_id uuid references auth.users(id) on delete set null,
  old_value text,
  new_value text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index admin_actions_log_actor_created_idx
  on public.admin_actions_log (actor_user_id, created_at desc);
create index admin_actions_log_target_created_idx
  on public.admin_actions_log (target_user_id, created_at desc);

alter table public.admin_actions_log enable row level security;
revoke all on table public.admin_actions_log from public, anon, authenticated;

create function public.admin_set_user_role(
  p_user_id uuid,
  p_role text
)
returns table (
  target_user_id uuid,
  previous_role text,
  new_role text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_previous_role text;
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

  if p_user_id is null then
    raise exception 'Hedef kullanıcı gereklidir.' using errcode = '22023';
  end if;

  if p_role is null or p_role not in ('patient', 'doctor', 'secretary', 'admin') then
    raise exception 'Geçersiz kullanıcı rolü.' using errcode = '22023';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Yönetici kendi rolünü değiştiremez.' using errcode = '42501';
  end if;

  select ur.role into v_previous_role
  from public.user_roles as ur
  join auth.users as au on au.id = ur.user_id
  where ur.user_id = p_user_id
  for update of ur;

  if not found then
    raise exception 'Hedef kullanıcı veya rol kaydı bulunamadı.' using errcode = '22023';
  end if;

  if v_previous_role = 'doctor' or p_role = 'doctor' then
    raise exception 'Doktor rolü doktor yönetimi akışından değiştirilmelidir.' using errcode = '42501';
  end if;

  if v_previous_role = p_role then
    return query select p_user_id, v_previous_role, v_previous_role;
    return;
  end if;

  update public.user_roles as ur
  set role = p_role
  where ur.user_id = p_user_id;

  insert into public.admin_actions_log (
    actor_user_id,
    action,
    target_user_id,
    old_value,
    new_value,
    metadata
  ) values (
    auth.uid(),
    'user_role_changed',
    p_user_id,
    v_previous_role,
    p_role,
    '{}'::jsonb
  );

  return query select p_user_id, v_previous_role, p_role;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_user_role(uuid, text)
  to authenticated;
