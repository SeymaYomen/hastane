-- In-app notifications, appointment lifecycle events, and idempotent reminders V1.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'appointment_confirmed',
    'appointment_cancelled',
    'appointment_reminder',
    'appointment_status_changed',
    'appointment_no_show',
    'follow_up_reminder'
  )),
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 1000),
  appointment_id uuid references public.appointments(id) on delete cascade,
  dedupe_key text not null check (char_length(dedupe_key) between 1 and 180),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_read_state_check check (
    (is_read and read_at is not null) or (not is_read and read_at is null)
  )
);

create unique index notifications_user_type_dedupe_idx
  on public.notifications (user_id, type, dedupe_key);
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where not is_read;

alter table public.notifications enable row level security;

create policy notifications_select_own
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy notifications_update_own
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on table public.notifications from public, anon, authenticated;

create function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_appointment_id uuid,
  p_dedupe_key text
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user_id is null
    or p_type not in (
      'appointment_confirmed', 'appointment_cancelled',
      'appointment_reminder', 'appointment_status_changed',
      'appointment_no_show', 'follow_up_reminder'
    )
    or nullif(btrim(p_title), '') is null
    or nullif(btrim(p_message), '') is null
    or nullif(btrim(p_dedupe_key), '') is null then
    raise exception 'Geçersiz bildirim isteği.';
  end if;

  insert into public.notifications (
    user_id, type, title, message, appointment_id, dedupe_key
  ) values (
    p_user_id,
    p_type,
    left(btrim(p_title), 120),
    left(btrim(p_message), 1000),
    p_appointment_id,
    left(btrim(p_dedupe_key), 180)
  )
  on conflict (user_id, type, dedupe_key) do nothing;
end;
$$;

revoke all on function public.create_notification(uuid, text, text, text, uuid, text)
  from public, anon, authenticated;

create function public.notify_appointment_status_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status = 'confirmed' then
    perform public.create_notification(
      new.user_id, 'appointment_confirmed', 'Randevu onaylandı',
      'Randevunuz onaylandı.', new.id, 'status:confirmed:' || new.id::text
    );
  elsif new.status = 'cancelled' then
    perform public.create_notification(
      new.user_id, 'appointment_cancelled', 'Randevu iptal edildi',
      'Randevunuz iptal edildi.', new.id, 'status:cancelled:' || new.id::text
    );
  elsif new.status = 'no_show' then
    perform public.create_notification(
      new.user_id, 'appointment_no_show', 'Randevu durumu güncellendi',
      'Randevunuz “Gelmedi” olarak kaydedildi.', new.id, 'status:no_show:' || new.id::text
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_appointment_status_change()
  from public, anon, authenticated;

drop trigger if exists appointment_status_notification on public.appointments;
create trigger appointment_status_notification
after update of status on public.appointments
for each row execute function public.notify_appointment_status_change();

create function public.get_my_notifications(p_limit integer default 50)
returns table (
  id uuid,
  type text,
  title text,
  message text,
  appointment_id uuid,
  is_read boolean,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;
  if p_limit < 1 or p_limit > 50 then
    raise exception 'Geçersiz bildirim limiti.';
  end if;

  return query
  select n.id, n.type, n.title, n.message, n.appointment_id,
    n.is_read, n.created_at, n.read_at
  from public.notifications n
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit p_limit;
end;
$$;

revoke all on function public.get_my_notifications(integer) from public, anon;
grant execute on function public.get_my_notifications(integer) to authenticated;

create function public.get_unread_notification_count()
returns bigint
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;
  return (
    select count(*) from public.notifications n
    where n.user_id = auth.uid() and not n.is_read
  );
end;
$$;

revoke all on function public.get_unread_notification_count() from public, anon;
grant execute on function public.get_unread_notification_count() to authenticated;

create function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_updated boolean;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  update public.notifications n
  set is_read = true, read_at = coalesce(n.read_at, now())
  where n.id = p_notification_id and n.user_id = auth.uid()
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create function public.mark_all_notifications_read()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  update public.notifications n
  set is_read = true, read_at = now()
  where n.user_id = auth.uid() and not n.is_read;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

create function public.generate_due_appointment_reminders()
returns table (appointment_reminders integer, follow_up_reminders integer)
language plpgsql security definer set search_path = ''
as $$
declare
  v_appointment_count integer;
  v_follow_up_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Hatırlatıcı oluşturma yetkisi bulunamadı.' using errcode = '42501';
  end if;

  insert into public.notifications (
    user_id, type, title, message, appointment_id, dedupe_key
  )
  select
    a.user_id,
    'appointment_reminder',
    'Randevu hatırlatması',
    'Randevunuz yaklaşıyor. Tarih: ' || to_char(a.date, 'DD.MM.YYYY') ||
      ', saat: ' || to_char(a.time, 'HH24:MI') || '.',
    a.id,
    'appointment:24h:' || a.id::text
  from public.appointments a
  where a.status = 'confirmed'
    and ((a.date + a.time) at time zone 'Europe/Istanbul') > now()
    and ((a.date + a.time) at time zone 'Europe/Istanbul') <= now() + interval '24 hours'
  on conflict (user_id, type, dedupe_key) do nothing;
  get diagnostics v_appointment_count = row_count;

  insert into public.notifications (
    user_id, type, title, message, appointment_id, dedupe_key
  )
  select
    a.user_id,
    'follow_up_reminder',
    'Kontrol hatırlatması',
    'Doktorunuzun belirlediği kontrol tarihi bugün.',
    a.id,
    'follow_up:' || a.id::text || ':' || vn.follow_up_date::text
  from public.visit_notes vn
  join public.appointments a on a.id = vn.appointment_id
  where a.status = 'completed'
    and vn.follow_up_required
    and vn.follow_up_date = (now() at time zone 'Europe/Istanbul')::date
  on conflict (user_id, type, dedupe_key) do nothing;
  get diagnostics v_follow_up_count = row_count;

  return query select v_appointment_count, v_follow_up_count;
end;
$$;

revoke all on function public.generate_due_appointment_reminders()
  from public, anon, authenticated;
grant execute on function public.generate_due_appointment_reminders() to service_role;
