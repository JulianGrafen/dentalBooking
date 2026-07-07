-- Ensure pending exists (safe if 00016 was skipped on hosted Supabase).

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    inner join pg_type t on t.oid = e.enumtypid
    where t.typname = 'appointment_status'
      and e.enumlabel = 'pending'
  ) then
    alter type public.appointment_status add value 'pending';
  end if;
end
$$;

-- Refresh PostgREST schema cache after enum change.
notify pgrst, 'reload schema';
