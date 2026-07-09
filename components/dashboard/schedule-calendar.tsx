'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Clock, Stethoscope, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  decryptAppointments,
  type DecryptedAppointment,
  type EncryptedAppointment,
} from '@/lib/appointment-decrypt';
import {
  filterAppointmentsByPatientName,
  normalizePatientSearchQuery,
} from '@/lib/appointment-search';
import {
  appointmentStatusBadgeVariant,
  appointmentStatusLabel,
} from '@/lib/appointment-status';
import { getOpeningHoursForDate } from '@/lib/booking-hours';
import { dateKey, isSameDay } from '@/lib/date-ranges';
import {
  assignEventLanes,
  eventColorForTreatment,
  formatDateParam,
  monthGridDays,
  SCHEDULE_DAY_END_HOUR,
  SCHEDULE_DAY_START_HOUR,
  SCHEDULE_VIEW_LABELS,
  scheduleTitle,
  shiftAnchor,
  weekDays,
  type ScheduleView,
} from '@/lib/schedule-view';
import { cn } from '@/lib/utils';
import { AppointmentManageActions } from '@/components/dashboard/appointment-manage-actions';
import { PatientSearchInput } from '@/components/dashboard/patient-search-input';

interface ScheduleCalendarProps {
  appointments: EncryptedAppointment[];
  view: ScheduleView;
  anchor: Date;
}

const HOUR_PX = 64;
const TIMELINE_MINUTES = (SCHEDULE_DAY_END_HOUR - SCHEDULE_DAY_START_HOUR) * 60;
const TIMELINE_HEIGHT = (TIMELINE_MINUTES / 60) * HOUR_PX;
const MIN_EVENT_PX = 30;

const HATCHED_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, transparent, transparent 5px, var(--border) 5px, var(--border) 6px)',
};

const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
});

const weekdayShortFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });

const dialogDateFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

interface ScheduleEvent {
  appointment: DecryptedAppointment;
  start: Date;
  end: Date;
}

function minutesIntoTimeline(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() - SCHEDULE_DAY_START_HOUR * 60;
}

function groupEventsByDay(events: ScheduleEvent[]): Map<string, ScheduleEvent[]> {
  const map = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    const key = dateKey(event.start);
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
  return map;
}

function hourLabels(): string[] {
  return Array.from(
    { length: SCHEDULE_DAY_END_HOUR - SCHEDULE_DAY_START_HOUR + 1 },
    (_, index) => `${String(SCHEDULE_DAY_START_HOUR + index).padStart(2, '0')}:00`,
  );
}

/** Hatched zones (in timeline minutes) outside the practice opening hours. */
function closedZones(day: Date): Array<{ topMinutes: number; heightMinutes: number }> {
  const opening = getOpeningHoursForDate(dateKey(day));
  if (!opening) return [{ topMinutes: 0, heightMinutes: TIMELINE_MINUTES }];

  const [openHour, openMinute] = opening.open.split(':').map(Number);
  const [closeHour, closeMinute] = opening.close.split(':').map(Number);
  const openAt = openHour * 60 + openMinute - SCHEDULE_DAY_START_HOUR * 60;
  const closeAt = closeHour * 60 + closeMinute - SCHEDULE_DAY_START_HOUR * 60;

  const zones: Array<{ topMinutes: number; heightMinutes: number }> = [];
  if (openAt > 0) zones.push({ topMinutes: 0, heightMinutes: openAt });
  if (closeAt < TIMELINE_MINUTES) {
    zones.push({ topMinutes: closeAt, heightMinutes: TIMELINE_MINUTES - closeAt });
  }
  return zones;
}

function TimeGutter() {
  return (
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
  );
}

function NowIndicator({ day }: { day: Date }) {
  const [now] = useState(() => new Date());
  if (!isSameDay(day, now)) return null;

  const minutes = minutesIntoTimeline(now);
  if (minutes < 0 || minutes > TIMELINE_MINUTES) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-20"
      style={{ top: (minutes / 60) * HOUR_PX }}
    >
      <div className="relative h-px bg-red-500">
        <span className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-red-500" />
      </div>
    </div>
  );
}

