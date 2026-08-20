create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'patient'
    check (role in ('patient', 'doctor', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "Users can read own role"
on public.user_roles;

create policy "Users can read own role"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

revoke insert, update, delete
on public.user_roles
from anon, authenticated;

grant select
on public.user_roles
to authenticated;

insert into public.user_roles (user_id, role)
select id, 'patient'
from auth.users
on conflict (user_id) do nothing;

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'patient')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_role
on auth.users;

create trigger on_auth_user_created_role
after insert on auth.users
for each row
execute function public.handle_new_user_role();