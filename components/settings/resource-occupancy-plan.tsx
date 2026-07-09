'use client';

import { useMemo } from 'react';
import { DoorOpen } from 'lucide-react';
import {
  decryptAppointments,
  type DecryptedAppointment,
  type EncryptedAppointment,
} from '@/lib/appointment-decrypt';
import {
  SCHEDULE_DAY_END_HOUR,
  SCHEDULE_DAY_START_HOUR,
} from '@/lib/schedule-view';
import { cn } from '@/lib/utils';
import type { PracticeResource } from '@/types/database';

interface ResourceOccupancyPlanProps {
  rooms: PracticeResource[];
  appointments: EncryptedAppointment[];
  date: Date;
}

const HOUR_PX = 56;
const TIMELINE_MINUTES = (SCHEDULE_DAY_END_HOUR - SCHEDULE_DAY_START_HOUR) * 60;
const TIMELINE_HEIGHT = (TIMELINE_MINUTES / 60) * HOUR_PX;
const MIN_EVENT_HEIGHT = 32;

const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function hourLabels(): string[] {
  return Array.from(
    { length: SCHEDULE_DAY_END_HOUR - SCHEDULE_DAY_START_HOUR + 1 },
    (_, index) => `${String(SCHEDULE_DAY_START_HOUR + index).padStart(2, '0')}:00`,
  );
}

function minutesIntoTimeline(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() - SCHEDULE_DAY_START_HOUR * 60;
}

function groupByResource(
  appointments: DecryptedAppointment[],
): Map<string, DecryptedAppointment[]> {
  const map = new Map<string, DecryptedAppointment[]>();
  for (const appointment of appointments) {
    if (!appointment.resource_id || appointment.status !== 'booked') continue;
    const list = map.get(appointment.resource_id) ?? [];
    list.push(appointment);
    map.set(appointment.resource_id, list);
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  return map;
}

function RoomAppointmentBlock({ appointment }: { appointment: DecryptedAppointment }) {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  const startMinutes = Math.max(0, minutesIntoTimeline(start));
  const endMinutes = Math.min(TIMELINE_MINUTES, minutesIntoTimeline(end));

  if (endMinutes <= 0 || startMinutes >= TIMELINE_MINUTES) return null;

  const top = (startMinutes / 60) * HOUR_PX;
  const height = Math.max(MIN_EVENT_HEIGHT, ((endMinutes - startMinutes) / 60) * HOUR_PX);

  return (
    <div
      className="absolute inset-x-2 overflow-hidden rounded-md border border-cyan-200 bg-cyan-100 px-2 py-1 text-xs text-cyan-950 shadow-sm"
      style={{ top, height }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate font-semibold">{appointment.patientName}</span>
        <span className="shrink-0 tabular-nums opacity-75">
          {timeFormatter.format(start)}
        </span>
      </div>
      {height >= 44 && (
        <p className="truncate opacity-85">{appointment.treatment}</p>
      )}
    </div>
  );
}

export function ResourceOccupancyPlan({
  rooms,
  appointments,
  date,
}: ResourceOccupancyPlanProps) {
  const decrypted = useMemo(() => decryptAppointments(appointments), [appointments]);
  const appointmentsByResource = useMemo(() => groupByResource(decrypted), [decrypted]);
  const activeRooms = rooms.filter((room) => room.is_active);

  return (
    <section className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Belegungsplan Räume
          </p>
          <h2 className="text-lg font-semibold capitalize">{dateFormatter.format(date)}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {activeRooms.length} aktive Räume
        </p>
      </header>

      {activeRooms.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          Noch keine aktiven Räume angelegt. Legen Sie zuerst Ressourcen vom Typ „Raum“
          an.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[42rem]">
            <div className="relative w-14 shrink-0" style={{ height: TIMELINE_HEIGHT }}>
              {hourLabels().map((label, index) => (
                <span
                  key={label}
                  className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground"
                  style={{ top: index * HOUR_PX }}
                >
                  {label}
                </span>
              ))}
            </div>

            {activeRooms.map((room, index) => {
              const roomAppointments = appointmentsByResource.get(room.id) ?? [];
              return (
                <div
                  key={room.id}
                  className={cn(
                    'min-w-52 flex-1 border-l border-border/60',
                    index === activeRooms.length - 1 && 'border-r border-border/60',
                  )}
                >
                  <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                    <DoorOpen className="size-4 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{room.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {roomAppointments.length} Termin(e)
                      </p>
                    </div>
                  </div>
                  <div className="relative" style={{ height: TIMELINE_HEIGHT }}>
                    {hourLabels().map((label, hourIndex) => (
                      <div
                        key={label}
                        aria-hidden
                        className="absolute inset-x-0 border-t border-border/40"
                        style={{ top: hourIndex * HOUR_PX }}
                      />
                    ))}
                    {roomAppointments.map((appointment) => (
                      <RoomAppointmentBlock key={appointment.id} appointment={appointment} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
