-- ============================================================================
-- teeth.al — Restore table grants after column-level anon grant (0006)
--
-- Migration 0006 narrowed anon SELECT to specific columns. On some Postgres
-- setups the default table-level grants for authenticated/service_role were
-- not present on freshly created tables. This restores the Supabase
-- baseline so auth users and service-role scripts can access tenant data.
-- ============================================================================

grant select, insert, update, delete on public.practices    to authenticated, service_role;
grant select, insert, update, delete on public.patients     to authenticated, service_role;
grant select, insert, update, delete on public.appointments to authenticated, service_role;

-- anon: keep column-scoped read on practices (0006), full insert on appointments (0005).
grant insert on public.appointments to anon;
