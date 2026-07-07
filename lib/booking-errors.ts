/** Maps PostgREST / Postgres booking errors to patient-facing German messages. */
export function mapBookingError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid booking target')) {
    return 'Diese Buchungsseite ist nicht verfügbar. Bitte prüfen Sie den Link Ihrer Praxis.';
  }
  if (normalized.includes('appointment must be in the future')) {
    return 'Der Termin muss mindestens 30 Minuten in der Zukunft liegen. Bitte wählen Sie eine spätere Uhrzeit.';
  }
  if (normalized.includes('appointment slot is no longer available')) {
    return 'Dieser Termin ist inzwischen belegt. Bitte wählen Sie eine andere Uhrzeit.';
  }
  if (normalized.includes('appointment slot is available')) {
    return 'Dieser Termin ist inzwischen frei. Bitte buchen Sie ihn direkt.';
  }
  if (normalized.includes('invalid patient email')) {
    return 'Bitte geben Sie eine gültige E-Mail-Adresse für die Warteliste an.';
  }
  if (normalized.includes('outside booking hours') || normalized.includes('not available on this day')) {
    return 'Dieser Termin liegt außerhalb der Öffnungszeiten (Mo–Fr 09–17 Uhr, Sa 09–13 Uhr).';
  }
  if (normalized.includes('invalid appointment slot')) {
    return 'Bitte wählen Sie eine Uhrzeit im 15-Minuten-Takt.';
  }
  if (normalized.includes('invalid treatment duration') || normalized.includes('invalid treatment')) {
    return 'Die gewählte Behandlung ist nicht mehr verfügbar. Bitte laden Sie die Seite neu.';
  }
  if (normalized.includes('invalid appointment duration')) {
    return 'Die gewählte Behandlungsdauer passt nicht in den Termin.';
  }
  if (normalized.includes('invalid encrypted payload')) {
    return 'Die verschlüsselten Buchungsdaten konnten nicht verarbeitet werden. Bitte laden Sie die Seite neu.';
  }
  if (normalized.includes('too many recent booking attempts')) {
    return 'Zu viele Buchungsversuche. Bitte warten Sie einige Minuten.';
  }
  if (normalized.includes('appointment too far in the future')) {
    return 'Termine können maximal 180 Tage im Voraus gebucht werden.';
  }
  if (normalized.includes('invalid input value for enum') && normalized.includes('pending')) {
    return 'Buchungssystem nicht aktuell — bitte Datenbank-Migrationen ausführen (npm run db:push).';
  }
  if (normalized.includes('could not find the function') || normalized.includes('schema cache')) {
    return 'Buchungssystem nicht eingerichtet. Die Datenbank-Migrationen fehlen noch.';
  }

  return `Buchung fehlgeschlagen: ${message}`;
}
