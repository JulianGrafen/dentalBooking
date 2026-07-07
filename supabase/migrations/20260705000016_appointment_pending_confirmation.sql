-- Online bookings start as pending until the practice confirms them.

alter type public.appointment_status add value if not exists 'pending';
