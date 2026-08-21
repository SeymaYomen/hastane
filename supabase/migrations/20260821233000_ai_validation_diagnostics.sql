-- Non-sensitive AI validation diagnostics.

alter table public.ai_usage
  add column if not exists error_code text;

alter table public.ai_usage
  add constraint ai_usage_error_code_check check (
    error_code is null or error_code in (
      'invalid_shape',
      'invalid_summary',
      'invalid_key_points',
      'invalid_evidence_ref',
      'invalid_follow_up',
      'invalid_limitations',
      'output_too_large',
      'uuid_leak',
      'disallowed_claim',
      'provider_request_failed'
    )
  );

drop function if exists public.finish_ai_usage(uuid, integer, integer, integer, text);

create function public.finish_ai_usage(
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
    or (p_status = 'provider_error' and p_error_code is distinct from 'provider_request_failed')
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
