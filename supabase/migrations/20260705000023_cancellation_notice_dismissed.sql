-- Allow practice members to dismiss cancellation notifications after review.

alter table public.appointments
  add column if not exists cancellation_notice_dismissed_at timestamptz;

drop index if exists public.appointments_cancelled_notifications_idx;

create index if not exists appointments_cancelled_notifications_idx
  on public.appointments (practice_id, cancelled_at desc)
  where status = 'cancelled'
    and cancellation_notice_dismissed_at is null;
