-- Patient Health Record V2C: private, finalized medical documents.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-documents', 'medical-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.medical_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  uploaded_by_user_id uuid not null references public.users(id),
  uploader_role text not null,
  category text not null,
  title text not null,
  description text,
  original_file_name text not null,
  storage_path text not null unique,
  upload_status text not null default 'pending',
  intent_expires_at timestamptz not null,
  mime_type text,
  size_bytes bigint,
  finalized_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medical_documents_uploader_role_check check (uploader_role in ('patient', 'doctor')),
  constraint medical_documents_category_check check (category in (
    'lab_report', 'radiology_report', 'discharge_summary',
    'referral', 'prescription_document', 'other'
  )),
  constraint medical_documents_title_valid check (
    title = btrim(title) and char_length(title) between 1 and 200
  ),
  constraint medical_documents_description_length check (
    description is null or char_length(description) <= 2000
  ),
  constraint medical_documents_filename_valid check (
    char_length(original_file_name) between 1 and 255
    and original_file_name !~ '[\\/]'
    and original_file_name !~ '[[:cntrl:]]'
  ),
  constraint medical_documents_storage_path_valid check (
    storage_path ~ '^documents/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/file\.(pdf|jpg|png)$'
  ),
  constraint medical_documents_status_check check (upload_status in ('pending', 'ready', 'failed')),
  constraint medical_documents_failure_code_check check (
    failure_code is null or failure_code in (
      'expired', 'object_missing', 'invalid_extension', 'invalid_mime',
      'invalid_signature', 'invalid_size', 'upload_url_failed', 'finalize_failed'
    )
  ),
  constraint medical_documents_status_consistency check (
    (upload_status = 'pending' and finalized_at is null and failed_at is null
      and mime_type is null and size_bytes is null and failure_code is null)
    or
    (upload_status = 'ready' and finalized_at is not null and failed_at is null
      and mime_type in ('application/pdf', 'image/jpeg', 'image/png')
      and size_bytes between 1 and 10485760 and failure_code is null)
    or
    (upload_status = 'failed' and failed_at is not null and finalized_at is null
      and failure_code is not null)
  )
);

create table public.medical_document_appointments (
  document_id uuid not null references public.medical_documents(id),
  appointment_id uuid not null references public.appointments(id),
  linked_by_user_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  primary key (document_id, appointment_id)
);

create table public.medical_document_access_log (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.medical_documents(id),
  user_id uuid not null references public.users(id),
  actor_role text not null check (actor_role in ('patient', 'doctor')),
  appointment_id uuid references public.appointments(id),
  event_type text not null check (event_type = 'signed_url_issued'),
  created_at timestamptz not null default now()
);

create table public.medical_document_url_rate_limits (
  user_id uuid primary key references public.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null,
  updated_at timestamptz not null default now(),
  constraint medical_document_rate_count_check check (request_count between 1 and 20)
);

create index medical_documents_patient_finalized_idx
  on public.medical_documents (patient_id, finalized_at desc) where upload_status = 'ready';
create index medical_document_appointments_appointment_idx
  on public.medical_document_appointments (appointment_id, document_id);
create index medical_document_access_log_user_created_idx
  on public.medical_document_access_log (user_id, created_at desc);

alter table public.medical_documents enable row level security;
alter table public.medical_document_appointments enable row level security;
alter table public.medical_document_access_log enable row level security;
alter table public.medical_document_url_rate_limits enable row level security;

revoke all on table public.medical_documents from public, anon, authenticated;
revoke all on table public.medical_document_appointments from public, anon, authenticated;
revoke all on table public.medical_document_access_log from public, anon, authenticated;
revoke all on table public.medical_document_url_rate_limits from public, anon, authenticated;

create function public.enforce_medical_document_link_patient()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v_document_patient_id uuid;
  v_appointment_patient_id uuid;
  v_document_status text;
