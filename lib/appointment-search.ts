import type { DecryptedAppointment } from '@/lib/appointment-decrypt';

export function normalizePatientSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase('de-DE');
}

export function matchesPatientName(patientName: string, query: string): boolean {
  const normalizedQuery = normalizePatientSearchQuery(query);
  if (!normalizedQuery) return true;

  return patientName.toLocaleLowerCase('de-DE').includes(normalizedQuery);
}

/** Client-side filter — patient names exist only after E2EE decryption in the browser. */
export function filterAppointmentsByPatientName(
  appointments: DecryptedAppointment[],
  query: string,
): DecryptedAppointment[] {
  const normalizedQuery = normalizePatientSearchQuery(query);
  if (!normalizedQuery) return appointments;

  return appointments.filter(
    (appointment) =>
      !appointment.error && matchesPatientName(appointment.patientName, normalizedQuery),
  );
}
