-- Resource assignment now happens when the practice confirms an appointment.
-- Public booking stays resource-free; room conflicts are checked at confirmation.

create or replace function public.create_public_booking(
  booking_slug text,
  treatment_slug text,
  encrypted_payload text,
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
  appointment_id uuid;
  slot_minutes numeric;
  expected_duration int;
  recent_online_bookings int;
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

  select t.duration_minutes
  into expected_duration
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
  into recent_online_bookings
  from public.appointments a
  where a.practice_id = resolved_practice_id
    and a.source = 'online'
    and a.created_at > now() - interval '10 minutes';

  if recent_online_bookings >= 12 then
    raise exception 'too many recent booking attempts';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(resolved_practice_id::text, 0));

  if exists (
    select 1
    from public.appointments a
    where a.practice_id = resolved_practice_id
      and a.status in ('booked', 'pending')
      and tstzrange(a.start_time, a.end_time, '[)') &&
          tstzrange(requested_start_time, requested_end_time, '[)')
  ) then
    raise exception 'appointment slot is no longer available';
  end if;

  insert into public.appointments (
    practice_id,
    encrypted_payload,
    start_time,
    end_time,
    status,
    source,
    resource_id
  )
  values (
    resolved_practice_id,
    encrypted_payload,
    requested_start_time,
    requested_end_time,
    'pending',
    'online',
    null
  )
  returning id into appointment_id;

  return appointment_id;
end;
$$;

create or replace function public.confirm_practice_appointment(
  target_appointment_id uuid,
  target_resource_id uuid,
  cancel_token_hash text
)
returns table (
  id uuid,
  start_time timestamptz,
  end_time timestamptz,
  status public.appointment_status,
  resource_id uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_appointment record;
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  if cancel_token_hash is null or cancel_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid cancel token';
  end if;

  select a.id, a.practice_id, a.start_time, a.end_time, a.status
  into target_appointment
  from public.appointments a
  where a.id = target_appointment_id
  for update;

  if target_appointment.id is null then
    raise exception 'appointment not found';
  end if;

  if not public.is_practice_member(target_appointment.practice_id, auth.uid()) then
    raise exception 'not authorized';
  end if;

  if target_appointment.status = 'cancelled' then
    raise exception 'appointment is cancelled';
  end if;

  if target_appointment.status = 'booked' then
    raise exception 'appointment already confirmed';
  end if;

  if target_resource_id is not null then
    if not exists (
      select 1
      from public.resources r
      where r.id = target_resource_id
        and r.practice_id = target_appointment.practice_id
        and r.type = 'room'
        and r.is_active = true
    ) then
      raise exception 'invalid room resource';
    end if;

    if exists (
      select 1
      from public.appointments a
      where a.practice_id = target_appointment.practice_id
        and a.id <> target_appointment.id
        and a.resource_id = target_resource_id
        and a.status = 'booked'
        and tstzrange(a.start_time, a.end_time, '[)') &&
            tstzrange(target_appointment.start_time, target_appointment.end_time, '[)')
    ) then
      raise exception 'room resource is not available';
    end if;
  end if;

  return query
  update public.appointments a
  set
    status = 'booked',
    resource_id = target_resource_id,
    public_cancel_token_hash = cancel_token_hash
  where a.id = target_appointment.id
  returning a.id, a.start_time, a.end_time, a.status, a.resource_id;
end;
$$;

grant execute on function public.create_public_booking(text, text, text, timestamptz, timestamptz)
  to anon, authenticated;
grant execute on function public.confirm_practice_appointment(uuid, uuid, text)
  to authenticated;
