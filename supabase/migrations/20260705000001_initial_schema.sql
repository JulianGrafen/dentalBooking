-- ============================================================================
-- teeth.al — Initial Schema
-- Multi-tenant dental practice management.
--
-- Tenancy model (MVP): one auth user == one practice.
-- `practices.id` IS the auth user's UUID, so every RLS check reduces to
-- `practice_id = auth.uid()`. When multi-staff support lands, swap the
-- policy predicate for a membership lookup — the tables stay untouched.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type public.insurance_type as enum ('kasse', 'privat');

create type public.appointment_status as enum ('booked', 'cancelled');

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table public.practices (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

comment on table public.practices is
  'One row per tenant. id mirrors auth.users.id (single-login-per-practice MVP model).';

create table public.patients (
  id              uuid primary key default gen_random_uuid(),
  practice_id     uuid not null references public.practices (id) on delete cascade,
  name            text not null,
  phone           text,
  email           text,
  insurance_type  public.insurance_type not null,
  last_visit_date date,
  is_waitlisted   boolean not null default false,
  created_at      timestamptz not null default now()
);

create table public.appointments (
  id             uuid primary key default gen_random_uuid(),
  practice_id    uuid not null references public.practices (id) on delete cascade,
  patient_id     uuid not null references public.patients (id) on delete cascade,
  treatment_type text not null,
  start_time     timestamptz not null,
  end_time       timestamptz not null,
  status         public.appointment_status not null default 'booked',
  created_at     timestamptz not null default now(),

  constraint appointments_time_range_valid check (end_time > start_time)
);

-- ----------------------------------------------------------------------------
-- Indexes
-- Every tenant-scoped query filters on practice_id first, so all indexes
-- are composite with practice_id leading.
-- ----------------------------------------------------------------------------

-- Recall engine: "patients whose last visit was exactly N months ago".
create index patients_recall_idx
  on public.patients (practice_id, last_visit_date);

-- Smart-Fill: "waitlisted patients of this practice".
create index patients_waitlist_idx
  on public.patients (practice_id)
  where is_waitlisted = true;

-- Dashboard: "today's appointments", calendar views.
create index appointments_schedule_idx
  on public.appointments (practice_id, start_time);

create index appointments_patient_idx
  on public.appointments (patient_id);

-- ----------------------------------------------------------------------------
-- Auto-provision a practice row on signup.
-- The practice name is taken from auth metadata (set during sign-up),
-- falling back to the email address.
-- ----------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.practices (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'practice_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Strict tenant isolation: a logged-in practice can only ever see and
-- modify rows whose practice_id equals its own auth.uid().
--
-- Note: auth.uid() is wrapped in (select ...) so Postgres evaluates it
-- once per statement (InitPlan) instead of once per row.
-- ----------------------------------------------------------------------------

alter table public.practices    enable row level security;
alter table public.patients     enable row level security;
alter table public.appointments enable row level security;

-- practices: a user manages exactly their own practice row.
-- INSERT is intentionally absent — rows are provisioned by the signup trigger.

create policy "Practices: read own practice"
  on public.practices for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Practices: update own practice"
  on public.practices for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- patients: full CRUD, strictly tenant-scoped.

create policy "Patients: read own practice's patients"
  on public.patients for select
  to authenticated
  using (practice_id = (select auth.uid()));

create policy "Patients: create patients for own practice"
  on public.patients for insert
  to authenticated
  with check (practice_id = (select auth.uid()));

create policy "Patients: update own practice's patients"
  on public.patients for update
  to authenticated
  using (practice_id = (select auth.uid()))
  with check (practice_id = (select auth.uid()));

create policy "Patients: delete own practice's patients"
  on public.patients for delete
  to authenticated
  using (practice_id = (select auth.uid()));

-- appointments: full CRUD, strictly tenant-scoped.

create policy "Appointments: read own practice's appointments"
  on public.appointments for select
  to authenticated
  using (practice_id = (select auth.uid()));

create policy "Appointments: create appointments for own practice"
  on public.appointments for insert
  to authenticated
  with check (practice_id = (select auth.uid()));

create policy "Appointments: update own practice's appointments"
  on public.appointments for update
  to authenticated
  using (practice_id = (select auth.uid()))
  with check (practice_id = (select auth.uid()));

create policy "Appointments: delete own practice's appointments"
  on public.appointments for delete
  to authenticated
  using (practice_id = (select auth.uid()));
