-- Prevent visit-note saves from bypassing canonical appointment transitions.

create or replace function public.save_doctor_visit_note(
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
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
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

  if p_mark_completed then
    if v_appointment_date > v_today then
      raise exception 'Gelecek tarihli randevu tamamlanamaz.';
    end if;
    if v_appointment_status <> 'in_progress' then
      raise exception 'Muayene tamamlanmadan önce başlatılmalıdır.';
    end if;
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

  if p_mark_completed then
    update public.appointments set status = 'completed' where id = p_appointment_id;
    v_appointment_status := 'completed';
  end if;

  return query select v_saved.id, v_appointment_status, v_saved.updated_at;
end;
$$;

revoke all on function public.save_doctor_visit_note(uuid, text, boolean, date, text, boolean, text, text, text, text, text) from public, anon;
grant execute on function public.save_doctor_visit_note(uuid, text, boolean, date, text, boolean, text, text, text, text, text) to authenticated;
