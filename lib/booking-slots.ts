import { buildSlotTimes, isWithinBookingLeadTime } from '@/lib/appointment-times';
import { getOpeningHoursForDate } from '@/lib/booking-hours';

export const QUARTER_HOUR_MINUTES = 15;

export interface BookedInterval {
  start_time: string;
  end_time: string;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatMinutesAsTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** All quarter-hour start times where the full treatment fits within opening hours. */
export function generateCandidateSlots(
  open: string,
  close: string,
  durationMinutes: number,
): string[] {
  const openMinutes = parseTimeToMinutes(open);
  const closeMinutes = parseTimeToMinutes(close);
  const slots: string[] = [];

  for (
    let start = openMinutes;
    start + durationMinutes <= closeMinutes;
    start += QUARTER_HOUR_MINUTES
  ) {
    slots.push(formatMinutesAsTime(start));
  }

  return slots;
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Free quarter-hour slots for a date, treatment duration and existing bookings. */
export function getAvailableBookingSlots(
  isoDate: string,
  durationMinutes: number,
  booked: BookedInterval[],
  now = new Date(),
): string[] {
  const opening = getOpeningHoursForDate(isoDate);
  if (!opening) return [];

  const candidates = generateCandidateSlots(opening.open, opening.close, durationMinutes);

  return candidates.filter((slot) => {
    const { start_time, end_time } = buildSlotTimes(isoDate, slot, durationMinutes);
    if (!isWithinBookingLeadTime(start_time, now)) return false;

    return !booked.some((booking) =>
      rangesOverlap(start_time, end_time, booking.start_time, booking.end_time),
    );
  });
}
