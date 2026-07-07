-- Timestamp cancellations so the dashboard can surface recent cancellation notifications.

alter table public.appointments
  add column if not exists cancelled_at timestamptz;

create index if not exists appointments_cancelled_notifications_idx
  on public.appointments (practice_id, cancelled_at desc)
  where status = 'cancelled';

update public.appointments
set cancelled_at = coalesce(public_cancelled_at, created_at)
where status = 'cancelled'
  and cancelled_at is null;

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
    cancelled_at = now(),
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

grant execute on function public.cancel_public_appointment(text) to anon, authenticated;
