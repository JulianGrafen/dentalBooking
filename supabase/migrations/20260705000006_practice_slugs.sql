-- ============================================================================
-- teeth.al — Public Booking Slugs
--
-- Human-friendly booking URLs: /book/praxis-dr-mueller instead of UUIDs.
--
--   1. practices.slug (text, unique, URL-safe format enforced by CHECK)
--   2. Backfill for existing practices (slugified name + short stable hash;
--      new signups get clean slugs via the registration flow — step 2)
--   3. Anonymous read access narrowed to exactly the public booking fields.
--
-- IMPORTANT — RLS vs. column privileges:
-- RLS policies filter ROWS, never columns. "anon may read only name, slug,
-- public_key" therefore needs two layers:
--   * the row-level SELECT policy from migration 0005 (using (true)), and
--   * COLUMN-level GRANTs, replacing Supabase's default table-wide grant.
-- A SELECT * from anon now fails; selecting the granted columns succeeds.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Slug column
-- ----------------------------------------------------------------------------

alter table public.practices
  add column slug text unique
  constraint practices_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

comment on column public.practices.slug is
  'URL-safe unique identifier for the public booking page (/book/[slug]).';

-- ----------------------------------------------------------------------------
-- 2. Backfill existing practices
-- Deterministic: slugified name + 6-char hash of the id guarantees
-- uniqueness without a retry loop. New registrations produce cleaner
-- slugs (suffix only on collision) in application code.
-- ----------------------------------------------------------------------------

update public.practices
set slug = trim(
  both '-' from
  regexp_replace(
    translate(lower(name), 'äöüß', 'aous'),
    '[^a-z0-9]+', '-', 'g'
  )
) || '-' || left(md5(id::text), 6)
where slug is null;

-- ----------------------------------------------------------------------------
-- 3. Narrow anonymous read access to the public booking fields.
--
-- `id` is included alongside name/slug/public_key: the booking client must
-- reference practice_id when inserting the encrypted appointment, and the
-- id is not sensitive. Everything else (created_at, future columns) is now
-- invisible to anon.
-- ----------------------------------------------------------------------------

revoke select on public.practices from anon;

grant select (id, name, slug, public_key) on public.practices to anon;
