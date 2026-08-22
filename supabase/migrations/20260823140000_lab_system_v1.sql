-- Patient Health Record V2B: secure laboratory orders and immutable item outcomes.

create table public.lab_test_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  default_unit text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_test_catalog_code_valid check (
    code = btrim(code) and char_length(code) between 1 and 100
  ),
  constraint lab_test_catalog_display_name_valid check (
    display_name = btrim(display_name) and char_length(display_name) between 1 and 200
  ),
  constraint lab_test_catalog_default_unit_length check (
    default_unit is null or (
      default_unit = btrim(default_unit) and char_length(default_unit) between 1 and 100
    )
  )
);

create table public.lab_orders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id),
  patient_id uuid not null references public.users(id) on delete cascade,
  order_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_orders_appointment_unique unique (appointment_id),
  constraint lab_orders_note_length check (
    order_note is null or char_length(order_note) <= 2000
  )
);

create table public.lab_order_items (
  id uuid primary key default gen_random_uuid(),
  lab_order_id uuid not null references public.lab_orders(id) on delete cascade,
  test_catalog_id uuid references public.lab_test_catalog(id),
  test_name text not null,
  status text not null default 'requested',
  result_value_numeric numeric,
  result_text text,
  unit text,
  reference_min numeric,
  reference_max numeric,
  reference_text text,
  result_note text,
  requested_at timestamptz not null default now(),
  resulted_at timestamptz,
  cancelled_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_order_items_sort_unique unique (lab_order_id, sort_order),
  constraint lab_order_items_status_check check (status in ('requested', 'resulted', 'cancelled')),
  constraint lab_order_items_test_name_valid check (
    test_name = btrim(test_name) and char_length(test_name) between 1 and 200
  ),
  constraint lab_order_items_result_text_length check (
    result_text is null or char_length(result_text) <= 1000
  ),
  constraint lab_order_items_unit_length check (unit is null or char_length(unit) <= 100),
  constraint lab_order_items_reference_text_length check (
    reference_text is null or char_length(reference_text) <= 500
  ),
  constraint lab_order_items_result_note_length check (
    result_note is null or char_length(result_note) <= 2000
  ),
  constraint lab_order_items_sort_range check (sort_order between 0 and 10000),
  constraint lab_order_items_state_consistency check (
    (
      status = 'requested'
      and resulted_at is null and cancelled_at is null
      and result_value_numeric is null and result_text is null
      and reference_min is null and reference_max is null
      and reference_text is null and result_note is null
    ) or (
      status = 'resulted'
      and resulted_at is not null and cancelled_at is null
      and (result_value_numeric is not null or nullif(btrim(result_text), '') is not null)
    ) or (
      status = 'cancelled'
      and cancelled_at is not null and resulted_at is null
      and result_value_numeric is null and result_text is null
      and reference_min is null and reference_max is null
      and reference_text is null and result_note is null
    )
  )
);

create index lab_orders_patient_created_idx on public.lab_orders (patient_id, created_at desc);
create index lab_orders_doctor_created_idx on public.lab_orders (doctor_id, created_at desc);
create index lab_order_items_status_idx on public.lab_order_items (lab_order_id, status);

alter table public.lab_test_catalog enable row level security;
alter table public.lab_orders enable row level security;
alter table public.lab_order_items enable row level security;

revoke all on table public.lab_test_catalog from public, anon, authenticated;
revoke all on table public.lab_orders from public, anon, authenticated;
revoke all on table public.lab_order_items from public, anon, authenticated;

create function public.get_lab_test_catalog()
returns table (id uuid, code text, display_name text, default_unit text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.doctors as d
    join public.user_roles as ur on ur.user_id = d.user_id
    where d.user_id = auth.uid() and ur.role = 'doctor'
  ) then
    raise exception 'Doktor yetkisi bulunamadı.' using errcode = '42501';
  end if;

  return query
  select c.id, c.code, c.display_name, c.default_unit
  from public.lab_test_catalog as c
  where c.active
  order by c.display_name, c.code;
end;
$$;

revoke all on function public.get_lab_test_catalog() from public, anon;
grant execute on function public.get_lab_test_catalog() to authenticated;

