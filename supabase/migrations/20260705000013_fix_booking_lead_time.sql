-- Align lead-time validation: accept slots exactly 30 minutes ahead (was off-by-one with <=).

create or replace function public.create_public_booking(
  booking_slug text,
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
  recent_online_bookings int;
  local_start timestamp;
  local_end timestamp;
  local_dow int;
begin
  if booking_slug is null or booking_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid booking target';
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
      and a.status = 'booked'
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
    source
  )
  values (
    resolved_practice_id,
    encrypted_payload,
    requested_start_time,
    requested_end_time,
    'booked',
    'online'
  )
  returning id into appointment_id;

  return appointment_id;
end;
$$;

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_practice_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_practice_owner(uuid, uuid) to authenticated, service_role;
grant execute on function public.create_practice_invite(text) to authenticated;
grant execute on function public.accept_practice_invite(uuid) to authenticated;
grant execute on function public.get_public_booking_practice(text) to anon;
grant execute on function public.get_public_booking_availability(text, date) to anon;
grant execute on function public.create_public_booking(text, text, timestamptz, timestamptz) to anon;
