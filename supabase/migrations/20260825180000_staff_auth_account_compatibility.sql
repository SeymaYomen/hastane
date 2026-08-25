-- Allow staff Auth identities without weakening the patient identity contract.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text := nullif(btrim(new.raw_user_meta_data->>'full_name'), '');
  v_tckn text := nullif(btrim(new.raw_user_meta_data->>'tckn'), '');
  v_email text := nullif(btrim(new.email), '');
begin
  if v_full_name is not null
    and v_tckn is not null
    and v_email is not null then
    insert into public.users (id, email, full_name, tckn)
    values (new.id, v_email, v_full_name, v_tckn);
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user()
  from public, anon, authenticated;