create function public.get_doctor_lab_order(p_appointment_id uuid)
returns table (
  lab_order_id uuid,
  appointment_id uuid,
  order_note text,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
)
language plpgsql stable security definer set search_path = ''
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
  select lo.id, lo.appointment_id, lo.order_note, lo.created_at, lo.updated_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', li.id,
        'test_catalog_id', li.test_catalog_id,
        'test_name', li.test_name,
        'status', li.status,
        'result_value_numeric', li.result_value_numeric,
        'result_text', li.result_text,
        'unit', li.unit,
        'reference_min', li.reference_min,
        'reference_max', li.reference_max,
        'reference_text', li.reference_text,
        'result_note', li.result_note,
        'requested_at', li.requested_at,
        'resulted_at', li.resulted_at,
        'cancelled_at', li.cancelled_at,
        'sort_order', li.sort_order
      ) order by li.sort_order, li.created_at, li.id)
      from public.lab_order_items as li where li.lab_order_id = lo.id
    ), '[]'::jsonb)
  from public.lab_orders as lo
  where lo.appointment_id = p_appointment_id and lo.doctor_id = v_doctor_id;
end;
$$;

revoke all on function public.get_doctor_lab_order(uuid) from public, anon;
grant execute on function public.get_doctor_lab_order(uuid) to authenticated;

