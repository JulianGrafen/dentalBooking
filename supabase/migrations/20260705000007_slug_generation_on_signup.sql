-- ============================================================================
-- teeth.al — Slug Generation on Registration
--
-- Slugs are generated inside the signup trigger (the single place where
-- practices are provisioned), so no client ever needs slug logic:
--
--   'Zahnarztpraxis Dr. Müller' → 'zahnarztpraxis-dr-mueller'
--
-- Collision strategy: clean slug first; on conflict append a 6-char random
-- suffix and retry (bounded). Uniqueness is ultimately enforced by the
-- unique index, not by the check-then-insert (which alone would race).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Slugify (pure, immutable) — German transliteration included.
-- ----------------------------------------------------------------------------

create function public.slugify(input text)
returns text
language sql
immutable
strict
as $$
  select trim(
    both '-' from
    regexp_replace(
      replace(replace(replace(replace(lower(input), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- Unique slug generation with bounded retry.
-- ----------------------------------------------------------------------------

create function public.generate_unique_practice_slug(practice_name text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  base_slug text := coalesce(nullif(public.slugify(practice_name), ''), 'praxis');
  candidate text := base_slug;
  attempts  int  := 0;
begin
  while exists (select 1 from public.practices where slug = candidate) loop
    attempts := attempts + 1;
    if attempts > 5 then
      raise exception 'could not generate a unique slug for %', practice_name;
    end if;
    candidate := base_slug || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
  end loop;

  return candidate;
end;
$$;

-- ----------------------------------------------------------------------------
-- Signup trigger now provisions the slug as well.
-- The retry loop guards the (unlikely) race of two concurrent signups
-- generating the same candidate between check and insert.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  practice_name text :=
    coalesce(new.raw_user_meta_data ->> 'practice_name', new.email);
  attempts int := 0;
begin
  loop
    begin
      insert into public.practices (id, name, slug)
      values (
        new.id,
        practice_name,
        public.generate_unique_practice_slug(practice_name)
      );
      return new;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts >= 3 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Re-slug existing practices: replace the hash-suffixed backfill slugs
-- from migration 0006 with clean ones where possible.
-- PRE-PRODUCTION: booking links are not in circulation yet, so changing
-- slugs is safe. Never do this once links have been shared.
-- ----------------------------------------------------------------------------

update public.practices
set slug = public.generate_unique_practice_slug(name);

-- Every practice now has a slug — lock it in.
alter table public.practices
  alter column slug set not null;
