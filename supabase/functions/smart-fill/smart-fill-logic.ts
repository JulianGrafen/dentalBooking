/**
 * Pure Smart-Fill logic — no I/O, trivially unit-testable.
 */

export const SMART_FILL_WINDOW_HOURS = 48;

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * E2EE note: appointments carry no plaintext patient/treatment data anymore —
 * only operational fields plus the (server-unreadable) encrypted payload.
 */
export interface AppointmentRecord {
  id: string;
  practice_id: string;
  start_time: string;
  end_time: string;
  status: 'booked' | 'cancelled';
}

export interface WaitlistedPatient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface WaitlistOffer {
  patientId: string;
  to: string;
  subject: string;
  body: string;
}

/**
 * A cancellation qualifies for Smart-Fill when the slot is in the future
 * but starts in less than SMART_FILL_WINDOW_HOURS — i.e. too short-notice
 * to be refilled organically.
 */
export function isShortNoticeCancellation(
  appointment: Pick<AppointmentRecord, 'status' | 'start_time'>,
  now: Date,
): boolean {
  if (appointment.status !== 'cancelled') return false;

  const start = new Date(appointment.start_time);
  const hoursUntilStart = (start.getTime() - now.getTime()) / MS_PER_HOUR;

  return hoursUntilStart > 0 && hoursUntilStart < SMART_FILL_WINDOW_HOURS;
}

/** Detects the transition into 'cancelled' (guards against duplicate events). */
export function isNewCancellation(
  record: Pick<AppointmentRecord, 'status'>,
  oldRecord: Pick<AppointmentRecord, 'status'> | null,
): boolean {
  return record.status === 'cancelled' && oldRecord?.status !== 'cancelled';
}

export function buildWaitlistOffer(
  patient: WaitlistedPatient,
  appointment: AppointmentRecord,
): WaitlistOffer | null {
  if (!patient.email) return null;

  const slot = new Date(appointment.start_time).toLocaleString('de-DE', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  });

  return {
    patientId: patient.id,
    to: patient.email,
    subject: 'Kurzfristiger Termin frei geworden',
    body:
      `Hallo ${patient.name},\n\n` +
      `bei uns ist kurzfristig ein Termin frei geworden:\n\n` +
      `  ${slot} Uhr\n\n` +
      `Sie stehen auf unserer Warteliste. Melden Sie sich schnell, ` +
      `wenn Sie den Termin übernehmen möchten!\n\nIhr Praxis-Team`,
  };
}

// ---------------------------------------------------------------------------
// Orchestration (testable without Deno / edge runtime)
// ---------------------------------------------------------------------------

export type SmartFillResult =
  | { action: 'skipped'; reason: string }
  | {
      action: 'notified';
      appointmentId: string;
      waitlisted: number;
      notified: number;
    };

export interface SmartFillDependencies {
  listWaitlistedPatients(practiceId: string): Promise<WaitlistedPatient[]>;
  sendOffer(offer: WaitlistOffer): Promise<void>;
}

/**
 * Core Smart-Fill pipeline — invoked by the edge function and E2E tests.
 * Filters cancellation → short-notice window → notify waitlisted patients.
 */
export async function processSmartFillWebhook(
  record: AppointmentRecord,
  oldRecord: Pick<AppointmentRecord, 'status'> | null,
  deps: SmartFillDependencies,
  now: Date = new Date(),
): Promise<SmartFillResult> {
  if (!isNewCancellation(record, oldRecord)) {
    return { action: 'skipped', reason: 'not a new cancellation' };
  }

  if (!isShortNoticeCancellation(record, now)) {
    return {
      action: 'skipped',
      reason: `slot not within the next ${SMART_FILL_WINDOW_HOURS}h`,
    };
  }

  const waitlisted = await deps.listWaitlistedPatients(record.practice_id);
  let notified = 0;

  for (const patient of waitlisted) {
    const offer = buildWaitlistOffer(patient, record);
    if (!offer) continue;
    await deps.sendOffer(offer);
    notified++;
  }

  return {
    action: 'notified',
    appointmentId: record.id,
    waitlisted: waitlisted.length,
    notified,
  };
}
