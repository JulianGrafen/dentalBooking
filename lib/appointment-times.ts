/** Build ISO timestamps from a local calendar date + HH:mm slot. */
export function buildSlotTimes(
  date: string,
  timeSlot: string,
  durationMinutes: number,
): { start_time: string; end_time: string } {
  const startTime = new Date(`${date}T${timeSlot}:00`);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);
  return {
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
  };
}

export function appointmentDurationMinutes(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(1, Math.round((end - start) / 60_000));
}

export function isFutureSlot(startIso: string, now = new Date()): boolean {
  return new Date(startIso).getTime() > now.getTime();
}
