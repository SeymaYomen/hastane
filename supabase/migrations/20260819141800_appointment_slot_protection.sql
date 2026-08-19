-- Prevent double booking for active appointments.
-- Cancelled appointments do not block the same slot.

create unique index if not exists appointments_unique_active_slot
on public.appointments (doctor_id, date, time)
where status <> 'cancelled';


-- Return only booked times for a doctor/date.
-- No patient or appointment-owner information is exposed.

create or replace function public.get_booked_times(
  p_doctor_id uuid,
  p_date date
)
returns table (
  booked_time time
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.time as booked_time
  from public.appointments as a
  where a.doctor_id = p_doctor_id
    and a.date = p_date
    and a.status <> 'cancelled'
  order by a.time;
$$;


-- Restrict RPC access to authenticated users only.

revoke all
on function public.get_booked_times(uuid, date)
from public;

revoke all
on function public.get_booked_times(uuid, date)
from anon;

grant execute
on function public.get_booked_times(uuid, date)
to authenticated;