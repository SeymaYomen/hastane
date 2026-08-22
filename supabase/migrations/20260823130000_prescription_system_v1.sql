-- Patient Health Record V2A: manual prescriptions linked to completed visits.

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id),
  patient_id uuid not null references public.users(id) on delete cascade,
  prescription_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescriptions_appointment_unique unique (appointment_id),
  constraint prescriptions_note_length check (
    prescription_note is null or char_length(prescription_note) <= 2000
  )
);

create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medication_name text not null,
  dose_instruction text,
  frequency text,
  duration text,
  usage_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescription_items_sort_order_unique unique (prescription_id, sort_order),
  constraint prescription_items_medication_name_valid check (
    medication_name = btrim(medication_name)
    and char_length(medication_name) between 1 and 200
  ),
  constraint prescription_items_dose_length check (
    dose_instruction is null or char_length(dose_instruction) <= 500
  ),
  constraint prescription_items_frequency_length check (
    frequency is null or char_length(frequency) <= 300
  ),
  constraint prescription_items_duration_length check (
    duration is null or char_length(duration) <= 300
  ),
  constraint prescription_items_usage_note_length check (
    usage_note is null or char_length(usage_note) <= 1000
  ),
  constraint prescription_items_sort_order_range check (sort_order between 0 and 10000)
);

create index prescriptions_patient_updated_idx
  on public.prescriptions (patient_id, updated_at desc);

create index prescriptions_doctor_updated_idx
  on public.prescriptions (doctor_id, updated_at desc);

alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;

revoke all on table public.prescriptions from public, anon, authenticated;
revoke all on table public.prescription_items from public, anon, authenticated;

create function public.get_doctor_prescription(p_appointment_id uuid)
returns table (
  prescription_id uuid,
  appointment_id uuid,
  prescription_note text,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_doctor_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select d.id into v_doctor_id
  from public.doctors as d
  join public.user_roles as ur on ur.user_id = d.user_id
  where d.user_id = auth.uid() and ur.role = 'doctor';

  if v_doctor_id is null then
    raise exception 'Doktor yetkisi veya doktor kaydı bulunamadı.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.appointments as a
    where a.id = p_appointment_id and a.doctor_id = v_doctor_id
  ) then
    raise exception 'Randevu bulunamadı veya bu randevuya erişim yetkiniz yok.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.appointment_id,
    p.prescription_note,
    p.created_at,
    p.updated_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'medication_name', pi.medication_name,
        'dose_instruction', pi.dose_instruction,
        'frequency', pi.frequency,
        'duration', pi.duration,
        'usage_note', pi.usage_note,
        'sort_order', pi.sort_order
      ) order by pi.sort_order, pi.id)
      from public.prescription_items as pi
      where pi.prescription_id = p.id
    ), '[]'::jsonb)
  from public.prescriptions as p
  where p.appointment_id = p_appointment_id
    and p.doctor_id = v_doctor_id;
end;
$$;

revoke all on function public.get_doctor_prescription(uuid) from public, anon;
grant execute on function public.get_doctor_prescription(uuid) to authenticated;

