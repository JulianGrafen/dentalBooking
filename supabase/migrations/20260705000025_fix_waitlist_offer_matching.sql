-- Fix waitlist matching: offer by exact slot start time, not partial overlap.
-- Adds a service-role RPC so API routes can notify waitlist patients reliably.

create or replace function public.offer_public_waitlist_for_cancelled_slot(
  target_practice_id uuid,
  freed_start_time timestamptz,
  freed_end_time timestamptz,
  new_offer_token_hash text
)
returns table (
  waitlist_entry_id uuid,
  practice_name text,
  patient_email text,
  treatment_label text,
  start_time timestamptz,
  end_time timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if new_offer_token_hash is null or new_offer_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid waitlist token';
  end if;

  return query
  with candidate as (
    select w.id
    from public.appointment_waitlist_entries w
    where w.practice_id = target_practice_id
      and w.status = 'waiting'
      and w.requested_start_time = freed_start_time
      and w.requested_end_time = freed_end_time
      and not exists (
        select 1
        from public.appointments a
        where a.practice_id = w.practice_id
          and a.status in ('booked', 'pending')
          and tstzrange(a.start_time, a.end_time, '[)') &&
              tstzrange(w.requested_start_time, w.requested_end_time, '[)')
      )
    order by w.created_at
    limit 1
    for update skip locked
  )
  update public.appointment_waitlist_entries w
  set
    status = 'offered',
    offer_token_hash = new_offer_token_hash,
    offered_at = now()
  from candidate c, public.practices p
  where w.id = c.id
    and p.id = w.practice_id
  returning
    w.id,
    p.name,
    w.patient_email,
    w.treatment_label,
    w.requested_start_time,
    w.requested_end_time;
end;
$$;

create or replace function public.offer_public_waitlist_for_slot(
  target_practice_id uuid,
  freed_start_time timestamptz,
  freed_end_time timestamptz,
  new_offer_token_hash text
)
returns table (
  waitlist_entry_id uuid,
  practice_name text,
  patient_email text,
  treatment_label text,
  start_time timestamptz,
  end_time timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or not public.is_practice_member(target_practice_id, auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select *
  from public.offer_public_waitlist_for_cancelled_slot(
    target_practice_id,
    freed_start_time,
    freed_end_time,
    new_offer_token_hash
  );
end;
$$;

create or replace function public.create_public_waitlist_entry(
  booking_slug text,
  treatment_slug text,
  encrypted_payload text,
  patient_email text,
  requested_start_time timestamptz,
  requested_end_time timestamptz
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  resolved_practice_id uuid;
  waitlist_id uuid;
  slot_minutes numeric;
  expected_duration int;
  resolved_treatment_label text;
  recent_waitlist_entries int;
  local_start timestamp;
  local_end timestamp;
  local_dow int;
begin
  if booking_slug is null or booking_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid booking target';
  end if;

  if treatment_slug is null or treatment_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid treatment';
  end if;

  select p.id
  into resolved_practice_id
  from public.practices p
  where p.slug = booking_slug
    and p.public_key is not null
  limit 1;

  if resolved_practice_id is null then
    raise exception 'invalid booking target';
  end if;

  select t.duration_minutes, t.label
  into expected_duration, resolved_treatment_label
  from public.practice_booking_treatments t
  where t.practice_id = resolved_practice_id
    and t.slug = treatment_slug
    and t.is_active = true;

  if expected_duration is null then
    raise exception 'invalid treatment';
  end if;

  if encrypted_payload is null
    or length(encrypted_payload) < 80
    or length(encrypted_payload) > 12000 then
    raise exception 'invalid encrypted payload';
  end if;

  if patient_email is null
    or length(patient_email) > 320
    or patient_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid patient email';
  end if;

  if requested_start_time is null
    or requested_end_time is null
    or requested_end_time <= requested_start_time then
    raise exception 'invalid appointment time range';
  end if;

  slot_minutes := extract(epoch from (requested_end_time - requested_start_time)) / 60;

  if slot_minutes::int <> expected_duration then
    raise exception 'invalid treatment duration';
  end if;

  if slot_minutes < 15 or slot_minutes > 180 then
    raise exception 'invalid appointment duration';
  end if;

  if requested_start_time < now() + interval '30 minutes' then
    raise exception 'appointment must be in the future';
  end if;

  if requested_start_time > now() + interval '180 days' then
    raise exception 'appointment too far in the future';
  end if;

  local_start := requested_start_time at time zone 'Europe/Berlin';
  local_end := requested_end_time at time zone 'Europe/Berlin';
  local_dow := extract(isodow from local_start)::int;

  if local_dow = 7 then
    raise exception 'appointments are not available on this day';
  end if;

  if extract(minute from local_start)::int not in (0, 15, 30, 45) then
    raise exception 'invalid appointment slot';
  end if;

  if local_dow between 1 and 5 then
    if local_start::time < time '09:00' or local_end::time > time '17:00' then
      raise exception 'appointment outside booking hours';
    end if;
  elsif local_dow = 6 then
    if local_start::time < time '09:00' or local_end::time > time '13:00' then
      raise exception 'appointment outside booking hours';
    end if;
  end if;

  select count(*)
  into recent_waitlist_entries
  from public.appointment_waitlist_entries w
  where w.practice_id = resolved_practice_id
    and w.created_at > now() - interval '10 minutes';

  if recent_waitlist_entries >= 20 then
    raise exception 'too many recent booking attempts';
  end if;

  if not exists (
    select 1
    from public.appointments a
    where a.practice_id = resolved_practice_id
      and a.status in ('booked', 'pending')
      and a.start_time = requested_start_time
      and a.end_time = requested_end_time
  ) then
    raise exception 'appointment slot is available';
  end if;

  insert into public.appointment_waitlist_entries (
    practice_id,
    treatment_slug,
    treatment_label,
    patient_email,
    encrypted_payload,
    requested_start_time,
    requested_end_time
  )
  values (
    resolved_practice_id,
    treatment_slug,
    resolved_treatment_label,
    lower(patient_email),
    encrypted_payload,
    requested_start_time,
    requested_end_time
  )
  returning id into waitlist_id;

  return waitlist_id;
end;
$$;

drop function if exists public.cancel_public_appointment(text, text);
drop function if exists public.cancel_public_appointment(text);

create or replace function public.cancel_public_appointment(
  cancel_token_hash text,
  waitlist_offer_token_hash text default null
)
returns table (
  practice_id uuid,
  practice_name text,
  start_time timestamptz,
  end_time timestamptz,
  status public.appointment_status,
  waitlist_entry_id uuid,
  waitlist_patient_email text,
  waitlist_treatment_label text,
  waitlist_start_time timestamptz,
  waitlist_end_time timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  cancelled_appointment record;
begin
  if cancel_token_hash is null or cancel_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid cancellation token';
  end if;

  if waitlist_offer_token_hash is not null
    and waitlist_offer_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid waitlist token';
  end if;

  update public.appointments a
  set
    status = 'cancelled',
    cancelled_at = now(),
    public_cancelled_at = now(),
    public_cancel_token_hash = null
  from public.practices p
  where p.id = a.practice_id
    and a.public_cancel_token_hash = cancel_token_hash
    and a.status in ('booked', 'pending')
    and a.start_time > now()
  returning
    p.id as practice_id,
    p.name as practice_name,
    a.start_time,
    a.end_time,
    a.status
  into cancelled_appointment;

  if cancelled_appointment.practice_id is null then
    return;
  end if;

  if waitlist_offer_token_hash is null then
    return query
    select
      cancelled_appointment.practice_id,
      cancelled_appointment.practice_name,
      cancelled_appointment.start_time,
      cancelled_appointment.end_time,
      cancelled_appointment.status,
      null::uuid,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz;
    return;
  end if;

  return query
  with offered as (
    select *
    from public.offer_public_waitlist_for_cancelled_slot(
      cancelled_appointment.practice_id,
      cancelled_appointment.start_time,
      cancelled_appointment.end_time,
      waitlist_offer_token_hash
    )
  )
  select
    cancelled_appointment.practice_id,
    cancelled_appointment.practice_name,
    cancelled_appointment.start_time,
    cancelled_appointment.end_time,
    cancelled_appointment.status,
    o.waitlist_entry_id,
    o.patient_email,
    o.treatment_label,
    o.start_time,
    o.end_time
  from (select 1) anchor
  left join offered o on true;
end;
$$;

grant execute on function public.offer_public_waitlist_for_cancelled_slot(uuid, timestamptz, timestamptz, text)
  to service_role;
grant execute on function public.cancel_public_appointment(text, text)
  to anon, authenticated;
