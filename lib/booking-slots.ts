import {
  buildSlotTimes,
  isSameInstant,
  isWithinBookingLeadTime,
  rangesOverlapInstant,
} from '@/lib/appointment-times';
import { getOpeningHoursForDate } from '@/lib/booking-hours';

export const QUARTER_HOUR_MINUTES = 15;

export interface BookedInterval {
  start_time: string;
  end_time: string;
}

export interface BookingSlotOption {
  time: string;
  status: 'available' | 'waitlist';
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

/** True when an existing booking starts at the same instant as the candidate slot. */
function hasExactBookedStart(candidateStart: string, booked: BookedInterval[]): boolean {
  return booked.some((booking) => isSameInstant(booking.start_time, candidateStart));
}

/** Returns the booked interval that starts at the same instant as the candidate slot. */
export function findBookedIntervalAtStart(
  candidateStart: string,
  booked: BookedInterval[],
): BookedInterval | undefined {
  return booked.find((booking) => isSameInstant(booking.start_time, candidateStart));
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
      rangesOverlapInstant(start_time, end_time, booking.start_time, booking.end_time),
    );
  });
}

/** All bookable start times for a day, including occupied slots that can join the waitlist. */
export function getBookingSlotOptions(
  isoDate: string,
  durationMinutes: number,
  booked: BookedInterval[],
  now = new Date(),
): BookingSlotOption[] {
  const opening = getOpeningHoursForDate(isoDate);
  if (!opening) return [];

  const candidates = generateCandidateSlots(opening.open, opening.close, durationMinutes);

  return candidates.flatMap((slot): BookingSlotOption[] => {
    const { start_time, end_time } = buildSlotTimes(isoDate, slot, durationMinutes);
    if (!isWithinBookingLeadTime(start_time, now)) return [];

    if (hasExactBookedStart(start_time, booked)) {
      return [{ time: slot, status: 'waitlist' }];
    }

    const overlapsExistingBooking = booked.some((booking) =>
      rangesOverlapInstant(start_time, end_time, booking.start_time, booking.end_time),
    );

    // Partial overlap: treatment would run into an existing appointment — hide slot.
    if (overlapsExistingBooking) return [];

    return [{ time: slot, status: 'available' }];
  });
}
