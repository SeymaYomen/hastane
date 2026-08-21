-- Doctor Workspace V1: canonical appointment states, audit history and scoped RPCs.

-- Normalize legacy data before enabling the audit trigger.
update public.appointments
set status = 'confirmed'
where status = 'upcoming';

alter table public.appointments
  alter column status set default 'pending';

alter table public.appointments
  add column if not exists status_updated_at timestamptz not null default now();

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'));

create table public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index appointment_status_history_appointment_id_idx
  on public.appointment_status_history (appointment_id);
create index appointment_status_history_changed_at_idx
  on public.appointment_status_history (changed_at);

alter table public.appointment_status_history enable row level security;
revoke all on table public.appointment_status_history from public, anon, authenticated;

create or replace function public.log_appointment_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled')) or
      (old.status = 'confirmed' and new.status in ('in_progress', 'cancelled', 'no_show')) or
      (old.status = 'in_progress' and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'Geçersiz durum geçişi: % -> %', old.status, new.status;
    end if;
    new.status_updated_at := now();
    insert into public.appointment_status_history (
      appointment_id, from_status, to_status, changed_by
    ) values (
      new.id, old.status, new.status, auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists appointment_status_change_audit on public.appointments;
create trigger appointment_status_change_audit
before update of status on public.appointments
for each row execute function public.log_appointment_status_change();

-- Patients may still rate their own appointments, but status changes go through RPCs.
revoke update on table public.appointments from authenticated;
grant update (rating) on table public.appointments to authenticated;

create or replace function public.update_doctor_appointment_status(
  p_appointment_id uuid,
  p_status text
)
returns table (
  appointment_id uuid,
  appointment_status text,
  status_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctor_id uuid;
  v_current_status text;
  v_updated_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select d.id into v_doctor_id
  from public.doctors d
  join public.user_roles ur on ur.user_id = d.user_id
  where d.user_id = auth.uid() and ur.role = 'doctor';

  if v_doctor_id is null then
    raise exception 'Doktor yetkisi bulunamadı.' using errcode = '42501';
  end if;

  select a.status into v_current_status
  from public.appointments a
  where a.id = p_appointment_id and a.doctor_id = v_doctor_id
  for update;

  if not found then
    raise exception 'Randevu bulunamadı veya erişim yetkiniz yok.' using errcode = '42501';
  end if;

  if not (
    (v_current_status = 'pending' and p_status in ('confirmed', 'cancelled')) or
    (v_current_status = 'confirmed' and p_status in ('in_progress', 'cancelled', 'no_show')) or
    (v_current_status = 'in_progress' and p_status in ('completed', 'cancelled'))
  ) then
    raise exception 'Geçersiz durum geçişi: % -> %', v_current_status, p_status;
  end if;

  update public.appointments a
  set status = p_status
  where a.id = p_appointment_id
  returning a.status_updated_at into v_updated_at;

  return query select p_appointment_id, p_status, v_updated_at;
end;
$$;

revoke all on function public.update_doctor_appointment_status(uuid, text) from public, anon;
grant execute on function public.update_doctor_appointment_status(uuid, text) to authenticated;

create or replace function public.cancel_my_appointment(p_appointment_id uuid)
returns table (
  appointment_id uuid,
  appointment_status text,
  status_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_updated_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select a.status into v_status
  from public.appointments a
  join public.user_roles ur on ur.user_id = a.user_id
  where a.id = p_appointment_id
    and a.user_id = auth.uid()
    and ur.role = 'patient'
  for update;

  if not found then
    raise exception 'Randevu bulunamadı veya erişim yetkiniz yok.' using errcode = '42501';
  end if;
  if v_status not in ('pending', 'confirmed') then
    raise exception 'Bu randevu artık iptal edilemez.';
  end if;

  update public.appointments a set status = 'cancelled'
  where a.id = p_appointment_id
  returning a.status_updated_at into v_updated_at;

  return query select p_appointment_id, 'cancelled'::text, v_updated_at;
end;
$$;

revoke all on function public.cancel_my_appointment(uuid) from public, anon;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;

create or replace function public.get_doctor_appointments(
  p_start_date date,
  p_end_date date
)
returns table (
  appointment_id uuid,
  patient_id uuid,
  patient_name text,
  appointment_date date,
  appointment_time time,
  appointment_status text,
  appointment_notes text
)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.user_id, u.full_name, a.date, a.time, a.status, a.notes
  from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  join public.user_roles ur on ur.user_id = d.user_id
  join public.users u on u.id = a.user_id
  where auth.uid() is not null
    and d.user_id = auth.uid() and ur.role = 'doctor'
    and a.date between p_start_date and p_end_date
  order by a.date, a.time;
$$;

revoke all on function public.get_doctor_appointments(date, date) from public, anon;
grant execute on function public.get_doctor_appointments(date, date) to authenticated;

create or replace function public.get_doctor_patients()
returns table (
  patient_id uuid,
  patient_name text,
  last_appointment_at timestamptz,
  appointment_count bigint
)
language sql stable security definer set search_path = ''
as $$
  select a.user_id, u.full_name,
    max(a.date + a.time) at time zone 'Europe/Istanbul', count(*)
  from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  join public.user_roles ur on ur.user_id = d.user_id
  join public.users u on u.id = a.user_id
  where auth.uid() is not null
    and d.user_id = auth.uid() and ur.role = 'doctor'
  group by a.user_id, u.full_name
  order by max(a.date + a.time) desc;
$$;

revoke all on function public.get_doctor_patients() from public, anon;
grant execute on function public.get_doctor_patients() to authenticated;

create or replace function public.get_doctor_patient_timeline(p_patient_id uuid)
returns table (
  appointment_id uuid,
  appointment_date date,
  appointment_time time,
  appointment_status text,
  department text,
  clinical_note text,
  follow_up_required boolean,
  follow_up_date date,
  follow_up_note text
)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.date, a.time, a.status, d.department,
    vn.clinical_note, coalesce(vn.follow_up_required, false),
    vn.follow_up_date, vn.follow_up_note
  from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  join public.user_roles ur on ur.user_id = d.user_id
  left join public.visit_notes vn
    on vn.appointment_id = a.id and vn.doctor_id = d.id
  where auth.uid() is not null
    and d.user_id = auth.uid() and ur.role = 'doctor'
    and a.user_id = p_patient_id
  order by a.date desc, a.time desc;
$$;

revoke all on function public.get_doctor_patient_timeline(uuid) from public, anon;
grant execute on function public.get_doctor_patient_timeline(uuid) to authenticated;

create or replace function public.get_doctor_visits()
returns table (
  appointment_id uuid,
  patient_id uuid,
  patient_name text,
  appointment_date date,
  appointment_time time,
  follow_up_required boolean,
  follow_up_date date
)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.user_id, u.full_name, a.date, a.time,
    vn.follow_up_required, vn.follow_up_date
  from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  join public.user_roles ur on ur.user_id = d.user_id
  join public.users u on u.id = a.user_id
  join public.visit_notes vn on vn.appointment_id = a.id and vn.doctor_id = d.id
  where auth.uid() is not null
    and d.user_id = auth.uid() and ur.role = 'doctor'
    and a.status = 'completed'
  order by a.date desc, a.time desc;
$$;

revoke all on function public.get_doctor_visits() from public, anon;
grant execute on function public.get_doctor_visits() to authenticated;