function EventBlock({
  event,
  lane,
  laneCount,
  onSelect,
}: {
  event: ScheduleEvent;
  lane: number;
  laneCount: number;
  onSelect: (appointment: DecryptedAppointment) => void;
}) {
  const { appointment } = event;
  const cancelled = appointment.status === 'cancelled';
  const color = eventColorForTreatment(appointment.treatment);

  const startMinutes = Math.max(0, minutesIntoTimeline(event.start));
  const endMinutes = Math.min(TIMELINE_MINUTES, minutesIntoTimeline(event.end));
  if (endMinutes <= 0 || startMinutes >= TIMELINE_MINUTES) return null;

  const top = (startMinutes / 60) * HOUR_PX;
  const height = Math.max(MIN_EVENT_PX, ((endMinutes - startMinutes) / 60) * HOUR_PX);
  const compact = height < 44;
  const widthPercent = 100 / laneCount;

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      className={cn(
        'absolute z-10 overflow-hidden rounded-md border px-2 py-1 text-left text-xs shadow-sm transition-colors',
        cancelled
          ? 'border-border bg-muted text-muted-foreground line-through opacity-70'
          : color.block,
      )}
      style={{
        top,
        height,
        left: `calc(${lane * widthPercent}% + 2px)`,
        width: `calc(${widthPercent}% - 4px)`,
      }}
    >
      <span className="flex items-start justify-between gap-1">
        <span className="truncate font-semibold">{appointment.patientName}</span>
        <span className="shrink-0 tabular-nums opacity-80">
          {timeFormatter.format(event.start)}
        </span>
      </span>
      {!compact && (
        <>
          <span className="block truncate">{appointment.treatment}</span>
          {appointment.status === 'pending' && (
            <span className="block truncate italic opacity-80">Anfrage</span>
          )}
        </>
      )}
    </button>
  );
}