create function public.save_doctor_prescription(
  p_appointment_id uuid,
  p_prescription_note text,
  p_items jsonb
)
returns table (
  prescription_id uuid,
  appointment_id uuid,
  prescription_note text,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctor_id uuid;
  v_patient_id uuid;
  v_appointment_status text;
  v_prescription_id uuid;
  v_existing_doctor_id uuid;
  v_prescription_note text := nullif(btrim(coalesce(p_prescription_note, '')), '');
  v_item jsonb;
  v_item_count integer;
  v_medication_name text;
  v_dose_instruction text;
  v_frequency text;
  v_duration text;
  v_usage_note text;
  v_sort_order integer;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select d.id into v_doctor_id
  from public.doctors as d
  join public.user_roles as ur on ur.user_id = d.user_id
  where d.user_id = auth.uid() and ur.role = 'doctor';

  if v_doctor_id is null then
    raise exception 'Doktor yetkisi veya doktor kaydı bulunamadı.' using errcode = '42501';
  end if;

  select a.user_id, a.status
  into v_patient_id, v_appointment_status
  from public.appointments as a
  where a.id = p_appointment_id and a.doctor_id = v_doctor_id
  for update;

  if not found then
    raise exception 'Randevu bulunamadı veya bu randevuya erişim yetkiniz yok.' using errcode = '42501';
  end if;

  if v_appointment_status <> 'completed' then
    raise exception 'Reçete yalnızca tamamlanmış muayene için oluşturulabilir.';
  end if;

  if v_prescription_note is not null and char_length(v_prescription_note) > 2000 then
    raise exception 'Reçete doktor notu 2000 karakteri aşamaz.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Reçete ilaçları geçerli bir liste olmalıdır.';
  end if;

  if octet_length(p_items::text) > 50000 then
    raise exception 'Reçete içeriği izin verilen boyutu aşıyor.';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 then
    raise exception 'Reçetede en az bir ilaç bulunmalıdır.';
  end if;
  if v_item_count > 20 then
    raise exception 'Bir reçeteye en fazla 20 ilaç eklenebilir.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Her reçete kalemi geçerli bir nesne olmalıdır.';
    end if;

    if exists (
      select 1 from jsonb_object_keys(v_item) as keys(item_key)
      where item_key not in (
        'medication_name', 'dose_instruction', 'frequency',
        'duration', 'usage_note', 'sort_order'
      )
    ) then
      raise exception 'Reçete kaleminde desteklenmeyen alan bulunuyor.';
    end if;

    if not (v_item ? 'medication_name')
      or jsonb_typeof(v_item->'medication_name') <> 'string' then
      raise exception 'İlaç adı zorunludur.';
    end if;

    if (v_item ? 'dose_instruction' and jsonb_typeof(v_item->'dose_instruction') not in ('string', 'null'))
      or (v_item ? 'frequency' and jsonb_typeof(v_item->'frequency') not in ('string', 'null'))
      or (v_item ? 'duration' and jsonb_typeof(v_item->'duration') not in ('string', 'null'))
      or (v_item ? 'usage_note' and jsonb_typeof(v_item->'usage_note') not in ('string', 'null')) then
      raise exception 'Reçete kullanım alanları metin olmalıdır.';
    end if;

    if not (v_item ? 'sort_order')
      or jsonb_typeof(v_item->'sort_order') <> 'number'
      or (v_item->>'sort_order') !~ '^[0-9]+$' then
      raise exception 'Reçete kalemi sıralaması geçersiz.';
    end if;

    v_medication_name := btrim(v_item->>'medication_name');
    v_dose_instruction := nullif(btrim(coalesce(v_item->>'dose_instruction', '')), '');
    v_frequency := nullif(btrim(coalesce(v_item->>'frequency', '')), '');
    v_duration := nullif(btrim(coalesce(v_item->>'duration', '')), '');
    v_usage_note := nullif(btrim(coalesce(v_item->>'usage_note', '')), '');
    v_sort_order := (v_item->>'sort_order')::integer;

    if char_length(v_medication_name) not between 1 and 200 then
      raise exception 'İlaç adı 1 ile 200 karakter arasında olmalıdır.';
    end if;
    if coalesce(char_length(v_dose_instruction), 0) > 500 then
      raise exception 'Doz veya kullanım miktarı 500 karakteri aşamaz.';
    end if;
    if coalesce(char_length(v_frequency), 0) > 300 then
      raise exception 'Kullanım sıklığı 300 karakteri aşamaz.';
    end if;
    if coalesce(char_length(v_duration), 0) > 300 then
      raise exception 'Kullanım süresi 300 karakteri aşamaz.';
    end if;
    if coalesce(char_length(v_usage_note), 0) > 1000 then
      raise exception 'Ek kullanım notu 1000 karakteri aşamaz.';
    end if;
    if v_sort_order not between 0 and 10000 then
      raise exception 'Reçete kalemi sıralaması geçersiz.';
    end if;
  end loop;

  if (
    select count(distinct (value->>'sort_order')::integer)
    from jsonb_array_elements(p_items)
  ) <> v_item_count then
    raise exception 'Reçete kalemi sıralamaları benzersiz olmalıdır.';
  end if;

  select p.id, p.doctor_id
  into v_prescription_id, v_existing_doctor_id
  from public.prescriptions as p
  where p.appointment_id = p_appointment_id
  for update;

  if v_prescription_id is not null and v_existing_doctor_id <> v_doctor_id then
    raise exception 'Bu reçeteyi düzenleme yetkiniz bulunmuyor.' using errcode = '42501';
  end if;

  if v_prescription_id is null then
    insert into public.prescriptions (
      appointment_id, doctor_id, patient_id, prescription_note
    ) values (
      p_appointment_id, v_doctor_id, v_patient_id, v_prescription_note
    ) returning id into v_prescription_id;
  else
    update public.prescriptions as p
    set prescription_note = v_prescription_note,
        patient_id = v_patient_id,
        updated_at = now()
    where p.id = v_prescription_id and p.doctor_id = v_doctor_id;
  end if;

  delete from public.prescription_items as pi
  where pi.prescription_id = v_prescription_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.prescription_items (
      prescription_id, medication_name, dose_instruction, frequency,
      duration, usage_note, sort_order
    ) values (
      v_prescription_id,
      btrim(v_item->>'medication_name'),
      nullif(btrim(coalesce(v_item->>'dose_instruction', '')), ''),
      nullif(btrim(coalesce(v_item->>'frequency', '')), ''),
      nullif(btrim(coalesce(v_item->>'duration', '')), ''),
      nullif(btrim(coalesce(v_item->>'usage_note', '')), ''),
      (v_item->>'sort_order')::integer
    );
  end loop;

  return query
  select
    p.id,
    p.appointment_id,
    p.prescription_note,
    p.created_at,
    p.updated_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'medication_name', pi.medication_name,
        'dose_instruction', pi.dose_instruction,
        'frequency', pi.frequency,
        'duration', pi.duration,
        'usage_note', pi.usage_note,
        'sort_order', pi.sort_order
      ) order by pi.sort_order, pi.id)
      from public.prescription_items as pi
      where pi.prescription_id = p.id
    ), '[]'::jsonb)
  from public.prescriptions as p
  where p.id = v_prescription_id and p.doctor_id = v_doctor_id;