begin
  select md.patient_id, md.upload_status into v_document_patient_id, v_document_status
  from public.medical_documents as md where md.id = coalesce(new.document_id, old.document_id);
  if tg_op <> 'INSERT' and v_document_status <> 'pending' then
    raise exception 'Tamamlanmış belge bağlantıları değiştirilemez.';
  end if;
  if tg_op <> 'DELETE' then
    if v_document_status <> 'pending' then raise exception 'Tamamlanmış belgeye bağlantı eklenemez.'; end if;
    select a.user_id into v_appointment_patient_id
    from public.appointments as a where a.id = new.appointment_id;
    if v_document_patient_id is distinct from v_appointment_patient_id then
      raise exception 'Belge ve randevu aynı hastaya ait olmalıdır.';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger medical_document_link_patient_guard
before insert or update or delete on public.medical_document_appointments
for each row execute function public.enforce_medical_document_link_patient();

create function public.enforce_medical_document_lifecycle()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.upload_status <> 'pending' then
    raise exception 'Tamamlanmış veya başarısız belge değiştirilemez.';
  end if;
  if new.patient_id <> old.patient_id
    or new.uploaded_by_user_id <> old.uploaded_by_user_id
    or new.uploader_role <> old.uploader_role
    or new.category <> old.category
    or new.title <> old.title
    or new.description is distinct from old.description
    or new.original_file_name <> old.original_file_name
    or new.storage_path <> old.storage_path
    or new.intent_expires_at <> old.intent_expires_at then
    raise exception 'Belge kimliği ve meta verileri değiştirilemez.';
  end if;
  if new.upload_status not in ('ready', 'failed') then
    raise exception 'Belge yalnızca hazır veya başarısız durumuna geçirilebilir.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger medical_document_lifecycle_guard
before update on public.medical_documents
for each row execute function public.enforce_medical_document_lifecycle();

