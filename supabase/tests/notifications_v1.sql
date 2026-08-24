-- Run after 20260824150000_notifications_v1.sql in a disposable/local database.
-- Catalog-level regression checks for notification isolation and lifecycle wiring.

do $$
declare
  v_definition text;
begin
  if not (select c.relrowsecurity from pg_catalog.pg_class c
    where c.oid = 'public.notifications'::regclass) then
    raise exception 'notifications RLS must be enabled';
  end if;

  if has_table_privilege('authenticated', 'public.notifications', 'INSERT') then
    raise exception 'authenticated must not insert notifications directly';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'public' and tablename = 'notifications'
      and indexdef like '%(user_id, type, dedupe_key)%'
  ) then
    raise exception 'notification dedupe index is missing';
  end if;

  select pg_get_functiondef('public.get_my_notifications(integer)'::regprocedure)
  into v_definition;
  if v_definition not like '%n.user_id = auth.uid()%' or v_definition not like '%limit p_limit%' then
    raise exception 'notification reads must be owner-scoped and limited';
  end if;

  select pg_get_functiondef('public.mark_notification_read(uuid)'::regprocedure)
  into v_definition;
  if v_definition not like '%n.user_id = auth.uid()%' then
    raise exception 'single-notification updates must be owner-scoped';
  end if;

  select pg_get_functiondef('public.get_unread_notification_count()'::regprocedure)
  into v_definition;
  if v_definition not like '%n.user_id = auth.uid()%' or v_definition not like '%not n.is_read%' then
    raise exception 'unread count must include only own unread notifications';
  end if;

  select pg_get_functiondef('public.generate_due_appointment_reminders()'::regprocedure)
  into v_definition;
  if v_definition not like '%a.status = ''confirmed''%'
    or v_definition not like '%a.status = ''completed''%'
    or v_definition like '%clinical_note%'
    or v_definition like '%subjective%'
    or v_definition like '%assessment%' then
    raise exception 'reminder generator status/privacy boundary is invalid';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.appointments'::regclass
      and tgname = 'appointment_status_notification'
      and not tgisinternal
  ) then
    raise exception 'appointment status notification trigger is missing';
  end if;

  select pg_get_functiondef('public.update_doctor_appointment_status(uuid,text)'::regprocedure)
  into v_definition;
  if v_definition not like '%p_status = ''no_show'' and v_appointment_date > v_today%'
    or v_definition not like '%ur.role = ''doctor''%' then
    raise exception 'existing no-show timing/doctor authorization guard is missing';
  end if;
end;
$$;
