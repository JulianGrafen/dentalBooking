import { describe, expect, it } from 'vitest';
import {
  findBookedIntervalAtStart,
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
  it('marks only exact start times as waitlistable', () => {
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
    expect(slots.map((slot) => slot.time)).not.toContain('08:45');
  });

  it('does not mark earlier slots before an appointment as waitlist', () => {
    const booked = [
      {
        start_time: '2026-07-10T12:15:00.000Z',
        end_time: '2026-07-10T12:45:00.000Z',
      },
    ];

    const slots = getBookingSlotOptions(
      '2026-07-10',
      30,
      booked,
      new Date('2026-07-09T12:00:00.000Z'),
    );

    expect(slots).toEqual(
      expect.arrayContaining([
        { time: '13:45', status: 'available' },
        { time: '14:15', status: 'waitlist' },
      ]),
    );
    expect(slots.map((slot) => slot.time)).not.toContain('14:00');
  });

  it('detects booked slots when Postgres returns a different timestamp format', () => {
    const booked = [
      {
        start_time: '2026-07-10 12:15:00+00',
        end_time: '2026-07-10 12:45:00+00',
      },
    ];

    const slots = getBookingSlotOptions(
      '2026-07-10',
      30,
      booked,
      new Date('2026-07-09T12:00:00.000Z'),
    );

    expect(slots).toEqual(expect.arrayContaining([{ time: '14:15', status: 'waitlist' }]));
    expect(slots.map((slot) => slot.time)).not.toContain('14:00');
    expect(slots.some((slot) => slot.time === '14:15' && slot.status === 'available')).toBe(
      false,
    );
  });
});

describe('findBookedIntervalAtStart', () => {
  it('finds a booked interval across Postgres and ISO timestamp formats', () => {
    const booked = [
      {
        start_time: '2026-07-10 12:15:00+00',
        end_time: '2026-07-10 12:45:00+00',
      },
    ];

    expect(findBookedIntervalAtStart('2026-07-10T12:15:00.000Z', booked)).toEqual(booked[0]);
  });
});
