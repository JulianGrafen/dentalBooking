import { describe, expect, it } from 'vitest';
import {
  generateCandidateSlots,
  getAvailableBookingSlots,
  getBookingSlotOptions,
} from '@/lib/booking-slots';
import { getOpeningHoursForDate } from '@/lib/booking-hours';

describe('generateCandidateSlots', () => {
  it('returns quarter-hour slots within opening hours', () => {
    expect(generateCandidateSlots('09:00', '10:00', 30)).toEqual([
      '09:00',
      '09:15',
      '09:30',
    ]);
  });

  it('excludes slots where treatment would run past closing', () => {
    expect(generateCandidateSlots('09:00', '17:00', 60).at(-1)).toBe('16:00');
    expect(generateCandidateSlots('09:00', '17:00', 60)).not.toContain('16:15');
  });
});

describe('getOpeningHoursForDate', () => {
  it('returns null on Sundays', () => {
    expect(getOpeningHoursForDate('2026-07-12')).toBeNull();
  });

  it('returns shorter hours on Saturdays', () => {
    expect(getOpeningHoursForDate('2026-07-11')).toEqual({ open: '09:00', close: '13:00' });
  });
});

describe('getAvailableBookingSlots', () => {
  it('removes booked and too-soon slots', () => {
    const booked = [
      {
        start_time: '2026-07-13T09:00:00.000Z',
        end_time: '2026-07-13T09:30:00.000Z',
      },
    ];

    const slots = getAvailableBookingSlots(
      '2026-07-13',
      30,
      booked,
      new Date('2026-07-13T07:00:00.000Z'),
    );

    expect(slots).toContain('09:30');
    expect(slots).not.toContain('09:00');
  });
});

describe('getBookingSlotOptions', () => {
  it('marks occupied future slots as waitlistable', () => {
    const booked = [
      {
        start_time: '2026-07-13T07:00:00.000Z',
        end_time: '2026-07-13T07:30:00.000Z',
      },
    ];

    const slots = getBookingSlotOptions(
      '2026-07-13',
      30,
      booked,
      new Date('2026-07-12T12:00:00.000Z'),
    );

    expect(slots).toEqual(
      expect.arrayContaining([
        { time: '09:00', status: 'waitlist' },
        { time: '09:30', status: 'available' },
      ]),
    );
  });
});
