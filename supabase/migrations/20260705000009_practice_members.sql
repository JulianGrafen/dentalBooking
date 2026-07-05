-- ============================================================================
-- teeth.al — Multi-user practice memberships
--
-- Enables multiple auth users to manage one practice calendar. The previous MVP
-- assumption "practice_id = auth.uid()" is replaced by explicit membership.
-- Existing owners are backfilled as owner members.
-- ============================================================================

create type public.practice_role as enum ('owner', 'calendar_manager');

create table public.practice_members (
  practice_id  uuid not null references public.practices (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  member_email text not null,
  role         public.practice_role not null default 'calendar_manager',
  created_at   timestamptz not null default now(),

  primary key (practice_id, user_id)
);

create table public.practice_invites (
  id          uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  email       text not null,
  role        public.practice_role not null default 'calendar_manager',
  token       uuid not null unique default gen_random_uuid(),
  invited_by  uuid not null references auth.users (id) on delete cascade,
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

create index practice_members_user_idx
  on public.practice_members (user_id, practice_id);

create index practice_invites_practice_idx
  on public.practice_invites (practice_id, created_at desc);

create index practice_invites_email_idx
  on public.practice_invites (lower(email))
  where accepted_at is null;

alter table public.practice_members enable row level security;
alter table public.practice_invites enable row level security;

-- ----------------------------------------------------------------------------
-- Membership helpers used by policies. SECURITY DEFINER avoids recursive RLS
-- checks on practice_members while still basing decisions on auth.uid().
-- ----------------------------------------------------------------------------

create function public.is_practice_member(target_practice_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.practice_members pm
    where pm.practice_id = target_practice_id
      and pm.user_id = target_user_id
  );
$$;

create function public.is_practice_owner(target_practice_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.practice_members pm
    where pm.practice_id = target_practice_id
      and pm.user_id = target_user_id
      and pm.role = 'owner'
  );
$$;

-- Backfill existing single-user practices as owners.
insert into public.practice_members (practice_id, user_id, member_email, role)
select p.id, u.id, coalesce(u.email, p.name), 'owner'
from public.practices p
join auth.users u on u.id = p.id
on conflict (practice_id, user_id) do nothing;

-- Ensure future signups also get owner membership.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  practice_name text :=
    coalesce(new.raw_user_meta_data ->> 'practice_name', new.email);
  created_practice_id uuid;
  attempts int := 0;
begin
  loop
    begin
      insert into public.practices (id, name, slug)
      values (
        new.id,
        practice_name,
        public.generate_unique_practice_slug(practice_name)
      )
      returning id into created_practice_id;

      insert into public.practice_members (practice_id, user_id, member_email, role)
      values (created_practice_id, new.id, coalesce(new.email, practice_name), 'owner');

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
-- Replace tenant checks with membership checks.
-- ----------------------------------------------------------------------------

drop policy if exists "Practices: read own practice" on public.practices;
drop policy if exists "Practices: update own practice" on public.practices;
drop policy if exists "Patients: read own practice's patients" on public.patients;
drop policy if exists "Patients: create patients for own practice" on public.patients;
drop policy if exists "Patients: update own practice's patients" on public.patients;
drop policy if exists "Patients: delete own practice's patients" on public.patients;
drop policy if exists "Appointments: read own practice's appointments" on public.appointments;
drop policy if exists "Appointments: create appointments for own practice" on public.appointments;
drop policy if exists "Appointments: update own practice's appointments" on public.appointments;
drop policy if exists "Appointments: delete own practice's appointments" on public.appointments;

create policy "Practices: members read practice"
  on public.practices for select
  to authenticated
  using (public.is_practice_member(id));

create policy "Practices: owners update practice"
  on public.practices for update
  to authenticated
  using (public.is_practice_owner(id))
  with check (public.is_practice_owner(id));

create policy "Patients: members read practice patients"
  on public.patients for select
  to authenticated
  using (public.is_practice_member(practice_id));

create policy "Patients: members create practice patients"
  on public.patients for insert
  to authenticated
  with check (public.is_practice_member(practice_id));

create policy "Patients: members update practice patients"
  on public.patients for update
  to authenticated
  using (public.is_practice_member(practice_id))
  with check (public.is_practice_member(practice_id));

create policy "Patients: owners delete practice patients"
  on public.patients for delete
  to authenticated
  using (public.is_practice_owner(practice_id));

create policy "Appointments: members read practice appointments"
  on public.appointments for select
  to authenticated
  using (public.is_practice_member(practice_id));

create policy "Appointments: members create practice appointments"
  on public.appointments for insert
  to authenticated
  with check (public.is_practice_member(practice_id));

create policy "Appointments: members update practice appointments"
  on public.appointments for update
  to authenticated
  using (public.is_practice_member(practice_id))
  with check (public.is_practice_member(practice_id));

create policy "Appointments: owners delete practice appointments"
  on public.appointments for delete
  to authenticated
  using (public.is_practice_owner(practice_id));

-- Membership visibility: members can see the team of practices they belong to.
create policy "Practice members: members read team"
  on public.practice_members for select
  to authenticated
  using (public.is_practice_member(practice_id));

create policy "Practice members: owners manage team"
  on public.practice_members for all
  to authenticated
  using (public.is_practice_owner(practice_id))
  with check (public.is_practice_owner(practice_id));

create policy "Practice invites: owners read invites"
  on public.practice_invites for select
  to authenticated
  using (public.is_practice_owner(practice_id));

-- ----------------------------------------------------------------------------
-- Invite RPCs. Direct INSERT/UPDATE on invites is intentionally not granted.
-- ----------------------------------------------------------------------------

create function public.create_practice_invite(target_email text)
returns table(token uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_email text := auth.jwt() ->> 'email';
  owned_practice_id uuid;
begin
  if actor is null then
    raise exception 'not authenticated';
  end if;

  select pm.practice_id
  into owned_practice_id
  from public.practice_members pm
  where pm.user_id = actor
    and pm.role = 'owner'
  order by pm.created_at asc
  limit 1;

  if owned_practice_id is null then
    raise exception 'only owners can invite team members';
  end if;

  if lower(trim(target_email)) = lower(coalesce(actor_email, '')) then
    raise exception 'cannot invite yourself';
  end if;

  return query
  insert into public.practice_invites (practice_id, email, role, invited_by)
  values (owned_practice_id, lower(trim(target_email)), 'calendar_manager', actor)
  returning practice_invites.token, practice_invites.expires_at;
end;
$$;

create function public.accept_practice_invite(invite_token uuid)
returns table(practice_id uuid, role public.practice_role)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invite_row public.practice_invites%rowtype;
begin
  if actor is null then
    raise exception 'not authenticated';
  end if;

  select *
  into invite_row
  from public.practice_invites pi
  where pi.token = invite_token
    and pi.accepted_at is null
    and pi.expires_at > now();

  if invite_row.id is null then
    raise exception 'invite not found or expired';
  end if;

  if lower(invite_row.email) <> actor_email then
    raise exception 'invite email does not match signed-in user';
  end if;

  insert into public.practice_members (practice_id, user_id, member_email, role)
  values (invite_row.practice_id, actor, actor_email, invite_row.role)
  on conflict on constraint practice_members_pkey
  do update set role = excluded.role, member_email = excluded.member_email;

  update public.practice_invites
  set accepted_at = now()
  where id = invite_row.id;

  return query select invite_row.practice_id, invite_row.role;
end;
$$;

grant select, insert, update, delete on public.practice_members to authenticated, service_role;
grant select on public.practice_invites to authenticated, service_role;
grant execute on function public.is_practice_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_practice_owner(uuid, uuid) to authenticated, service_role;
grant execute on function public.create_practice_invite(text) to authenticated;
grant execute on function public.accept_practice_invite(uuid) to authenticated;
