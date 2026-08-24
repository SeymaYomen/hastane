-- Clinical Assistant V1: narrow authorized context and combined metadata-only usage limit.

create or replace function public.get_doctor_clinical_assistant_context(p_appointment_id uuid)
returns table (
  appointment_status text,
  current_visit jsonb,
  historical_records jsonb
)
language sql stable security definer set search_path = ''
as $$
  select
    current_a.status,
    case when current_vn.id is null then null else jsonb_build_object(
      'ref', 'CURRENT_VISIT',
      'date', current_a.date,
      'noteFormat', coalesce(current_vn.note_format, 'free_text'),
      'clinicalNote', left(current_vn.clinical_note, 10000),
      'subjective', left(current_vn.subjective, 5000),
      'objective', left(current_vn.objective, 5000),
      'assessment', left(current_vn.assessment, 5000),
      'plan', left(current_vn.plan, 5000)
    ) end,
    coalesce(history.items, '[]'::jsonb)
  from public.appointments current_a
  join public.doctors d on d.id = current_a.doctor_id
  join public.user_roles ur on ur.user_id = d.user_id and ur.role = 'doctor'
  left join public.visit_notes current_vn
    on current_vn.appointment_id = current_a.id and current_vn.doctor_id = d.id
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
        'plan', visit.plan
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
        left(vn.plan, 1500) as plan
      from public.appointments a
      join public.visit_notes vn on vn.appointment_id = a.id and vn.doctor_id = d.id
      where a.doctor_id = d.id
        and a.user_id = current_a.user_id
        and a.status = 'completed'
        and a.id <> current_a.id
        and (a.date < current_a.date or (a.date = current_a.date and a.time < current_a.time))
      order by a.date desc, a.time desc
      limit 5
    ) visit
  ) history on true
  where auth.uid() is not null
    and d.user_id = auth.uid()
    and current_a.id = p_appointment_id;
$$;

revoke all on function public.get_doctor_clinical_assistant_context(uuid) from public, anon;
grant execute on function public.get_doctor_clinical_assistant_context(uuid) to authenticated;

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
  v_rate_bucket text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'doctor'
  ) then
    raise exception 'Doktor yetkisi bulunamadı.' using errcode = '42501';
  end if;
  if p_feature not in ('doctor_pre_visit_brief', 'clinical_assistant_summary', 'clinical_note_draft')
    or p_limit < 1 or p_limit > 20 then
    raise exception 'Geçersiz AI kullanım isteği.';
  end if;

  v_rate_bucket := case
    when p_feature in ('clinical_assistant_summary', 'clinical_note_draft')
      then 'clinical_assistant'
    else p_feature
  end;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || v_rate_bucket));

  update public.ai_usage set
    status = 'provider_error',
    error_code = 'provider_timeout',
    latency_ms = least(
      greatest((extract(epoch from (now() - created_at)) * 1000)::bigint, 0),
      2147483647
    )::integer
  where user_id = auth.uid()
    and status = 'started'
    and created_at < now() - interval '2 minutes'
    and (
      (v_rate_bucket = 'clinical_assistant' and feature in ('clinical_assistant_summary', 'clinical_note_draft'))
      or feature = v_rate_bucket
    );

  if (select count(*) from public.ai_usage
      where user_id = auth.uid()
        and created_at >= now() - interval '1 minute'
        and (
          (v_rate_bucket = 'clinical_assistant' and feature in ('clinical_assistant_summary', 'clinical_note_draft'))
          or feature = v_rate_bucket
        )) >= p_limit then
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
