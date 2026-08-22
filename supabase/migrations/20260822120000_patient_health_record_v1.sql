-- Patient Health Record V1: patient-safe completed visit and follow-up history.

create or replace function public.get_my_health_record()
returns table (
  appointment_id uuid,
  appointment_date date,
  appointment_time time,
  doctor_name text,
  doctor_title text,
  department text,
  follow_up_required boolean,
  follow_up_date date,
  follow_up_note text,
  follow_up_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.user_roles as ur
    where ur.user_id = auth.uid() and ur.role = 'patient'
  ) then
    raise exception 'Hasta yetkisi bulunamadı.' using errcode = '42501';
  end if;

  return query
  select
    a.id, a.date, a.time, d.full_name, d.title, d.department,
    coalesce(vn.follow_up_required, false), vn.follow_up_date,
    vn.follow_up_note, vn.updated_at
  from public.appointments as a
  join public.doctors as d on d.id = a.doctor_id
  left join public.visit_notes as vn
    on vn.appointment_id = a.id and vn.patient_id = auth.uid()
  where a.user_id = auth.uid() and a.status = 'completed'
  order by a.date desc, a.time desc;
end;
$$;

revoke all on function public.get_my_health_record() from public, anon;
grant execute on function public.get_my_health_record() to authenticated;
