-- Doctor-owned clinical notes and patient-safe follow-up plans.

create table public.visit_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique
    references public.appointments(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id),
  patient_id uuid not null references public.users(id) on delete cascade,
  clinical_note text not null default '',
  follow_up_required boolean not null default false,
  follow_up_date date,
  follow_up_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_notes_clinical_note_length
    check (char_length(clinical_note) <= 10000),
  constraint visit_notes_follow_up_note_length
    check (follow_up_note is null or char_length(follow_up_note) <= 2000),
  constraint visit_notes_follow_up_fields
    check (follow_up_required or (follow_up_date is null and follow_up_note is null))
);

alter table public.visit_notes enable row level security;

-- No direct table access is granted. All access goes through the RPCs below.
revoke all on table public.visit_notes from public, anon, authenticated;

create or replace function public.get_doctor_appointment_detail(
  p_appointment_id uuid
)
returns table (
  appointment_id uuid,
  patient_id uuid,
  patient_name text,
  appointment_date date,
  appointment_time time,
  appointment_status text,
  appointment_notes text,
  visit_note_id uuid,
  clinical_note text,
  follow_up_required boolean,
  follow_up_date date,
  follow_up_note text,
  visit_created_at timestamptz,
  visit_updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.user_id,
    u.full_name,
    a.date,
    a.time,
    a.status,
    a.notes,
    vn.id,
    vn.clinical_note,
    coalesce(vn.follow_up_required, false),
    vn.follow_up_date,
    vn.follow_up_note,
    vn.created_at,
    vn.updated_at
  from public.appointments as a
  join public.doctors as d on d.id = a.doctor_id
  join public.user_roles as ur on ur.user_id = d.user_id
  join public.users as u on u.id = a.user_id
  left join public.visit_notes as vn on vn.appointment_id = a.id
  where auth.uid() is not null
    and ur.role = 'doctor'
    and d.user_id = auth.uid()
    and a.id = p_appointment_id;
$$;

revoke all on function public.get_doctor_appointment_detail(uuid) from public, anon;
grant execute on function public.get_doctor_appointment_detail(uuid) to authenticated;

create or replace function public.save_doctor_visit_note(
  p_appointment_id uuid,
  p_clinical_note text,
  p_follow_up_required boolean,
  p_follow_up_date date default null,
  p_follow_up_note text default null,
  p_mark_completed boolean default false
)
returns table (
  visit_note_id uuid,
  appointment_status text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctor_id uuid;
  v_patient_id uuid;
  v_appointment_date date;
  v_appointment_status text;
  v_clinical_note text := coalesce(p_clinical_note, '');
  v_follow_up_note text;
  v_saved public.visit_notes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select d.id
  into v_doctor_id
  from public.doctors as d
  join public.user_roles as ur on ur.user_id = d.user_id
  where d.user_id = auth.uid()
    and ur.role = 'doctor';

  if v_doctor_id is null then
    raise exception 'Doktor yetkisi veya doktor kaydı bulunamadı.' using errcode = '42501';
  end if;

  select a.user_id, a.date, a.status
  into v_patient_id, v_appointment_date, v_appointment_status
  from public.appointments as a
  where a.id = p_appointment_id
    and a.doctor_id = v_doctor_id
  for update;

  if not found then
    raise exception 'Randevu bulunamadı veya bu randevuya erişim yetkiniz yok.' using errcode = '42501';
  end if;

  if v_appointment_status = 'cancelled' then
    raise exception 'İptal edilmiş randevu için muayene kaydı oluşturulamaz.';
  end if;

  if char_length(v_clinical_note) > 10000 then
    raise exception 'Doktor muayene notu 10000 karakteri aşamaz.';
  end if;

  if p_follow_up_required then
    v_follow_up_note := nullif(btrim(coalesce(p_follow_up_note, '')), '');

    if v_follow_up_note is not null and char_length(v_follow_up_note) > 2000 then
      raise exception 'Kontrol notu 2000 karakteri aşamaz.';
    end if;

    if p_follow_up_date is not null and p_follow_up_date < v_appointment_date then
      raise exception 'Kontrol tarihi randevu tarihinden önce olamaz.';
    end if;
  else
    p_follow_up_date := null;
    v_follow_up_note := null;
  end if;

  if p_mark_completed and btrim(v_clinical_note) = '' then
    raise exception 'Muayeneyi tamamlamak için doktor muayene notu gereklidir.';
  end if;

  insert into public.visit_notes as vn (
    appointment_id,
    doctor_id,
    patient_id,
    clinical_note,
    follow_up_required,
    follow_up_date,
    follow_up_note
  ) values (
    p_appointment_id,
    v_doctor_id,
    v_patient_id,
    v_clinical_note,
    p_follow_up_required,
    p_follow_up_date,
    v_follow_up_note
  )
  on conflict (appointment_id) do update
  set doctor_id = excluded.doctor_id,
      patient_id = excluded.patient_id,
      clinical_note = excluded.clinical_note,
      follow_up_required = excluded.follow_up_required,
      follow_up_date = excluded.follow_up_date,
      follow_up_note = excluded.follow_up_note,
      updated_at = now()
  returning vn.* into v_saved;

  if p_mark_completed and v_appointment_status <> 'completed' then
    update public.appointments as a
    set status = 'completed'
    where a.id = p_appointment_id;

    v_appointment_status := 'completed';
  end if;

  return query
  select v_saved.id, v_appointment_status, v_saved.updated_at;
end;
$$;

revoke all on function public.save_doctor_visit_note(uuid, text, boolean, date, text, boolean) from public, anon;
grant execute on function public.save_doctor_visit_note(uuid, text, boolean, date, text, boolean) to authenticated;

create or replace function public.get_my_follow_up_plans()
returns table (
  appointment_id uuid,
  doctor_name text,
  department text,
  appointment_date date,
  follow_up_required boolean,
  follow_up_date date,
  follow_up_note text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    d.full_name,
    d.department,
    a.date,
    vn.follow_up_required,
    vn.follow_up_date,
    vn.follow_up_note,
    vn.updated_at
  from public.appointments as a
  join public.visit_notes as vn on vn.appointment_id = a.id
  join public.doctors as d on d.id = a.doctor_id
  join public.user_roles as ur on ur.user_id = a.user_id
  where auth.uid() is not null
    and ur.role = 'patient'
    and a.user_id = auth.uid()
    and vn.patient_id = auth.uid()
    and a.status = 'completed'
  order by a.date desc, a.time desc;
$$;

revoke all on function public.get_my_follow_up_plans() from public, anon;
grant execute on function public.get_my_follow_up_plans() to authenticated;
