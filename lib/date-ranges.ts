/** Pure date-range helpers for dashboard queries (server local time). */

export interface DateRange {
  startIso: string;
  endIso: string;
}

export function todayRange(now: Date = new Date()): DateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function currentMonthRange(now: Date = new Date()): DateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function monthRangeFor(year: number, month: number): DateRange {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function weekRange(now: Date = new Date()): DateRange {
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Local calendar day key (yyyy-MM-dd). */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseMonthParam(
  value: string | undefined,
): { year: number; month: number } | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function formatMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
