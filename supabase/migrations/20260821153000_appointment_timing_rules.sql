-- Enforce appointment timing rules and separate scheduled appointments from visits.

create or replace function public.update_doctor_appointment_status(
  p_appointment_id uuid,
  p_status text
)
returns table (appointment_id uuid, appointment_status text, status_updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_doctor_id uuid;
  v_current_status text;
  v_appointment_date date;
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
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

  select a.status, a.date into v_current_status, v_appointment_date
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

  if p_status = 'in_progress' and v_appointment_date <> v_today then
    raise exception 'Muayene yalnızca randevu tarihinde başlatılabilir.';
  end if;

  if p_status = 'no_show' and v_appointment_date > v_today then
    raise exception 'Gelecek tarihli randevu gelmedi olarak işaretlenemez.';
  end if;

  update public.appointments a set status = p_status
  where a.id = p_appointment_id
  returning a.status_updated_at into v_updated_at;

  return query select p_appointment_id, p_status, v_updated_at;
end;
$$;

revoke all on function public.update_doctor_appointment_status(uuid, text) from public, anon;
grant execute on function public.update_doctor_appointment_status(uuid, text) to authenticated;

drop function if exists public.get_doctor_patients();

create function public.get_doctor_patients()
returns table (
  patient_id uuid,
  patient_name text,
  last_appointment_at timestamptz,
  appointment_count bigint,
  next_appointment_date date
)
language sql stable security definer set search_path = ''
as $$
  select
    a.user_id,
    u.full_name,
    max((a.date + a.time) at time zone 'Europe/Istanbul')
      filter (where a.status = 'completed'),
    count(*) filter (where a.status = 'completed'),
    min(a.date) filter (
      where a.status in ('pending', 'confirmed', 'in_progress')
        and a.date >= (now() at time zone 'Europe/Istanbul')::date
    )
  from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  join public.user_roles ur on ur.user_id = d.user_id
  join public.users u on u.id = a.user_id
  where auth.uid() is not null
    and d.user_id = auth.uid() and ur.role = 'doctor'
  group by a.user_id, u.full_name
  order by max((a.date + a.time) at time zone 'Europe/Istanbul')
    filter (where a.status = 'completed') desc nulls last, u.full_name;
$$;

revoke all on function public.get_doctor_patients() from public, anon;
grant execute on function public.get_doctor_patients() to authenticated;
