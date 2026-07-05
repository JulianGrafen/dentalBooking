-- ============================================================================
-- teeth.al — Public Booking Security Hardening
--
-- Fixes the critical public RLS findings:
--   1. Anonymous clients can no longer enumerate practices/public keys.
--   2. Anonymous clients can no longer insert appointments directly.
--   3. Public booking is constrained behind SECURITY DEFINER RPCs with
--      explicit validation, no public practice UUID exposure, and overlap checks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Deny direct anonymous table access for public booking.
-- Public clients must use the RPC boundary below.
-- ----------------------------------------------------------------------------

drop policy if exists "Practices: public booking info readable by anyone"
  on public.practices;

drop policy if exists "Appointments: anonymous patients may book"
  on public.appointments;

revoke select on public.practices from anon;
revoke insert on public.appointments from anon;

-- Keep internal helper functions off the public execution surface.
revoke execute on function public.slugify(text) from public, anon, authenticated;
revoke execute on function public.generate_unique_practice_slug(text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Public exact-slug lookup.
-- Returns only the data needed to render the public booking page. It does not
-- expose practice UUIDs, created_at, or any listable table surface.
-- ----------------------------------------------------------------------------

create function public.get_public_booking_practice(booking_slug text)
returns table (
  name text,
  public_key text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name, p.public_key
  from public.practices p
  where p.slug = booking_slug
    and p.public_key is not null
    and booking_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- Public booking insertion boundary.
--
-- The function deliberately resolves practice_id internally from slug, forces
-- status/source server-side, validates operational metadata, caps ciphertext
-- size, rate-limits per practice, and rejects overlapping slots.
-- ----------------------------------------------------------------------------

create function public.create_public_booking(
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

  if requested_start_time <= now() + interval '30 minutes' then
    raise exception 'appointment must be in the future';
  end if;

  if requested_start_time > now() + interval '180 days' then
    raise exception 'appointment too far in the future';
  end if;

  if extract(isodow from requested_start_time) not between 1 and 6 then
    raise exception 'appointments are not available on this day';
  end if;

  if extract(hour from requested_start_time) < 7
    or extract(hour from requested_start_time) > 19 then
    raise exception 'appointment outside booking hours';
  end if;

  if extract(minute from requested_start_time)::int not in (0, 15, 30, 45) then
    raise exception 'invalid appointment slot';
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

  -- Serialize public booking attempts per practice to make the following
  -- overlap check race-safe without requiring a hard constraint on legacy data.
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

-- Function execution is deny-by-default. Re-grant only the intended API surface.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_practice_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_practice_owner(uuid, uuid) to authenticated, service_role;
grant execute on function public.create_practice_invite(text) to authenticated;
grant execute on function public.accept_practice_invite(uuid) to authenticated;
grant execute on function public.get_public_booking_practice(text) to anon;
grant execute on function public.create_public_booking(text, text, timestamptz, timestamptz) to anon;
