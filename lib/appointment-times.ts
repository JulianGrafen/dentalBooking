import { PRACTICE_TIMEZONE } from '@/lib/booking-hours';

/** Converts wall-clock date + HH:mm in the practice timezone to a UTC ISO string. */
export function wallTimeToUtcIso(
  isoDate: string,
  timeSlot: string,
  timeZone: string = PRACTICE_TIMEZONE,
): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [hour, minute] = timeSlot.split(':').map(Number);

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(utcMs));

    const value = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value ?? '0');

    const tzYear = value('year');
    const tzMonth = value('month');
    const tzDay = value('day');
    const tzHour = value('hour');
    const tzMinute = value('minute');

    if (
      tzYear === year &&
      tzMonth === month &&
      tzDay === day &&
      tzHour === hour &&
      tzMinute === minute
    ) {
      return new Date(utcMs).toISOString();
    }

    const desiredMinutes = hour * 60 + minute;
    let actualMinutes = tzHour * 60 + tzMinute;
    let dayDelta = day - tzDay;
    if (dayDelta > 15) dayDelta -= 31;
    if (dayDelta < -15) dayDelta += 31;

    utcMs += (desiredMinutes - actualMinutes + dayDelta * 24 * 60) * 60_000;
  }

  return new Date(utcMs).toISOString();
}

/** Build ISO timestamps from a calendar date + HH:mm slot in Europe/Berlin. */
export function buildSlotTimes(
  date: string,
  timeSlot: string,
  durationMinutes: number,
): { start_time: string; end_time: string } {
  const start_time = wallTimeToUtcIso(date, timeSlot);
  const end_time = new Date(
    new Date(start_time).getTime() + durationMinutes * 60_000,
  ).toISOString();

  return { start_time, end_time };
}

export function appointmentDurationMinutes(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(1, Math.round((end - start) / 60_000));
}

export function isFutureSlot(startIso: string, now = new Date()): boolean {
  return new Date(startIso).getTime() > now.getTime();
}

/** Matches create_public_booking lead-time rule (>= 30 minutes from now). */
export function isWithinBookingLeadTime(startIso: string, now = new Date()): boolean {
  return new Date(startIso).getTime() >= now.getTime() + 30 * 60_000;
}
