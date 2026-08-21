-- Provider timeout diagnostics and stale AI usage recovery.

alter table public.ai_usage
  drop constraint if exists ai_usage_error_code_check;

alter table public.ai_usage
  add constraint ai_usage_error_code_check check (
    error_code is null or error_code in (
      'invalid_shape', 'invalid_summary', 'invalid_key_points',
      'invalid_evidence_ref', 'invalid_follow_up', 'invalid_limitations',
      'output_too_large', 'uuid_leak', 'disallowed_claim',
      'provider_request_failed', 'provider_timeout'
    )
  );

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

  update public.ai_usage set
    status = 'provider_error',
    error_code = 'provider_timeout',
    latency_ms = least(
      greatest((extract(epoch from (now() - created_at)) * 1000)::bigint, 0),
      2147483647
    )::integer
  where user_id = auth.uid()
    and feature = p_feature
    and status = 'started'
    and created_at < now() - interval '2 minutes';

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
  p_status text,
  p_error_code text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_status not in ('success', 'no_history', 'provider_error', 'invalid_output') then
    raise exception 'Geçersiz AI kullanım durumu.';
  end if;
  if (p_status in ('success', 'no_history') and p_error_code is not null)
    or (p_status = 'provider_error' and (p_error_code is null or p_error_code not in ('provider_request_failed', 'provider_timeout')))
    or (p_status = 'invalid_output' and (p_error_code is null or p_error_code not in (
      'invalid_shape', 'invalid_summary', 'invalid_key_points',
      'invalid_evidence_ref', 'invalid_follow_up', 'invalid_limitations',
      'output_too_large', 'uuid_leak', 'disallowed_claim'
    ))) then
    raise exception 'Geçersiz AI hata kodu.';
  end if;

  update public.ai_usage set
    input_tokens = greatest(p_input_tokens, 0),
    output_tokens = greatest(p_output_tokens, 0),
    latency_ms = greatest(p_latency_ms, 0),
    status = p_status,
    error_code = p_error_code
  where id = p_usage_id and user_id = auth.uid() and status = 'started';
end;
$$;

revoke all on function public.finish_ai_usage(uuid, integer, integer, integer, text, text) from public, anon;
grant execute on function public.finish_ai_usage(uuid, integer, integer, integer, text, text) to authenticated;
