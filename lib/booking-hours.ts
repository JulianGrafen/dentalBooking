/** Practice timezone — opening-hour checks and slot labels use Europe/Berlin. */
export const PRACTICE_TIMEZONE = 'Europe/Berlin';

export const BOOKING_MIN_LEAD_MINUTES = 30;

export interface DayOpeningHours {
  open: string;
  close: string;
}

/** Mo–Fr 09:00–17:00, Sa 09:00–13:00, So geschlossen. */
export function getOpeningHoursForDate(isoDate: string): DayOpeningHours | null {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay();

  if (weekday === 0) return null;
  if (weekday === 6) return { open: '09:00', close: '13:00' };
  return { open: '09:00', close: '17:00' };
}

export function formatOpeningHoursLabel(isoDate: string): string {
  const hours = getOpeningHoursForDate(isoDate);
  if (!hours) return 'Sonntags geschlossen';
  return `${hours.open}–${hours.close} Uhr`;
}
