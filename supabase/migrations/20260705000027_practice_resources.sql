-- Feature: Ressourcen-Management (Stühle, Räume, Geräte).
-- Treatments can require a resource (e.g. Röntgen -> Röntgenraum); bookings
-- block that resource and are rejected when it is already occupied.

create type public.resource_type as enum ('chair', 'room', 'equipment');

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  name text not null,
  type public.resource_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_name_length check (char_length(name) between 2 and 120),
  constraint resources_practice_name_unique unique (practice_id, name),
  -- Composite key target so referencing tables can enforce same-practice links.
  constraint resources_id_practice_unique unique (id, practice_id)
);

create index resources_practice_active_idx
  on public.resources (practice_id, is_active, type, name);

alter table public.resources enable row level security;

create policy "Members read resources"
  on public.resources
  for select
  to authenticated
  using (public.is_practice_member(practice_id));

create policy "Owners manage resources"
  on public.resources
  for all
  to authenticated
  using (public.is_practice_owner(practice_id))
  with check (public.is_practice_owner(practice_id));

grant select, insert, update, delete on public.resources to authenticated, service_role;

-- Appointments optionally block one resource. The composite FK guarantees the
-- resource belongs to the same practice as the appointment.
alter table public.appointments
  add column resource_id uuid,
  add constraint appointments_resource_same_practice_fkey
    foreign key (resource_id, practice_id)
    references public.resources (id, practice_id)
    on delete set null (resource_id);

create index appointments_resource_time_idx
  on public.appointments (resource_id, start_time)
  where resource_id is not null;

-- Treatments can declare a required resource (same-practice enforced via FK).
alter table public.practice_booking_treatments
  add column required_resource_id uuid,
  add constraint booking_treatments_resource_same_practice_fkey
    foreign key (required_resource_id, practice_id)
    references public.resources (id, practice_id)
    on delete set null (required_resource_id);

-- Booking RPC: resolve the treatment's required resource, reject when that
-- resource is occupied (even if the practitioner would have time), and store
-- the blocked resource on the appointment.
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
  required_resource uuid;
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

  select t.duration_minutes, t.required_resource_id
  into expected_duration, required_resource
  from public.practice_booking_treatments t
  where t.practice_id = resolved_practice_id
    and t.slug = treatment_slug
    and t.is_active = true;

  if expected_duration is null then
    raise exception 'invalid treatment';
  end if;

  -- A deactivated resource must not silently drop the requirement — treat the
  -- treatment as not bookable until the practice fixes its configuration.
  if required_resource is not null and not exists (
    select 1
    from public.resources r
    where r.id = required_resource
      and r.practice_id = resolved_practice_id
      and r.is_active = true
  ) then
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

  -- Resource conflict first: a blocked resource rejects the booking with a
  -- specific error, independent of practitioner availability.
  if required_resource is not null and exists (
    select 1
    from public.appointments a
    where a.resource_id = required_resource
      and a.status in ('booked', 'pending')
      and tstzrange(a.start_time, a.end_time, '[)') &&
          tstzrange(requested_start_time, requested_end_time, '[)')
  ) then
    raise exception 'required resource is not available';
  end if;

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
    required_resource
  )
  returning id into appointment_id;

  return appointment_id;
end;
$$;

grant execute on function public.create_public_booking(text, text, text, timestamptz, timestamptz)
  to anon, authenticated;
