-- =========================================================
-- Doctor account linkage and appointment access
-- =========================================================

-- 1. Doktor kaydını auth kullanıcısına bağlama
alter table public.doctors
add column if not exists user_id uuid
references auth.users(id)
on delete set null;

-- Bir kullanıcı yalnızca bir doktor kaydına bağlanabilir
create unique index if not exists doctors_user_id_unique
on public.doctors(user_id)
where user_id is not null;


-- =========================================================
-- 2. Doktorun yalnızca kendisine atanmış randevuları okuması
-- =========================================================

drop policy if exists "Doctors can read assigned appointments"
on public.appointments;

create policy "Doctors can read assigned appointments"
on public.appointments
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors d
    join public.user_roles ur
      on ur.user_id = d.user_id
    where d.id = appointments.doctor_id
      and d.user_id = auth.uid()
      and ur.role = 'doctor'
  )
);


-- =========================================================
-- 3. Doktorun günlük randevularını güvenli biçimde getiren RPC
-- =========================================================

create or replace function public.get_doctor_day_appointments(
  p_date date
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
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id as appointment_id,
    a.user_id as patient_id,
    u.full_name as patient_name,
    a.date as appointment_date,
    a.time as appointment_time,
    a.status as appointment_status,
    a.notes as appointment_notes
  from public.appointments a
  join public.doctors d
    on d.id = a.doctor_id
  join public.user_roles ur
    on ur.user_id = d.user_id
  join public.users u
    on u.id = a.user_id
  where d.user_id = auth.uid()
    and ur.role = 'doctor'
    and a.date = p_date
  order by a.time;
$$;

revoke all
on function public.get_doctor_day_appointments(date)
from public;

revoke all
on function public.get_doctor_day_appointments(date)
from anon;

grant execute
on function public.get_doctor_day_appointments(date)
to authenticated;