create function public.add_doctor_lab_tests(
  p_appointment_id uuid,
  p_order_note text,
  p_items jsonb
)
returns table (lab_order_id uuid, added_count integer, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_doctor_id uuid;
  v_patient_id uuid;
  v_appointment_status text;
  v_lab_order_id uuid;
  v_existing_doctor_id uuid;
  v_order_note text := nullif(btrim(coalesce(p_order_note, '')), '');
  v_item jsonb;
  v_item_count integer;
  v_existing_count integer;
  v_next_sort_order integer;
  v_catalog_id uuid;
  v_test_name text;
  v_default_unit text;
  v_updated_at timestamptz;
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

  select a.user_id, a.status into v_patient_id, v_appointment_status
  from public.appointments as a
  where a.id = p_appointment_id and a.doctor_id = v_doctor_id
  for update;
  if not found then
    raise exception 'Randevu bulunamadı veya bu randevuya erişim yetkiniz yok.' using errcode = '42501';
  end if;
  if v_appointment_status not in ('in_progress', 'completed') then
    raise exception 'Tetkik yalnızca devam eden veya tamamlanmış muayene için istenebilir.';
  end if;
  if v_order_note is not null and char_length(v_order_note) > 2000 then
    raise exception 'Hastaya gösterilecek tetkik notu 2000 karakteri aşamaz.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Tetkikler geçerli bir liste olmalıdır.';
  end if;
  if octet_length(p_items::text) > 50000 then
    raise exception 'Tetkik içeriği izin verilen boyutu aşıyor.';
  end if;
  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 then raise exception 'En az bir tetkik eklenmelidir.'; end if;
  if v_item_count > 50 then raise exception 'Bir isteme en fazla 50 tetkik eklenebilir.'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Her tetkik kalemi geçerli bir nesne olmalıdır.';
    end if;
    if exists (
      select 1 from jsonb_object_keys(v_item) as keys(item_key)
      where item_key not in ('test_catalog_id', 'test_name', 'sort_order')
    ) then
      raise exception 'Tetkik kaleminde desteklenmeyen alan bulunuyor.';
    end if;
    if v_item ? 'test_catalog_id'
      and jsonb_typeof(v_item->'test_catalog_id') not in ('string', 'null') then
      raise exception 'Tetkik katalog kimliği geçersiz.';
    end if;
    if v_item ? 'test_name' and jsonb_typeof(v_item->'test_name') not in ('string', 'null') then
      raise exception 'Tetkik adı metin olmalıdır.';
    end if;
    if not (v_item ? 'sort_order')
      or jsonb_typeof(v_item->'sort_order') <> 'number'
      or (v_item->>'sort_order') !~ '^[0-9]+$'
      or char_length(v_item->>'sort_order') > 5
      or (v_item->>'sort_order')::integer not between 0 and 10000 then
      raise exception 'Tetkik sıralaması geçersiz.';
    end if;

    v_catalog_id := null;
    v_test_name := nullif(btrim(coalesce(v_item->>'test_name', '')), '');
    if nullif(v_item->>'test_catalog_id', '') is not null then
      if (v_item->>'test_catalog_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception 'Tetkik katalog kimliği geçersiz.';
      end if;
      v_catalog_id := (v_item->>'test_catalog_id')::uuid;
      select c.display_name, c.default_unit into v_test_name, v_default_unit
      from public.lab_test_catalog as c where c.id = v_catalog_id and c.active;
      if not found then raise exception 'Aktif tetkik katalog kaydı bulunamadı.'; end if;
    else
      v_default_unit := null;
    end if;
    if v_test_name is null or char_length(v_test_name) not between 1 and 200 then
      raise exception 'Tetkik adı 1 ile 200 karakter arasında olmalıdır.';
    end if;
  end loop;

  if (
    select count(distinct (value->>'sort_order')::integer)
    from jsonb_array_elements(p_items)
  ) <> v_item_count then
    raise exception 'Tetkik sıralamaları benzersiz olmalıdır.';
  end if;

  select lo.id, lo.doctor_id into v_lab_order_id, v_existing_doctor_id
  from public.lab_orders as lo where lo.appointment_id = p_appointment_id for update;
  if v_lab_order_id is not null and v_existing_doctor_id <> v_doctor_id then
    raise exception 'Bu tetkik istemini düzenleme yetkiniz bulunmuyor.' using errcode = '42501';
  end if;
  if v_lab_order_id is null then
    insert into public.lab_orders as new_order (appointment_id, doctor_id, patient_id, order_note)
    values (p_appointment_id, v_doctor_id, v_patient_id, v_order_note)
    returning new_order.id, new_order.updated_at into v_lab_order_id, v_updated_at;
  else
    update public.lab_orders as lo
    set order_note = v_order_note, patient_id = v_patient_id, updated_at = now()
    where lo.id = v_lab_order_id and lo.doctor_id = v_doctor_id
    returning lo.updated_at into v_updated_at;
  end if;

  select count(*), coalesce(max(li.sort_order), -1) + 1
  into v_existing_count, v_next_sort_order
  from public.lab_order_items as li where li.lab_order_id = v_lab_order_id;
  if v_existing_count + v_item_count > 50 then
    raise exception 'Bir tetkik isteminde en fazla 50 kalem bulunabilir.';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
    order by (value->>'sort_order')::integer
  loop
    v_catalog_id := null;
    v_test_name := nullif(btrim(coalesce(v_item->>'test_name', '')), '');
    v_default_unit := null;
    if nullif(v_item->>'test_catalog_id', '') is not null then
      v_catalog_id := (v_item->>'test_catalog_id')::uuid;
      select c.display_name, c.default_unit into v_test_name, v_default_unit
      from public.lab_test_catalog as c where c.id = v_catalog_id and c.active;
    end if;
    insert into public.lab_order_items (
      lab_order_id, test_catalog_id, test_name, unit, sort_order
    ) values (
      v_lab_order_id, v_catalog_id, v_test_name, v_default_unit, v_next_sort_order
    );
    v_next_sort_order := v_next_sort_order + 1;
  end loop;

  return query select v_lab_order_id, v_item_count, v_updated_at;
end;
$$;

revoke all on function public.add_doctor_lab_tests(uuid, text, jsonb) from public, anon;
grant execute on function public.add_doctor_lab_tests(uuid, text, jsonb) to authenticated;

create function public.result_doctor_lab_item(
  p_item_id uuid,
  p_result_value_numeric numeric,
  p_result_text text,
  p_unit text,
  p_reference_min numeric,
  p_reference_max numeric,
  p_reference_text text,
  p_result_note text
)
returns table (item_id uuid, item_status text, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_doctor_id uuid;
  v_status text;
  v_result_text text := nullif(btrim(coalesce(p_result_text, '')), '');
  v_unit text := nullif(btrim(coalesce(p_unit, '')), '');
  v_reference_text text := nullif(btrim(coalesce(p_reference_text, '')), '');
  v_result_note text := nullif(btrim(coalesce(p_result_note, '')), '');
  v_updated_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.' using errcode = '42501'; end if;
  select d.id into v_doctor_id
  from public.doctors as d join public.user_roles as ur on ur.user_id = d.user_id
  where d.user_id = auth.uid() and ur.role = 'doctor';
  if v_doctor_id is null then raise exception 'Doktor yetkisi bulunamadı.' using errcode = '42501'; end if;

  select li.status into v_status
  from public.lab_order_items as li
  join public.lab_orders as lo on lo.id = li.lab_order_id and lo.doctor_id = v_doctor_id
  join public.appointments as a on a.id = lo.appointment_id and a.doctor_id = v_doctor_id
  where li.id = p_item_id
  for update of li;
  if not found then
    raise exception 'Tetkik bulunamadı veya bu tetkike erişim yetkiniz yok.' using errcode = '42501';
  end if;
  if v_status <> 'requested' then
    raise exception 'Yalnızca sonuç bekleyen tetkike sonuç girilebilir.';
  end if;
  if p_result_value_numeric is null and v_result_text is null then
    raise exception 'Sayısal sonuç veya metin sonucu girilmelidir.';
  end if;
  if coalesce(char_length(v_result_text), 0) > 1000 then raise exception 'Metin sonucu 1000 karakteri aşamaz.'; end if;
  if coalesce(char_length(v_unit), 0) > 100 then raise exception 'Birim 100 karakteri aşamaz.'; end if;
  if coalesce(char_length(v_reference_text), 0) > 500 then raise exception 'Referans açıklaması 500 karakteri aşamaz.'; end if;
  if coalesce(char_length(v_result_note), 0) > 2000 then raise exception 'Sonuç notu 2000 karakteri aşamaz.'; end if;

  update public.lab_order_items as li
  set status = 'resulted', result_value_numeric = p_result_value_numeric,
      result_text = v_result_text, unit = v_unit,
      reference_min = p_reference_min, reference_max = p_reference_max,
      reference_text = v_reference_text, result_note = v_result_note,
      resulted_at = now(), cancelled_at = null, updated_at = now()
  where li.id = p_item_id and li.status = 'requested'
  returning li.updated_at into v_updated_at;

  update public.lab_orders as lo set updated_at = now()
  where lo.id = (select li.lab_order_id from public.lab_order_items as li where li.id = p_item_id);
  return query select p_item_id, 'resulted'::text, v_updated_at;
end;
$$;

revoke all on function public.result_doctor_lab_item(uuid, numeric, text, text, numeric, numeric, text, text) from public, anon;
grant execute on function public.result_doctor_lab_item(uuid, numeric, text, text, numeric, numeric, text, text) to authenticated;

create function public.cancel_doctor_lab_item(p_item_id uuid)
returns table (item_id uuid, item_status text, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_doctor_id uuid;
  v_status text;
  v_lab_order_id uuid;
  v_updated_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.' using errcode = '42501'; end if;
  select d.id into v_doctor_id
  from public.doctors as d join public.user_roles as ur on ur.user_id = d.user_id
  where d.user_id = auth.uid() and ur.role = 'doctor';
  if v_doctor_id is null then raise exception 'Doktor yetkisi bulunamadı.' using errcode = '42501'; end if;

  select li.status, li.lab_order_id into v_status, v_lab_order_id
  from public.lab_order_items as li
  join public.lab_orders as lo on lo.id = li.lab_order_id and lo.doctor_id = v_doctor_id
  join public.appointments as a on a.id = lo.appointment_id and a.doctor_id = v_doctor_id
  where li.id = p_item_id
  for update of li;
  if not found then
    raise exception 'Tetkik bulunamadı veya bu tetkike erişim yetkiniz yok.' using errcode = '42501';
  end if;
  if v_status <> 'requested' then
    raise exception 'Yalnızca sonuç bekleyen tetkik iptal edilebilir.';
  end if;

  update public.lab_order_items as li
  set status = 'cancelled', cancelled_at = now(), resulted_at = null, updated_at = now()
  where li.id = p_item_id and li.status = 'requested'
  returning li.updated_at into v_updated_at;
  update public.lab_orders as lo set updated_at = now() where lo.id = v_lab_order_id;
  return query select p_item_id, 'cancelled'::text, v_updated_at;
end;
$$;

revoke all on function public.cancel_doctor_lab_item(uuid) from public, anon;
grant execute on function public.cancel_doctor_lab_item(uuid) to authenticated;

create function public.get_my_lab_orders()
returns table (
  lab_order_id uuid,
  appointment_id uuid,
  appointment_date date,
  appointment_time time,
  doctor_name text,
  doctor_title text,
  department text,
  order_note text,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.user_roles as ur
    where ur.user_id = auth.uid() and ur.role = 'patient'
  ) then
    raise exception 'Hasta yetkisi bulunamadı.' using errcode = '42501';
  end if;

  return query
  select lo.id, lo.appointment_id, a.date, a.time,
    d.full_name, d.title, d.department, lo.order_note, lo.created_at, lo.updated_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'test_name', li.test_name,
        'status', li.status,
        'result_value_numeric', li.result_value_numeric,
        'result_text', li.result_text,
        'unit', li.unit,
        'reference_min', li.reference_min,
        'reference_max', li.reference_max,
        'reference_text', li.reference_text,
        'result_note', li.result_note,
        'requested_at', li.requested_at,
        'resulted_at', li.resulted_at,
        'cancelled_at', li.cancelled_at,
        'sort_order', li.sort_order
      ) order by li.sort_order, li.created_at, li.id)
      from public.lab_order_items as li where li.lab_order_id = lo.id
    ), '[]'::jsonb)
  from public.lab_orders as lo
  join public.appointments as a
    on a.id = lo.appointment_id and a.user_id = auth.uid()
  join public.doctors as d on d.id = lo.doctor_id and d.id = a.doctor_id
  where lo.patient_id = auth.uid()
  order by a.date desc, a.time desc, lo.created_at desc;
end;
$$;

revoke all on function public.get_my_lab_orders() from public, anon;
grant execute on function public.get_my_lab_orders() to authenticated;
