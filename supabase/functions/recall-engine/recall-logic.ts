/**
 * Pure recall logic — no I/O, trivially unit-testable.
 */

export const RECALL_INTERVAL_MONTHS = 6;

export interface RecallPatient {
  id: string;
  practice_id: string;
  name: string;
  email: string | null;
  last_visit_date: string;
}

export interface RecallEmail {
  patientId: string;
  to: string;
  subject: string;
  body: string;
}

/**
 * Subtracts `months` from a date with day-of-month clamping, so
 * e.g. Aug 31 - 6 months yields Feb 28/29 instead of rolling over
 * into March (which plain `setMonth` would do).
 */
export function subtractMonths(date: Date, months: number): Date {
  const firstOfTargetMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1),
  );
  const daysInTargetMonth = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  firstOfTargetMonth.setUTCDate(Math.min(date.getUTCDate(), daysInTargetMonth));
  return firstOfTargetMonth;
}

/** ISO date (YYYY-MM-DD) — matches Postgres `date` column encoding. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The `last_visit_date` a patient must have to be due for recall today. */
export function computeRecallTargetDate(today: Date): string {
  return toIsoDate(subtractMonths(today, RECALL_INTERVAL_MONTHS));
}

export function buildRecallEmail(patient: RecallPatient): RecallEmail | null {
  if (!patient.email) return null;

  return {
    patientId: patient.id,
    to: patient.email,
    subject: 'Zeit für Ihre Prophylaxe',
    body:
      `Hallo ${patient.name},\n\n` +
      `Ihr letzter Besuch bei uns liegt nun ${RECALL_INTERVAL_MONTHS} Monate zurück ` +
      `(${patient.last_visit_date}). Zeit für Ihre Prophylaxe!\n\n` +
      `Vereinbaren Sie jetzt einen Termin.\n\nIhr Praxis-Team`,
  };
}
