import { dateKey } from '@/lib/date-ranges';

/** Pure helpers for the day/week/month schedule calendar. */

export type ScheduleView = 'day' | 'week' | 'month';

export const SCHEDULE_VIEW_LABELS: Record<ScheduleView, string> = {
  day: 'Tag',
  week: 'Woche',
  month: 'Monat',
};

/** Displayed time window of the day/week timeline. */
export const SCHEDULE_DAY_START_HOUR = 8;
export const SCHEDULE_DAY_END_HOUR = 18;

export function isScheduleView(value: string | undefined | null): value is ScheduleView {
  return value === 'day' || value === 'week' || value === 'month';
}

export function parseDateParam(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
}

export const formatDateParam = dateKey;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Monday of the week containing the given date. */
export function startOfWeek(date: Date): Date {
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

export function weekDays(date: Date): Date[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/** 6 full weeks (Mon–Sun) covering the month of the anchor date. */
export function monthGridDays(anchor: Date): Date[] {
  const gridStart = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function shiftAnchor(anchor: Date, view: ScheduleView, delta: number): Date {
  if (view === 'day') return addDays(anchor, delta);
  if (view === 'week') return addDays(anchor, delta * 7);
  return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
}

export function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / WEEK_MS);
}

const dayTitleFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const rangeDayFormatter = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'short',
});

const rangeDayYearFormatter = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const monthTitleFormatter = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric',
});

/** Toolbar title, e.g. "Mittwoch, 5. März 2025 (10. KW)". */
export function scheduleTitle(view: ScheduleView, anchor: Date): string {
  if (view === 'day') {
    return `${dayTitleFormatter.format(anchor)} (${isoWeekNumber(anchor)}. KW)`;
  }

  if (view === 'week') {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    const startLabel =
      start.getFullYear() === end.getFullYear()
        ? rangeDayFormatter.format(start)
        : rangeDayYearFormatter.format(start);
    return `${startLabel} – ${rangeDayYearFormatter.format(end)} (${isoWeekNumber(start)}. KW)`;
  }

  return monthTitleFormatter.format(anchor);
}

/** Query range for the appointments of a view, padded to cover timezone drift. */
export function scheduleFetchRange(
  view: ScheduleView,
  anchor: Date,
): { startIso: string; endIso: string } {
  if (view === 'day') {
    const start = addDays(anchor, -1);
    return { startIso: start.toISOString(), endIso: addDays(anchor, 2).toISOString() };
  }

  if (view === 'week') {
    const monday = startOfWeek(anchor);
    return {
      startIso: addDays(monday, -1).toISOString(),
      endIso: addDays(monday, 8).toISOString(),
    };
  }

  const grid = monthGridDays(anchor);
  return {
    startIso: addDays(grid[0], -1).toISOString(),
    endIso: addDays(grid[grid.length - 1], 2).toISOString(),
  };
}

export interface ScheduleLane {
  lane: number;
  laneCount: number;
}

/**
 * Assigns overlapping events to side-by-side lanes (like Google Calendar).
 * Events in one overlap cluster share the column width equally.
 */
export function assignEventLanes(
  events: ReadonlyArray<{ startMs: number; endMs: number }>,
): ScheduleLane[] {
  const order = events
    .map((_, index) => index)
    .sort(
      (a, b) => events[a].startMs - events[b].startMs || events[a].endMs - events[b].endMs,
    );

  const result: ScheduleLane[] = events.map(() => ({ lane: 0, laneCount: 1 }));
  let laneEnds: number[] = [];
  let cluster: number[] = [];

  function finalizeCluster() {
    for (const index of cluster) {
      result[index].laneCount = laneEnds.length;
    }
    cluster = [];
    laneEnds = [];
  }

  for (const index of order) {
    const event = events[index];

    if (laneEnds.length > 0 && laneEnds.every((end) => end <= event.startMs)) {
      finalizeCluster();
    }

    const freeLane = laneEnds.findIndex((end) => end <= event.startMs);
    if (freeLane === -1) {
      result[index].lane = laneEnds.length;
      laneEnds.push(event.endMs);
    } else {
      result[index].lane = freeLane;
      laneEnds[freeLane] = event.endMs;
    }
    cluster.push(index);
  }

  if (cluster.length > 0) finalizeCluster();

  return result;
}

export interface ScheduleEventColor {
  /** Timeline block classes (background, border, text). */
  block: string;
  /** Compact month-view chip classes. */
  chip: string;
}

const EVENT_COLORS: ScheduleEventColor[] = [
  {
    block: 'border-pink-200 bg-pink-100 text-pink-950 hover:bg-pink-200/80',
    chip: 'bg-pink-100 text-pink-900 hover:bg-pink-200/80',
  },
  {
    block: 'border-cyan-200 bg-cyan-100 text-cyan-950 hover:bg-cyan-200/80',
    chip: 'bg-cyan-100 text-cyan-900 hover:bg-cyan-200/80',
  },
  {
    block: 'border-purple-200 bg-purple-100 text-purple-950 hover:bg-purple-200/80',
    chip: 'bg-purple-100 text-purple-900 hover:bg-purple-200/80',
  },
  {
    block: 'border-amber-200 bg-amber-100 text-amber-950 hover:bg-amber-200/80',
    chip: 'bg-amber-100 text-amber-900 hover:bg-amber-200/80',
  },
  {
    block: 'border-emerald-200 bg-emerald-100 text-emerald-950 hover:bg-emerald-200/80',
    chip: 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200/80',
  },
  {
    block: 'border-sky-200 bg-sky-100 text-sky-950 hover:bg-sky-200/80',
    chip: 'bg-sky-100 text-sky-900 hover:bg-sky-200/80',
  },
];

/** Deterministic pastel color per treatment name. */
export function eventColorForTreatment(treatment: string): ScheduleEventColor {
  let hash = 0;
  for (const char of treatment) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return EVENT_COLORS[hash % EVENT_COLORS.length];
}