function DayTimelineColumn({
  day,
  events,
  onSelect,
}: {
  day: Date;
  events: ScheduleEvent[];
  onSelect: (appointment: DecryptedAppointment) => void;
}) {
  const lanes = useMemo(
    () =>
      assignEventLanes(
        events.map((event) => ({
          startMs: event.start.getTime(),
          endMs: event.end.getTime(),
        })),
      ),
    [events],
  );

  return (
    <div
      className="relative min-w-0 flex-1 border-l border-border/60"
      style={{ height: TIMELINE_HEIGHT }}
    >
      {closedZones(day).map((zone) => (
        <div
          key={zone.topMinutes}
          aria-hidden
          className="absolute inset-x-0 opacity-60"
          style={{
            top: (zone.topMinutes / 60) * HOUR_PX,
            height: (zone.heightMinutes / 60) * HOUR_PX,
            ...HATCHED_STYLE,
          }}
        />
      ))}
      {hourLabels().map((label, index) => (
        <div
          key={label}
          aria-hidden
          className="absolute inset-x-0 border-t border-border/50"
          style={{ top: index * HOUR_PX }}
        />
      ))}
      <NowIndicator day={day} />
      {events.map((event, index) => (
        <EventBlock
          key={event.appointment.id}
          event={event}
          lane={lanes[index].lane}
          laneCount={lanes[index].laneCount}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function WeekHeader({ days, onSelectDay }: { days: Date[]; onSelectDay: (day: Date) => void }) {
  const today = new Date();

  return (
    <div className="flex border-b border-border/60">
      <div className="w-14 shrink-0" />
      {days.map((day) => (
        <button
          key={dateKey(day)}
          type="button"
          onClick={() => onSelectDay(day)}
          className="min-w-0 flex-1 border-l border-border/60 px-1 py-2 text-center transition-colors hover:bg-muted/60"
        >
          <span className="block text-xs text-muted-foreground">
            {weekdayShortFormatter.format(day)}
          </span>
          <span
            className={cn(
              'mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-medium',
              isSameDay(day, today) && 'bg-primary text-primary-foreground',
            )}
          >
            {day.getDate()}
          </span>
        </button>
      ))}
    </div>
  );
}

function MonthView({
  anchor,
  eventsByDay,
  onSelectDay,
  onSelect,
}: {
  anchor: Date;
  eventsByDay: Map<string, ScheduleEvent[]>;
  onSelectDay: (day: Date) => void;
  onSelect: (appointment: DecryptedAppointment) => void;
}) {
  const days = monthGridDays(anchor);
  const today = new Date();
  const MAX_CHIPS = 3;

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border/60">
        {days.slice(0, 7).map((day) => (
          <span
            key={dateKey(day)}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {weekdayShortFormatter.format(day)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day);
          const dayEvents = eventsByDay.get(key) ?? [];
          const outsideMonth = day.getMonth() !== anchor.getMonth();
          const closed = !getOpeningHoursForDate(key);

          return (
            <div
              key={key}
              className={cn(
                'min-h-24 border-b border-l border-border/40 p-1 first:border-l-0 sm:min-h-28',
                outsideMonth && 'bg-muted/30',
              )}
              style={closed && !outsideMonth ? HATCHED_STYLE : undefined}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-muted',
                  outsideMonth && 'text-muted-foreground/60',
                  isSameDay(day, today) && 'bg-primary text-primary-foreground hover:bg-primary',
                )}
              >
                {day.getDate()}
              </button>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, MAX_CHIPS).map((event) => {
                  const cancelled = event.appointment.status === 'cancelled';
                  const color = eventColorForTreatment(event.appointment.treatment);
                  return (
                    <button
                      key={event.appointment.id}
                      type="button"
                      onClick={() => onSelect(event.appointment)}
                      className={cn(
                        'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight transition-colors',
                        cancelled
                          ? 'bg-muted text-muted-foreground line-through'
                          : color.chip,
                      )}
                    >
                      <span className="shrink-0 tabular-nums opacity-80">
                        {timeFormatter.format(event.start)}
                      </span>
                      <span className="truncate font-medium">
                        {event.appointment.patientName}
                      </span>
                    </button>
                  );
                })}
                {dayEvents.length > MAX_CHIPS && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className="w-full truncate rounded px-1 text-left text-[11px] text-muted-foreground hover:bg-muted"
                  >
                    +{dayEvents.length - MAX_CHIPS} weitere
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentDetailDialog({
  appointment,
  onClose,
}: {
  appointment: DecryptedAppointment | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {appointment && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="size-4 text-primary" />
                {appointment.error ? (
                  <span className="text-destructive">{appointment.error}</span>
                ) : (
                  appointment.patientName
                )}
              </DialogTitle>
              <DialogDescription className="capitalize">
                {dialogDateFormatter.format(new Date(appointment.start_time))}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 tabular-nums text-muted-foreground">
                <Clock className="size-3.5" />
                {timeFormatter.format(new Date(appointment.start_time))} –{' '}
                {timeFormatter.format(new Date(appointment.end_time))} Uhr
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Stethoscope className="size-3.5" />
                {appointment.treatment}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant={appointmentStatusBadgeVariant(appointment.status)}>
                  {appointmentStatusLabel(appointment.status)}
                </Badge>
                {!appointment.error && (
                  <span className="text-xs text-muted-foreground">
                    {appointment.insuranceLabel}
                  </span>
                )}
              </div>
            </div>
            <AppointmentManageActions appointment={appointment} compact />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ScheduleCalendar({ appointments, view, anchor }: ScheduleCalendarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] =
    useState<DecryptedAppointment | null>(null);

  const decrypted = useMemo(() => decryptAppointments(appointments), [appointments]);
  const filtered = useMemo(
    () => filterAppointmentsByPatientName(decrypted, searchQuery),
    [decrypted, searchQuery],
  );
  const searchActive = normalizePatientSearchQuery(searchQuery).length > 0;

  const events = useMemo<ScheduleEvent[]>(
    () =>
      filtered.map((appointment) => ({
        appointment,
        start: new Date(appointment.start_time),
        end: new Date(appointment.end_time),
      })),
    [filtered],
  );

  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);

  function navigate(nextView: ScheduleView, nextAnchor: Date) {
    router.push(
      `/dashboard/calendar?view=${nextView}&date=${formatDateParam(nextAnchor)}`,
    );
  }

  const days = view === 'week' ? weekDays(anchor) : [anchor];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            className="rounded-full"
            aria-label="Zurück"
            onClick={() => navigate(view, shiftAnchor(anchor, view, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => navigate(view, new Date())}
          >
            Heute
          </Button>
          <Button
            type="button"
            size="icon"
            className="rounded-full"
            aria-label="Weiter"
            onClick={() => navigate(view, shiftAnchor(anchor, view, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5 shadow-sm">
          {(Object.keys(SCHEDULE_VIEW_LABELS) as ScheduleView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => navigate(option, anchor)}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors',
                option === view
                  ? 'bg-background font-medium shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option === view && <Check className="size-3.5" />}
              {SCHEDULE_VIEW_LABELS[option]}
            </button>
          ))}
        </div>

        <h2 className="min-w-40 flex-1 text-center text-base font-semibold capitalize sm:text-lg">
          {scheduleTitle(view, anchor)}
        </h2>

        <PatientSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:w-64"
        />
      </div>

      {searchActive && (
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0
            ? `Keine Termine für „${searchQuery.trim()}“ im angezeigten Zeitraum.`
            : `${filtered.length} Treffer für „${searchQuery.trim()}“`}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        {view === 'month' ? (
          <MonthView
            anchor={anchor}
            eventsByDay={eventsByDay}
            onSelectDay={(day) => navigate('day', day)}
            onSelect={setSelectedAppointment}
          />
        ) : (
          <>
            {view === 'week' && (
              <WeekHeader days={days} onSelectDay={(day) => navigate('day', day)} />
            )}
            <div className="overflow-x-auto">
              <div className="flex min-w-[36rem] py-2 pr-2">
                <TimeGutter />
                {days.map((day) => (
                  <DayTimelineColumn
                    key={dateKey(day)}
                    day={day}
                    events={eventsByDay.get(dateKey(day)) ?? []}
                    onSelect={setSelectedAppointment}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <AppointmentDetailDialog
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
      />
    </div>
  );
}