create function public.get_my_medical_documents()
returns table (
  document_id uuid, category text, title text, description text,
  original_file_name text, mime_type text, size_bytes bigint,
  uploader_role text, created_at timestamptz, finalized_at timestamptz,
  linked_appointments jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.' using errcode = '42501'; end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'patient') then
    raise exception 'Hasta yetkisi bulunamadı.' using errcode = '42501';
  end if;
  return query
  select md.id, md.category, md.title, md.description, md.original_file_name,
    md.mime_type, md.size_bytes, md.uploader_role, md.created_at, md.finalized_at,
    coalesce((select jsonb_agg(jsonb_build_object(
      'appointment_id', a.id, 'appointment_date', a.date, 'appointment_time', a.time,
      'doctor_name', d.full_name, 'doctor_title', d.title, 'department', d.department
    ) order by a.date desc, a.time desc)
    from public.medical_document_appointments mda
    join public.appointments a on a.id = mda.appointment_id and a.user_id = auth.uid()
    join public.doctors d on d.id = a.doctor_id
    where mda.document_id = md.id), '[]'::jsonb)
  from public.medical_documents md
  where md.patient_id = auth.uid() and md.upload_status = 'ready'
  order by md.finalized_at desc, md.created_at desc;
end;
$$;
revoke all on function public.get_my_medical_documents() from public, anon;
grant execute on function public.get_my_medical_documents() to authenticated;

create function public.get_my_document_shareable_appointments()
returns table (
  appointment_id uuid, appointment_date date, appointment_time time,
  doctor_name text, doctor_title text, department text, appointment_status text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.' using errcode = '42501'; end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'patient') then
    raise exception 'Hasta yetkisi bulunamadı.' using errcode = '42501';
  end if;
  return query select a.id, a.date, a.time, d.full_name, d.title, d.department, a.status
  from public.appointments a join public.doctors d on d.id = a.doctor_id
  where a.user_id = auth.uid() and a.status in ('confirmed', 'in_progress', 'completed')
  order by a.date desc, a.time desc;
end;
$$;
revoke all on function public.get_my_document_shareable_appointments() from public, anon;
grant execute on function public.get_my_document_shareable_appointments() to authenticated;

create function public.get_doctor_appointment_documents(p_appointment_id uuid)
returns table (
  document_id uuid, category text, title text, description text,
  original_file_name text, mime_type text, size_bytes bigint,
  uploader_role text, created_at timestamptz, finalized_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare v_doctor_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.' using errcode = '42501'; end if;
  select d.id into v_doctor_id from public.doctors d
  join public.user_roles ur on ur.user_id = d.user_id
  where d.user_id = auth.uid() and ur.role = 'doctor';
  if v_doctor_id is null then raise exception 'Doktor yetkisi bulunamadı.' using errcode = '42501'; end if;
  if not exists (select 1 from public.appointments a where a.id = p_appointment_id
    and a.doctor_id = v_doctor_id and a.status in ('confirmed', 'in_progress', 'completed')) then
    raise exception 'Randevu bulunamadı veya belge erişimine uygun değil.' using errcode = '42501';
  end if;
  return query select md.id, md.category, md.title, md.description,
    md.original_file_name, md.mime_type, md.size_bytes, md.uploader_role,
    md.created_at, md.finalized_at
  from public.medical_document_appointments mda
  join public.medical_documents md on md.id = mda.document_id and md.upload_status = 'ready'
  where mda.appointment_id = p_appointment_id
  order by md.finalized_at desc, md.created_at desc;
end;
$$;
revoke all on function public.get_doctor_appointment_documents(uuid) from public, anon;
grant execute on function public.get_doctor_appointment_documents(uuid) to authenticated;

-- The following mutation helpers are server-only. Edge Functions pass a user ID
-- obtained from auth.getUser(); browser roles cannot execute these functions.
create function public.create_patient_medical_document_intent(
  p_actor_user_id uuid, p_category text, p_title text, p_description text,
  p_original_file_name text, p_claimed_mime_type text, p_claimed_size_bytes bigint,
  p_appointment_ids uuid[]
)
returns table (document_id uuid, storage_path text, intent_expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid(); v_ext text; v_name text := btrim(p_original_file_name);
  v_title text := btrim(p_title); v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_appointment_id uuid; v_expires timestamptz := now() + interval '15 minutes';
begin
  if not exists (select 1 from public.user_roles ur where ur.user_id = p_actor_user_id and ur.role = 'patient') then
    raise exception 'Hasta yetkisi bulunamadı.' using errcode = '42501';
  end if;
  if p_category not in ('lab_report','radiology_report','discharge_summary','referral','prescription_document','other') then raise exception 'Geçersiz belge türü.'; end if;
  if char_length(v_title) not between 1 and 200 then raise exception 'Başlık 1 ile 200 karakter arasında olmalıdır.'; end if;
  if coalesce(char_length(v_description),0) > 2000 then raise exception 'Açıklama 2000 karakteri aşamaz.'; end if;
  if char_length(v_name) not between 1 and 255 or v_name ~ '[\\/]' or v_name ~ '[[:cntrl:]]' then raise exception 'Dosya adı geçersiz.'; end if;
  v_ext := lower(substring(v_name from '(\.[^.]+)$'));
  if v_ext not in ('.pdf','.jpg','.jpeg','.png') then raise exception 'Yalnızca PDF, JPEG veya PNG yüklenebilir.'; end if;
  if p_claimed_mime_type not in ('application/pdf','image/jpeg','image/png') then raise exception 'Dosya türü desteklenmiyor.'; end if;
  if (v_ext = '.pdf' and p_claimed_mime_type <> 'application/pdf') or (v_ext in ('.jpg','.jpeg') and p_claimed_mime_type <> 'image/jpeg') or (v_ext = '.png' and p_claimed_mime_type <> 'image/png') then raise exception 'Dosya uzantısı ve türü uyuşmuyor.'; end if;
  if p_claimed_size_bytes not between 1 and 10485760 then raise exception 'Dosya boyutu 1 bayt ile 10 MB arasında olmalıdır.'; end if;
  if cardinality(coalesce(p_appointment_ids, array[]::uuid[])) > 50 then raise exception 'En fazla 50 randevu seçilebilir.'; end if;
  if (select count(distinct x) from unnest(coalesce(p_appointment_ids,array[]::uuid[])) x) <> cardinality(coalesce(p_appointment_ids,array[]::uuid[])) then raise exception 'Randevu seçimi yinelenemez.'; end if;
  insert into public.medical_documents (id, patient_id, uploaded_by_user_id, uploader_role,
    category, title, description, original_file_name, storage_path, intent_expires_at)
  values (v_id, p_actor_user_id, p_actor_user_id, 'patient', p_category, v_title,
    v_description, v_name, 'documents/'||v_id||'/file'||case when v_ext='.jpeg' then '.jpg' else v_ext end, v_expires);
  foreach v_appointment_id in array coalesce(p_appointment_ids,array[]::uuid[]) loop
    perform 1 from public.appointments a where a.id=v_appointment_id
      and a.user_id=p_actor_user_id and a.status in ('confirmed','in_progress','completed') for update;
    if not found then
      raise exception 'Seçilen randevu belge paylaşımına uygun değil.' using errcode='42501';
    end if;
    insert into public.medical_document_appointments values (v_id,v_appointment_id,p_actor_user_id,now());
  end loop;
  return query select v_id, 'documents/'||v_id||'/file'||case when v_ext='.jpeg' then '.jpg' else v_ext end, v_expires;
end;
$$;

create function public.create_doctor_medical_document_intent(
  p_actor_user_id uuid, p_appointment_id uuid, p_category text, p_title text,
  p_description text, p_original_file_name text, p_claimed_mime_type text,
  p_claimed_size_bytes bigint
)
returns table (document_id uuid, storage_path text, intent_expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_doctor_id uuid; v_patient_id uuid; v_id uuid := gen_random_uuid();
  v_ext text; v_name text := btrim(p_original_file_name); v_title text := btrim(p_title);
  v_description text := nullif(btrim(coalesce(p_description,'')),'');
  v_expires timestamptz := now() + interval '15 minutes';
begin
  select d.id into v_doctor_id from public.doctors d join public.user_roles ur on ur.user_id=d.user_id
  where d.user_id=p_actor_user_id and ur.role='doctor';
  if v_doctor_id is null then raise exception 'Doktor yetkisi bulunamadı.' using errcode='42501'; end if;
  select a.user_id into v_patient_id from public.appointments a where a.id=p_appointment_id
    and a.doctor_id=v_doctor_id and a.status in ('in_progress','completed') for update;
  if not found then raise exception 'Randevu belge yüklemeye uygun değil.' using errcode='42501'; end if;
  if p_category not in ('lab_report','radiology_report','discharge_summary','referral','prescription_document','other') then raise exception 'Geçersiz belge türü.'; end if;
  if char_length(v_title) not between 1 and 200 then raise exception 'Başlık 1 ile 200 karakter arasında olmalıdır.'; end if;
  if coalesce(char_length(v_description),0)>2000 then raise exception 'Açıklama 2000 karakteri aşamaz.'; end if;
  if char_length(v_name) not between 1 and 255 or v_name ~ '[\\/]' or v_name ~ '[[:cntrl:]]' then raise exception 'Dosya adı geçersiz.'; end if;
  v_ext:=lower(substring(v_name from '(\.[^.]+)$'));
  if v_ext not in ('.pdf','.jpg','.jpeg','.png') then raise exception 'Yalnızca PDF, JPEG veya PNG yüklenebilir.'; end if;
  if p_claimed_mime_type not in ('application/pdf','image/jpeg','image/png') then raise exception 'Dosya türü desteklenmiyor.'; end if;
  if (v_ext='.pdf' and p_claimed_mime_type<>'application/pdf') or (v_ext in ('.jpg','.jpeg') and p_claimed_mime_type<>'image/jpeg') or (v_ext='.png' and p_claimed_mime_type<>'image/png') then raise exception 'Dosya uzantısı ve türü uyuşmuyor.'; end if;
  if p_claimed_size_bytes not between 1 and 10485760 then raise exception 'Dosya boyutu 1 bayt ile 10 MB arasında olmalıdır.'; end if;
  insert into public.medical_documents (id,patient_id,uploaded_by_user_id,uploader_role,category,title,description,original_file_name,storage_path,intent_expires_at)
  values (v_id,v_patient_id,p_actor_user_id,'doctor',p_category,v_title,v_description,v_name,
    'documents/'||v_id||'/file'||case when v_ext='.jpeg' then '.jpg' else v_ext end,v_expires);
  insert into public.medical_document_appointments values (v_id,p_appointment_id,p_actor_user_id,now());
  return query select v_id,'documents/'||v_id||'/file'||case when v_ext='.jpeg' then '.jpg' else v_ext end,v_expires;
end;
$$;

create function public.prepare_medical_document_finalize(p_document_id uuid, p_actor_user_id uuid)
returns table (storage_path text, original_file_name text, expired boolean)
language plpgsql security definer set search_path = ''
as $$
declare v_doc public.medical_documents%rowtype;
begin
  select * into v_doc from public.medical_documents md where md.id=p_document_id for update;
  if not found or v_doc.uploaded_by_user_id<>p_actor_user_id then raise exception 'Belge bulunamadı veya yetkiniz yok.' using errcode='42501'; end if;
  if v_doc.upload_status<>'pending' then raise exception 'Belge yükleme işlemi artık tamamlanamaz.'; end if;
  if v_doc.intent_expires_at<=now() then
    update public.medical_documents set upload_status='failed',failed_at=now(),failure_code='expired' where id=p_document_id;
    return query select v_doc.storage_path,v_doc.original_file_name,true; return;
  end if;
  return query select v_doc.storage_path,v_doc.original_file_name,false;
end;
$$;

create function public.complete_medical_document_finalize(p_document_id uuid,p_actor_user_id uuid,p_mime_type text,p_size_bytes bigint)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_mime_type not in ('application/pdf','image/jpeg','image/png') or p_size_bytes not between 1 and 10485760 then raise exception 'Geçersiz belge doğrulama sonucu.'; end if;
  update public.medical_documents set upload_status='ready',mime_type=p_mime_type,size_bytes=p_size_bytes,finalized_at=now()
  where id=p_document_id and uploaded_by_user_id=p_actor_user_id and upload_status='pending' and intent_expires_at>now();
  if not found then raise exception 'Belge tamamlanamadı.'; end if;
end;
$$;

create function public.fail_medical_document_intent(p_document_id uuid,p_actor_user_id uuid,p_failure_code text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_failure_code not in ('object_missing','invalid_extension','invalid_mime','invalid_signature','invalid_size','upload_url_failed','finalize_failed') then raise exception 'Geçersiz hata kodu.'; end if;
  update public.medical_documents set upload_status='failed',failed_at=now(),failure_code=p_failure_code
  where id=p_document_id and uploaded_by_user_id=p_actor_user_id and upload_status='pending';
  if not found then raise exception 'Belge başarısız olarak işaretlenemedi.'; end if;
end;
$$;

create function public.authorize_medical_document_read(p_document_id uuid,p_actor_user_id uuid)
returns table (storage_path text, actor_role text, appointment_id uuid)
language plpgsql stable security definer set search_path = ''
as $$
declare v_role text; v_appointment_id uuid;
begin
  select ur.role into v_role from public.user_roles ur where ur.user_id=p_actor_user_id and ur.role in ('patient','doctor');
  if v_role='patient' then
    if not exists (select 1 from public.medical_documents md where md.id=p_document_id and md.patient_id=p_actor_user_id and md.upload_status='ready') then raise exception 'Belge erişim yetkiniz yok.' using errcode='42501'; end if;
  elsif v_role='doctor' then
    select a.id into v_appointment_id from public.medical_document_appointments mda
    join public.appointments a on a.id=mda.appointment_id and a.status in ('confirmed','in_progress','completed')
    join public.doctors d on d.id=a.doctor_id and d.user_id=p_actor_user_id
    join public.medical_documents md on md.id=mda.document_id and md.upload_status='ready'
    where mda.document_id=p_document_id order by a.date desc,a.time desc limit 1;
    if v_appointment_id is null then raise exception 'Belge erişim yetkiniz yok.' using errcode='42501'; end if;
  else raise exception 'Belge erişim yetkiniz yok.' using errcode='42501';
  end if;
  return query select md.storage_path,v_role,v_appointment_id from public.medical_documents md where md.id=p_document_id;
end;
$$;

create function public.consume_medical_document_url_quota(p_actor_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_count integer; v_now timestamptz:=now();
begin
  insert into public.medical_document_url_rate_limits as rl(user_id,window_started_at,request_count,updated_at)
  values(p_actor_user_id,v_now,1,v_now)
  on conflict(user_id) do update set
    window_started_at=case when rl.window_started_at<=v_now-interval '60 seconds' then v_now else rl.window_started_at end,
    request_count=case when rl.window_started_at<=v_now-interval '60 seconds' then 1 else rl.request_count+1 end,
    updated_at=v_now
  where rl.window_started_at<=v_now-interval '60 seconds' or rl.request_count<20
  returning request_count into v_count;
  if v_count is null then raise exception 'DOCUMENT_URL_RATE_LIMIT'; end if;
end;
$$;

create function public.record_medical_document_url_issuance(p_document_id uuid,p_actor_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_access record;
begin
  select * into v_access from public.authorize_medical_document_read(p_document_id,p_actor_user_id);
  if not found then raise exception 'Belge erişimi kaydedilemedi.'; end if;
  insert into public.medical_document_access_log(document_id,user_id,actor_role,appointment_id,event_type)
  values(p_document_id,p_actor_user_id,v_access.actor_role,v_access.appointment_id,'signed_url_issued');
end;
$$;

revoke all on function public.create_patient_medical_document_intent(uuid,text,text,text,text,text,bigint,uuid[]) from public,anon,authenticated;
revoke all on function public.create_doctor_medical_document_intent(uuid,uuid,text,text,text,text,text,bigint) from public,anon,authenticated;
revoke all on function public.prepare_medical_document_finalize(uuid,uuid) from public,anon,authenticated;
revoke all on function public.complete_medical_document_finalize(uuid,uuid,text,bigint) from public,anon,authenticated;
revoke all on function public.fail_medical_document_intent(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.authorize_medical_document_read(uuid,uuid) from public,anon,authenticated;
revoke all on function public.consume_medical_document_url_quota(uuid) from public,anon,authenticated;
revoke all on function public.record_medical_document_url_issuance(uuid,uuid) from public,anon,authenticated;

grant execute on function public.create_patient_medical_document_intent(uuid,text,text,text,text,text,bigint,uuid[]) to service_role;
grant execute on function public.create_doctor_medical_document_intent(uuid,uuid,text,text,text,text,text,bigint) to service_role;
grant execute on function public.prepare_medical_document_finalize(uuid,uuid) to service_role;
grant execute on function public.complete_medical_document_finalize(uuid,uuid,text,bigint) to service_role;
grant execute on function public.fail_medical_document_intent(uuid,uuid,text) to service_role;
grant execute on function public.authorize_medical_document_read(uuid,uuid) to service_role;
grant execute on function public.consume_medical_document_url_quota(uuid) to service_role;
grant execute on function public.record_medical_document_url_issuance(uuid,uuid) to service_role;

-- No storage.objects policies are created. Browser access is limited to exact-path
-- signed uploads and 120-second signed reads issued after server authorization.
