-- Public booking RPCs must work for anon visitors AND logged-in users testing the link.

grant execute on function public.get_public_booking_practice(text) to anon, authenticated;
grant execute on function public.get_public_booking_treatments(text) to anon, authenticated;
grant execute on function public.get_public_booking_availability(text, date) to anon, authenticated;
grant execute on function public.create_public_booking(text, text, text, timestamptz, timestamptz)
  to anon, authenticated;

-- Drop legacy 4-arg overload left by earlier migrations (replaced by treatment_slug param).
drop function if exists public.create_public_booking(text, text, timestamptz, timestamptz);
