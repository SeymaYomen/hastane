-- AI pre-visit brief foundation: scoped context and metadata-only usage logging.

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  status text not null,
  created_at timestamptz not null default now()
);

create index ai_usage_user_feature_created_idx
  on public.ai_usage (user_id, feature, created_at desc);

alter table public.ai_usage enable row level security;
revoke all on table public.ai_usage from public, anon, authenticated;

create or replace function public.get_doctor_ai_brief_context(p_appointment_id uuid)
returns table (
  appointment_id uuid,
  appointment_date date,
  appointment_time time,
  appointment_status text,
  appointment_notes text,
  patient_name text,
  past_visits jsonb
)
language sql stable security definer set search_path = ''
as $$
  select
    current_a.id,
    current_a.date,
    current_a.time,
    current_a.status,
    left(current_a.notes, 1500),
    u.full_name,
    coalesce(history.items, '[]'::jsonb)
  from public.appointments current_a
  join public.doctors d on d.id = current_a.doctor_id
  join public.user_roles ur on ur.user_id = d.user_id
  join public.users u on u.id = current_a.user_id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'ref', visit.ref,
        'date', visit.date,
        'noteFormat', visit.note_format,
        'clinicalNote', visit.clinical_note,
        'subjective', visit.subjective,
        'objective', visit.objective,
        'assessment', visit.assessment,
        'plan', visit.plan,
        'followUpRequired', visit.follow_up_required,
        'followUpDate', visit.follow_up_date,
        'followUpNote', visit.follow_up_note
      ) order by visit.date desc, visit.time desc
    ) as items
    from (
      select
        'V' || row_number() over (order by a.date desc, a.time desc) as ref,
        a.date,
        a.time,
        coalesce(vn.note_format, 'free_text') as note_format,
        left(vn.clinical_note, 1500) as clinical_note,
        left(vn.subjective, 1500) as subjective,
        left(vn.objective, 1500) as objective,
        left(vn.assessment, 1500) as assessment,
        left(vn.plan, 1500) as plan,
        coalesce(vn.follow_up_required, false) as follow_up_required,
        vn.follow_up_date,
        left(vn.follow_up_note, 1000) as follow_up_note
      from public.appointments a
      join public.visit_notes vn on vn.appointment_id = a.id and vn.doctor_id = d.id
      where a.doctor_id = d.id
        and a.user_id = current_a.user_id
        and a.status = 'completed'
        and (a.date < current_a.date or (a.date = current_a.date and a.time < current_a.time))
      order by a.date desc, a.time desc
      limit 5
    ) visit
  ) history on true
  where auth.uid() is not null
    and ur.role = 'doctor'
    and d.user_id = auth.uid()
    and current_a.id = p_appointment_id;
$$;

revoke all on function public.get_doctor_ai_brief_context(uuid) from public, anon;
grant execute on function public.get_doctor_ai_brief_context(uuid) to authenticated;

create or replace function public.start_ai_usage(
  p_feature text,
  p_provider text,
  p_model text,
  p_limit integer default 5
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'doctor'
  ) then
    raise exception 'Doktor yetkisi bulunamadı.' using errcode = '42501';
  end if;
  if p_feature <> 'doctor_pre_visit_brief' or p_limit < 1 or p_limit > 20 then
    raise exception 'Geçersiz AI kullanım isteği.';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || p_feature));
  if (select count(*) from public.ai_usage
      where user_id = auth.uid() and feature = p_feature
        and created_at >= now() - interval '1 minute') >= p_limit then
    raise exception 'AI_RATE_LIMIT';
  end if;

  insert into public.ai_usage (user_id, feature, provider, model, status)
  values (auth.uid(), p_feature, left(p_provider, 40), left(p_model, 100), 'started')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.start_ai_usage(text, text, text, integer) from public, anon;
grant execute on function public.start_ai_usage(text, text, text, integer) to authenticated;

create or replace function public.finish_ai_usage(
  p_usage_id uuid,
  p_input_tokens integer,
  p_output_tokens integer,
  p_latency_ms integer,
  p_status text
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_status not in ('success', 'no_history', 'provider_error', 'invalid_output') then
    raise exception 'Geçersiz AI kullanım durumu.';
  end if;
  update public.ai_usage set
    input_tokens = greatest(p_input_tokens, 0),
    output_tokens = greatest(p_output_tokens, 0),
    latency_ms = greatest(p_latency_ms, 0),
    status = p_status
  where id = p_usage_id and user_id = auth.uid() and status = 'started';
end;
$$;

revoke all on function public.finish_ai_usage(uuid, integer, integer, integer, text) from public, anon;
grant execute on function public.finish_ai_usage(uuid, integer, integer, integer, text) to authenticated;
