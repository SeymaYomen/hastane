-- Structured clinical notes (free text and SOAP), without AI-generated content.

alter table public.visit_notes
  add column if not exists note_format text not null default 'free_text',
  add column if not exists subjective text,
  add column if not exists objective text,
  add column if not exists assessment text,
  add column if not exists plan text;

alter table public.visit_notes
  add constraint visit_notes_note_format_check
    check (note_format in ('free_text', 'soap')),
  add constraint visit_notes_subjective_length
    check (subjective is null or char_length(subjective) <= 5000),
  add constraint visit_notes_objective_length
    check (objective is null or char_length(objective) <= 5000),
  add constraint visit_notes_assessment_length
    check (assessment is null or char_length(assessment) <= 5000),
  add constraint visit_notes_plan_length
    check (plan is null or char_length(plan) <= 5000);

drop function if exists public.get_doctor_appointment_detail(uuid);

create function public.get_doctor_appointment_detail(p_appointment_id uuid)
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
  note_format text,
  subjective text,
  objective text,
  assessment text,
  plan text,
  follow_up_required boolean,
  follow_up_date date,
  follow_up_note text,
  visit_created_at timestamptz,
  visit_updated_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.user_id, u.full_name, a.date, a.time, a.status, a.notes,
    vn.id, vn.clinical_note, coalesce(vn.note_format, 'free_text'),
    vn.subjective, vn.objective, vn.assessment, vn.plan,
    coalesce(vn.follow_up_required, false), vn.follow_up_date,
    vn.follow_up_note, vn.created_at, vn.updated_at
  from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  join public.user_roles ur on ur.user_id = d.user_id
  join public.users u on u.id = a.user_id
  left join public.visit_notes vn on vn.appointment_id = a.id
  where auth.uid() is not null
    and ur.role = 'doctor'
    and d.user_id = auth.uid()
    and a.id = p_appointment_id;
$$;

revoke all on function public.get_doctor_appointment_detail(uuid) from public, anon;
grant execute on function public.get_doctor_appointment_detail(uuid) to authenticated;

drop function if exists public.save_doctor_visit_note(uuid, text, boolean, date, text, boolean);