end;
$$;

revoke all on function public.save_doctor_prescription(uuid, text, jsonb) from public, anon;
grant execute on function public.save_doctor_prescription(uuid, text, jsonb) to authenticated;

create function public.get_my_prescriptions()
returns table (
  prescription_id uuid,
  appointment_id uuid,
  appointment_date date,
  appointment_time time,
  doctor_name text,
  doctor_title text,
  department text,
  prescription_note text,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
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
    p.id,
    p.appointment_id,
    a.date,
    a.time,
    d.full_name,
    d.title,
    d.department,
    p.prescription_note,
    p.created_at,
    p.updated_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'medication_name', pi.medication_name,
        'dose_instruction', pi.dose_instruction,
        'frequency', pi.frequency,
        'duration', pi.duration,
        'usage_note', pi.usage_note,
        'sort_order', pi.sort_order
      ) order by pi.sort_order, pi.id)
      from public.prescription_items as pi
      where pi.prescription_id = p.id
    ), '[]'::jsonb)
  from public.prescriptions as p
  join public.appointments as a
    on a.id = p.appointment_id
    and a.user_id = auth.uid()
    and a.status = 'completed'
  join public.doctors as d on d.id = p.doctor_id and d.id = a.doctor_id
  where p.patient_id = auth.uid()
  order by a.date desc, a.time desc, p.created_at desc;
end;
$$;

revoke all on function public.get_my_prescriptions() from public, anon;
grant execute on function public.get_my_prescriptions() to authenticated;
