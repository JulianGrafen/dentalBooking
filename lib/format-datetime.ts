/** German locale formatting for appointment slots in UI and emails. */

export function formatAppointmentSlot(iso: string, timeZone = 'Europe/Berlin'): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

export function formatAppointmentTimeRange(
  startIso: string,
  endIso: string,
  timeZone = 'Europe/Berlin',
): string {
  const dateFormatter = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  });
  const timeFormatter = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });

  const start = new Date(startIso);
  const end = new Date(endIso);

  return `${dateFormatter.format(start)}, ${timeFormatter.format(start)} – ${timeFormatter.format(end)} Uhr`;
}
