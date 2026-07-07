-- Existing online bookings were auto-marked booked before confirmation flow existed.

update public.appointments
set status = 'pending'
where source = 'online'
  and status = 'booked';
