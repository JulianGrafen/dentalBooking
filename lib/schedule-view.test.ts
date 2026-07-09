import { describe, expect, it } from 'vitest';
import {
  assignEventLanes,
  eventColorForTreatment,
  isoWeekNumber,
  monthGridDays,
  parseDateParam,
  scheduleFetchRange,
  scheduleTitle,
  shiftAnchor,
  startOfWeek,
  weekDays,
} from '@/lib/schedule-view';

describe('parseDateParam', () => {
  it('parses valid yyyy-MM-dd values', () => {
    expect(parseDateParam('2026-07-08')).toEqual(new Date(2026, 6, 8));
  });

  it('rejects invalid values', () => {
    expect(parseDateParam(undefined)).toBeNull();
    expect(parseDateParam('08.07.2026')).toBeNull();
    expect(parseDateParam('2026-13-01')).toBeNull();
  });
});

describe('startOfWeek / weekDays', () => {
  it('returns Monday for any weekday', () => {
    expect(startOfWeek(new Date(2026, 6, 8))).toEqual(new Date(2026, 6, 6));
    expect(startOfWeek(new Date(2026, 6, 12))).toEqual(new Date(2026, 6, 6));
    expect(startOfWeek(new Date(2026, 6, 6))).toEqual(new Date(2026, 6, 6));
  });

  it('returns seven consecutive days starting Monday', () => {
    const days = weekDays(new Date(2026, 6, 8));
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual(new Date(2026, 6, 6));
    expect(days[6]).toEqual(new Date(2026, 6, 12));
  });
});

describe('monthGridDays', () => {
  it('covers the month in six Monday-based weeks', () => {
    const days = monthGridDays(new Date(2026, 6, 15));
    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(1);
    expect(days[0]).toEqual(new Date(2026, 5, 29));
  });
});

describe('shiftAnchor', () => {
  it('shifts by day, week and month', () => {
    const anchor = new Date(2026, 6, 8);
    expect(shiftAnchor(anchor, 'day', 1)).toEqual(new Date(2026, 6, 9));
    expect(shiftAnchor(anchor, 'week', -1)).toEqual(new Date(2026, 6, 1));
    expect(shiftAnchor(anchor, 'month', 1)).toEqual(new Date(2026, 7, 1));
  });
});

describe('isoWeekNumber', () => {
  it('matches known ISO week numbers', () => {
    expect(isoWeekNumber(new Date(2025, 2, 5))).toBe(10);
    expect(isoWeekNumber(new Date(2026, 0, 1))).toBe(1);
    expect(isoWeekNumber(new Date(2027, 0, 1))).toBe(53);
  });
});

describe('scheduleTitle', () => {
  it('includes weekday and KW for the day view', () => {
    expect(scheduleTitle('day', new Date(2025, 2, 5))).toBe('Mittwoch, 5. März 2025 (10. KW)');
  });

  it('renders a range with KW for the week view', () => {
    expect(scheduleTitle('week', new Date(2026, 6, 8))).toContain('KW');
    expect(scheduleTitle('week', new Date(2026, 6, 8))).toContain('–');
  });

  it('renders month and year for the month view', () => {
    expect(scheduleTitle('month', new Date(2026, 6, 8))).toBe('Juli 2026');
  });
});

describe('scheduleFetchRange', () => {
  it('covers the anchor day with padding', () => {
    const range = scheduleFetchRange('day', new Date(2026, 6, 8));
    expect(new Date(range.startIso) < new Date(2026, 6, 8)).toBe(true);
    expect(new Date(range.endIso) > new Date(2026, 6, 9)).toBe(true);
  });

  it('covers all month grid days', () => {
    const range = scheduleFetchRange('month', new Date(2026, 6, 8));
    expect(new Date(range.startIso) <= new Date(2026, 5, 29)).toBe(true);
    expect(new Date(range.endIso) >= new Date(2026, 7, 9)).toBe(true);
  });
});

describe('assignEventLanes', () => {
  it('keeps non-overlapping events in a single full-width lane', () => {
    const lanes = assignEventLanes([
      { startMs: 0, endMs: 10 },
      { startMs: 10, endMs: 20 },
    ]);

    expect(lanes).toEqual([
      { lane: 0, laneCount: 1 },
      { lane: 0, laneCount: 1 },
    ]);
  });

  it('splits overlapping events into side-by-side lanes', () => {
    const lanes = assignEventLanes([
      { startMs: 0, endMs: 30 },
      { startMs: 10, endMs: 20 },
      { startMs: 40, endMs: 50 },
    ]);

    expect(lanes[0]).toEqual({ lane: 0, laneCount: 2 });
    expect(lanes[1]).toEqual({ lane: 1, laneCount: 2 });
    expect(lanes[2]).toEqual({ lane: 0, laneCount: 1 });
  });
});

describe('eventColorForTreatment', () => {
  it('is deterministic per treatment name', () => {
    expect(eventColorForTreatment('Prophylaxe')).toEqual(eventColorForTreatment('Prophylaxe'));
  });
});
