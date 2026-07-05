-- ============================================================================
-- teeth.al — Appointment Source Tracking
--
-- The dashboard reports "recall appointments this month" and "gaps filled
-- by Smart-Fill". Both require knowing HOW an appointment was booked, so
-- appointments get an explicit origin column.
-- ============================================================================

create type public.appointment_source as enum (
  'manual',      -- booked by practice staff
  'online',      -- self-booked via /book/[practiceId]
  'recall',      -- booked in response to a recall email
  'smart_fill'   -- booked via a Smart-Fill waitlist offer
);

alter table public.appointments
  add column source public.appointment_source not null default 'manual';

-- Dashboard metrics: "count by source within a month" per practice.
create index appointments_source_idx
  on public.appointments (practice_id, source, start_time);
