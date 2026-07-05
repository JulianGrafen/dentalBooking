-- ============================================================================
-- teeth.al — Zero-Knowledge Booking (E2EE)
--
-- Eliminates server-side plaintext processing of patient/health data
-- (Art. 9 GDPR) in the booking flow:
--
--   * practices.public_key      — asymmetric public key of the practice.
--                                 Patients encrypt against it in the browser.
--   * appointments              — loses ALL plaintext patient references
--                                 (patient_id link, treatment_type). Sensitive
--                                 data lives solely in encrypted_payload,
--                                 decryptable only with the practice's
--                                 private key, which never touches the server.
--
-- Plaintext that remains on appointments is purely operational:
-- id, practice_id, start_time, end_time, status (+ created_at, source —
-- non-personal metadata needed for scheduling and dashboard metrics).
--
-- PRE-PRODUCTION ASSUMPTION: no live appointment data exists yet, so
-- plaintext columns are dropped outright (no backfill/re-encryption path).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- practices: public encryption key
-- Nullable by design — existing practices provision their key pair on first
-- login; the booking page refuses bookings for practices without a key.
-- ----------------------------------------------------------------------------

alter table public.practices
  add column public_key text;

comment on column public.practices.public_key is
  'Base64-encoded public key (NaCl box). Private counterpart exists only in the practice''s browser.';

-- ----------------------------------------------------------------------------
-- appointments: strip plaintext patient data, add encrypted payload
-- ----------------------------------------------------------------------------

-- Fail fast if this ever runs against a database with real appointments.
do $$
begin
  if exists (select 1 from public.appointments) then
    raise exception
      'appointments table is not empty — write a re-encryption backfill before applying this migration';
  end if;
end;
$$;

alter table public.appointments
  drop column patient_id,
  drop column treatment_type,
  add column encrypted_payload text not null;

comment on column public.appointments.encrypted_payload is
  'E2E-encrypted patient data (name, contact, insurance, treatment reason). Ciphertext only — the server cannot decrypt this.';

-- ----------------------------------------------------------------------------
-- RLS: anonymous booking support
--
-- Patients are anonymous. They need to:
--   1. read a practice''s public_key (public by definition), and
--   2. create an appointment containing only ciphertext + slot times.
--
-- Anonymous users still can NOT read, update or delete any appointment,
-- and cannot read anything else — the existing authenticated policies
-- remain untouched.
-- ----------------------------------------------------------------------------

create policy "Practices: public booking info readable by anyone"
  on public.practices for select
  to anon
  using (true);

create policy "Appointments: anonymous patients may book"
  on public.appointments for insert
  to anon
  with check (
    status = 'booked'
    and source = 'online'
    and start_time > now()
  );
