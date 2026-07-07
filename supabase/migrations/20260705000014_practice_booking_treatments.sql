-- Configurable online-booking treatments per practice (label, duration, active).

create table public.practice_booking_treatments (
  practice_id uuid not null references public.practices (id) on delete cascade,
  slug text not null,
  label text not null,
  duration_minutes int not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (practice_id, slug),
  constraint practice_booking_treatments_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint practice_booking_treatments_label_length
    check (char_length(label) between 2 and 120),
  constraint practice_booking_treatments_duration_range
    check (
      duration_minutes between 15 and 180
      and duration_minutes % 15 = 0
    )
);

create index practice_booking_treatments_practice_active_idx
  on public.practice_booking_treatments (practice_id, is_active, sort_order);

alter table public.practice_booking_treatments enable row level security;

create policy "Members read booking treatments"
  on public.practice_booking_treatments
  for select
  to authenticated
  using (public.is_practice_member(practice_id));

create policy "Owners manage booking treatments"
  on public.practice_booking_treatments
  for all
  to authenticated
  using (public.is_practice_owner(practice_id))
  with check (public.is_practice_owner(practice_id));

-- Seed default treatments for a practice (idempotent).
create or replace function public.seed_practice_booking_treatments(target_practice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.practice_booking_treatments (
    practice_id,
    slug,
    label,
    duration_minutes,
    sort_order
  )
  values
    (target_practice_id, 'prophylaxe', 'Prophylaxe / Zahnreinigung', 60, 1),
    (target_practice_id, 'kontrolle', 'Kontrolluntersuchung', 30, 2),
    (target_practice_id, 'schmerzbehandlung', 'Schmerzbehandlung', 45, 3),
    (target_practice_id, 'fuellung', 'Füllungstherapie', 60, 4),
    (target_practice_id, 'beratung', 'Beratungsgespräch', 30, 5)
  on conflict (practice_id, slug) do nothing;
end;
$$;

-- Backfill existing practices.
select public.seed_practice_booking_treatments(p.id)
from public.practices p;

-- New signups get default treatments.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  practice_name text :=
    coalesce(new.raw_user_meta_data ->> 'practice_name', new.email);
  created_practice_id uuid;
  attempts int := 0;
begin
  loop
    begin
      insert into public.practices (id, name, slug)
      values (
        new.id,
        practice_name,
        public.generate_unique_practice_slug(practice_name)
      )
      returning id into created_practice_id;

      insert into public.practice_members (practice_id, user_id, member_email, role)
      values (created_practice_id, new.id, coalesce(new.email, practice_name), 'owner');

      perform public.seed_practice_booking_treatments(created_practice_id);

      return new;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts >= 3 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

-- Public: active treatments for the booking wizard.
create function public.get_public_booking_treatments(booking_slug text)
returns table (
  slug text,
  label text,
  duration_minutes int
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.slug, t.label, t.duration_minutes
  from public.practice_booking_treatments t
  inner join public.practices p on p.id = t.practice_id
  where p.slug = booking_slug
    and p.public_key is not null
    and t.is_active = true
  order by t.sort_order, t.label;
$$;

-- Validate treatment slug + duration on booking.
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
grant execute on function public.get_public_booking_treatments(text) to anon;
grant execute on function public.get_public_booking_availability(text, date) to anon;
grant execute on function public.create_public_booking(text, text, text, timestamptz, timestamptz) to anon;