create function public.save_doctor_visit_note(
  p_appointment_id uuid,
  p_clinical_note text,
  p_follow_up_required boolean,
  p_follow_up_date date default null,
  p_follow_up_note text default null,
  p_mark_completed boolean default false,
  p_note_format text default 'free_text',
  p_subjective text default null,
  p_objective text default null,
  p_assessment text default null,
  p_plan text default null
)
returns table (visit_note_id uuid, appointment_status text, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_doctor_id uuid;
  v_patient_id uuid;
  v_appointment_date date;
  v_appointment_status text;
  v_clinical_note text := coalesce(p_clinical_note, '');
  v_follow_up_note text;
  v_subjective text := nullif(btrim(coalesce(p_subjective, '')), '');
  v_objective text := nullif(btrim(coalesce(p_objective, '')), '');
  v_assessment text := nullif(btrim(coalesce(p_assessment, '')), '');
  v_plan text := nullif(btrim(coalesce(p_plan, '')), '');
  v_saved public.visit_notes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select d.id into v_doctor_id
  from public.doctors d
  join public.user_roles ur on ur.user_id = d.user_id
  where d.user_id = auth.uid() and ur.role = 'doctor';

  if v_doctor_id is null then
    raise exception 'Doktor yetkisi veya doktor kaydı bulunamadı.' using errcode = '42501';
  end if;

  select a.user_id, a.date, a.status
  into v_patient_id, v_appointment_date, v_appointment_status
  from public.appointments a
  where a.id = p_appointment_id and a.doctor_id = v_doctor_id
  for update;

  if not found then
    raise exception 'Randevu bulunamadı veya bu randevuya erişim yetkiniz yok.' using errcode = '42501';
  end if;
  if v_appointment_status in ('cancelled', 'no_show') then
    raise exception 'İptal veya gelmedi durumundaki randevu için muayene kaydı düzenlenemez.';
  end if;
  if p_note_format not in ('free_text', 'soap') then
    raise exception 'Geçersiz klinik not türü.';
  end if;
  if char_length(v_clinical_note) > 10000 then
    raise exception 'Doktor muayene notu 10000 karakteri aşamaz.';
  end if;
  if coalesce(char_length(v_subjective), 0) > 5000
    or coalesce(char_length(v_objective), 0) > 5000
    or coalesce(char_length(v_assessment), 0) > 5000
    or coalesce(char_length(v_plan), 0) > 5000 then
    raise exception 'SOAP alanlarının her biri 5000 karakteri aşamaz.';
  end if;

  if p_note_format = 'free_text' then
    v_subjective := null; v_objective := null; v_assessment := null; v_plan := null;
    if p_mark_completed and btrim(v_clinical_note) = '' then
      raise exception 'Muayeneyi tamamlamak için doktor muayene notu gereklidir.';
    end if;
  else
    v_clinical_note := '';
    if v_subjective is null and v_objective is null and v_assessment is null and v_plan is null then
      raise exception 'SOAP kaydı için en az bir alan doldurulmalıdır.';
    end if;
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

  insert into public.visit_notes as vn (
    appointment_id, doctor_id, patient_id, clinical_note, note_format,
    subjective, objective, assessment, plan, follow_up_required,
    follow_up_date, follow_up_note
  ) values (
    p_appointment_id, v_doctor_id, v_patient_id, v_clinical_note, p_note_format,
    v_subjective, v_objective, v_assessment, v_plan, p_follow_up_required,
    p_follow_up_date, v_follow_up_note
  )
  on conflict (appointment_id) do update set
    doctor_id = excluded.doctor_id,
    patient_id = excluded.patient_id,
    clinical_note = excluded.clinical_note,
    note_format = excluded.note_format,
    subjective = excluded.subjective,
    objective = excluded.objective,
    assessment = excluded.assessment,
    plan = excluded.plan,
    follow_up_required = excluded.follow_up_required,
    follow_up_date = excluded.follow_up_date,
    follow_up_note = excluded.follow_up_note,
    updated_at = now()
  returning vn.* into v_saved;

  if p_mark_completed and v_appointment_status <> 'completed' then
    update public.appointments set status = 'completed' where id = p_appointment_id;
    v_appointment_status := 'completed';
  end if;

  return query select v_saved.id, v_appointment_status, v_saved.updated_at;
end;
$$;

revoke all on function public.save_doctor_visit_note(uuid, text, boolean, date, text, boolean, text, text, text, text, text) from public, anon;
grant execute on function public.save_doctor_visit_note(uuid, text, boolean, date, text, boolean, text, text, text, text, text) to authenticated;

drop function if exists public.get_doctor_patient_timeline(uuid);

create function public.get_doctor_patient_timeline(p_patient_id uuid)
returns table (
  appointment_id uuid, appointment_date date, appointment_time time,
  appointment_status text, department text, clinical_note text, note_format text,
  subjective text, objective text, assessment text, plan text,
  follow_up_required boolean, follow_up_date date, follow_up_note text
)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.date, a.time, a.status, d.department, vn.clinical_note,
    coalesce(vn.note_format, 'free_text'), vn.subjective, vn.objective,
    vn.assessment, vn.plan, coalesce(vn.follow_up_required, false),
    vn.follow_up_date, vn.follow_up_note
  from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  join public.user_roles ur on ur.user_id = d.user_id
  left join public.visit_notes vn on vn.appointment_id = a.id and vn.doctor_id = d.id
  where auth.uid() is not null and d.user_id = auth.uid()
    and ur.role = 'doctor' and a.user_id = p_patient_id
  order by a.date desc, a.time desc;
$$;

revoke all on function public.get_doctor_patient_timeline(uuid) from public, anon;
grant execute on function public.get_doctor_patient_timeline(uuid) to authenticated;

drop function if exists public.get_doctor_visits();

create function public.get_doctor_visits()
returns table (
  appointment_id uuid, patient_id uuid, patient_name text,
  appointment_date date, appointment_time time, note_format text,
  follow_up_required boolean, follow_up_date date
)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.user_id, u.full_name, a.date, a.time,
    vn.note_format, vn.follow_up_required, vn.follow_up_date
  from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  join public.user_roles ur on ur.user_id = d.user_id
  join public.users u on u.id = a.user_id
  join public.visit_notes vn on vn.appointment_id = a.id and vn.doctor_id = d.id
  where auth.uid() is not null and d.user_id = auth.uid()
    and ur.role = 'doctor' and a.status = 'completed'
  order by a.date desc, a.time desc;
$$;

revoke all on function public.get_doctor_visits() from public, anon;
grant execute on function public.get_doctor_visits() to authenticated;

-- get_my_follow_up_plans intentionally remains unchanged and returns no clinical fields.
