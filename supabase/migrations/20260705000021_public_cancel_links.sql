-- Public patient cancellation links for confirmed appointment emails.

alter table public.appointments
  add column if not exists public_cancel_token_hash text,
  add column if not exists public_cancelled_at timestamptz;

create unique index if not exists appointments_public_cancel_token_hash_idx
  on public.appointments (public_cancel_token_hash)
  where public_cancel_token_hash is not null;

create or replace function public.get_public_cancel_appointment(cancel_token_hash text)
returns table (
  practice_name text,
  start_time timestamptz,
  end_time timestamptz,
  status public.appointment_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if cancel_token_hash is null or cancel_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid cancellation token';
  end if;

  return query
  select p.name, a.start_time, a.end_time, a.status
  from public.appointments a
  inner join public.practices p on p.id = a.practice_id
  where a.public_cancel_token_hash = cancel_token_hash
  limit 1;
end;
$$;

create or replace function public.cancel_public_appointment(cancel_token_hash text)
returns table (
  practice_name text,
  start_time timestamptz,
  end_time timestamptz,
  status public.appointment_status
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if cancel_token_hash is null or cancel_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid cancellation token';
  end if;

  return query
  update public.appointments a
  set
    status = 'cancelled',
    public_cancelled_at = now(),
    public_cancel_token_hash = null
  from public.practices p
  where p.id = a.practice_id
    and a.public_cancel_token_hash = cancel_token_hash
    and a.status in ('booked', 'pending')
    and a.start_time > now()
  returning p.name, a.start_time, a.end_time, a.status;
end;
$$;

grant execute on function public.get_public_cancel_appointment(text) to anon, authenticated;
grant execute on function public.cancel_public_appointment(text) to anon, authenticated;
