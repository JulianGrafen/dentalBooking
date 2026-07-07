'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { de } from 'react-day-picker/locale';
import type { DayButton } from 'react-day-picker';
import { CalendarDays, Clock, Stethoscope, User } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  decryptAppointments,
  type DecryptedAppointment,
  type EncryptedAppointment,
} from '@/lib/appointment-decrypt';
import { filterAppointmentsByPatientName, normalizePatientSearchQuery } from '@/lib/appointment-search';
import { dateKey, formatMonthParam, isSameDay, startOfDay } from '@/lib/date-ranges';
import {
  appointmentStatusBadgeVariant,
  appointmentStatusLabel,
  isActiveAppointmentStatus,
} from '@/lib/appointment-status';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/dashboard/empty-state';
import { AppointmentManageActions } from '@/components/dashboard/appointment-manage-actions';
import { PatientSearchInput } from '@/components/dashboard/patient-search-input';

interface AppointmentsCalendarProps {
  appointments: EncryptedAppointment[];
  month: Date;
}

const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
});

const dayFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function groupByDay(items: DecryptedAppointment[]): Map<string, DecryptedAppointment[]> {
  const map = new Map<string, DecryptedAppointment[]>();
  for (const item of items) {
    const key = dateKey(new Date(item.start_time));
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }
  return map;
}

function AppointmentDayButton({
  dayAppointments,
  ...props
}: React.ComponentProps<typeof DayButton> & {
  dayAppointments: Map<string, DecryptedAppointment[]>;
}) {
  const count = dayAppointments.get(dateKey(props.day.date))?.length ?? 0;
  const activeCount =
    dayAppointments.get(dateKey(props.day.date))?.filter((a) => isActiveAppointmentStatus(a.status))
      .length ?? 0;
  const pendingCount =
    dayAppointments.get(dateKey(props.day.date))?.filter((a) => a.status === 'pending').length ?? 0;
  const bookedCount = activeCount - pendingCount;
  const hasCancelled = count > activeCount;

  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={props.day.date.toLocaleDateString('de-DE')}
      data-selected-single={
        props.modifiers.selected &&
        !props.modifiers.range_start &&
        !props.modifiers.range_end &&
        !props.modifiers.range_middle
      }
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'relative flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-0.5 border-0 font-normal',
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground',
        props.modifiers.today && !props.modifiers.selected && 'bg-primary/8 font-semibold text-primary',
      )}
      onClick={props.onClick}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onKeyDown={props.onKeyDown}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      disabled={props.disabled}
      aria-label={props['aria-label']}
      tabIndex={props.tabIndex}
    >
      <span>{props.day.date.getDate()}</span>
      {count > 0 && (
        <span className="flex items-center gap-0.5">
          {bookedCount > 0 && (
            <span className="size-1.5 rounded-full bg-primary data-[selected-single=true]:bg-primary-foreground" />
          )}
          {pendingCount > 0 && (
            <span className="size-1.5 rounded-full bg-amber-500 data-[selected-single=true]:bg-primary-foreground" />
          )}
          {hasCancelled && <span className="size-1.5 rounded-full bg-destructive/70" />}
          {count > 1 && (
            <span className="text-[10px] font-medium tabular-nums opacity-80">{count}</span>
          )}
        </span>
      )}
    </Button>
  );
}

function AppointmentCard({
  appointment,
  showDate = false,
}: {
  appointment: DecryptedAppointment;
  showDate?: boolean;
}) {
  const cancelled = appointment.status === 'cancelled';
  const pending = appointment.status === 'pending';

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card/90 p-4 shadow-sm transition-shadow hover:shadow-md',
        cancelled ? 'border-destructive/25 opacity-75' : pending ? 'border-amber-500/30' : 'border-border/60',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          cancelled ? 'bg-destructive/60' : pending ? 'bg-amber-500' : 'bg-primary',
        )}
      />
      <div className="flex flex-wrap items-start justify-between gap-2 pl-2">
        <div className="space-y-1">
          {showDate && (
            <p className="flex items-center gap-1.5 text-sm font-medium capitalize text-foreground">
              <CalendarDays className="size-3.5 text-primary" />
              {dayFormatter.format(new Date(appointment.start_time))}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-sm font-medium tabular-nums text-muted-foreground">
            <Clock className="size-3.5" />
            {timeFormatter.format(new Date(appointment.start_time))} –{' '}
            {timeFormatter.format(new Date(appointment.end_time))}
          </p>
          <p className="flex items-center gap-1.5 text-base font-semibold">
            <User className="size-4 text-primary" />
            {appointment.error ? (
              <span className="text-destructive">{appointment.error}</span>
            ) : (
              appointment.patientName
            )}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Stethoscope className="size-3.5" />
            {appointment.treatment}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant={appointmentStatusBadgeVariant(appointment.status)}>
            {appointmentStatusLabel(appointment.status)}
          </Badge>
          {!appointment.error && (
            <span className="text-xs text-muted-foreground">{appointment.insuranceLabel}</span>
          )}
        </div>
      </div>
      <AppointmentManageActions appointment={appointment} />
    </article>
  );
}

export function AppointmentsCalendar({ appointments, month }: AppointmentsCalendarProps) {
  const router = useRouter();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear()) {
      return today;
    }
    return startOfDay(month);
  });

  useEffect(() => {
    setSelectedDate((current) => {
      const inDisplayedMonth =
        current.getMonth() === month.getMonth() &&
        current.getFullYear() === month.getFullYear();

      if (inDisplayedMonth) return current;

      if (month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear()) {
        return today;
      }
      return startOfDay(month);
    });
  }, [month, today]);

  function handleMonthChange(nextMonth: Date) {
    router.push(
      `/dashboard/calendar?month=${formatMonthParam(nextMonth.getFullYear(), nextMonth.getMonth() + 1)}`,
    );
  }

  const decrypted = useMemo(() => decryptAppointments(appointments), [appointments]);
  const searchActive = normalizePatientSearchQuery(searchQuery).length > 0;

  const filtered = useMemo(
    () => filterAppointmentsByPatientName(decrypted, searchQuery),
    [decrypted, searchQuery],
  );

  const byDay = useMemo(() => groupByDay(filtered), [filtered]);

  useEffect(() => {
    if (!searchActive || filtered.length === 0) return;

    const firstMatchDay = startOfDay(new Date(filtered[0]!.start_time));
    setSelectedDate((current) => {
      const currentKey = dateKey(current);
      const hasMatchOnSelectedDay = filtered.some(
        (appointment) => dateKey(new Date(appointment.start_time)) === currentKey,
      );
      return hasMatchOnSelectedDay ? current : firstMatchDay;
    });
  }, [filtered, searchActive]);

  const daysWithAppointments = useMemo(
    () =>
      Array.from(byDay.entries())
        .filter(([, items]) => items.some((item) => isActiveAppointmentStatus(item.status)))
        .map(([key]) => {
          const [y, m, d] = key.split('-').map(Number);
          return new Date(y, m - 1, d);
        }),
    [byDay],
  );

  const daysWithSearchMatches = useMemo(
    () =>
      searchActive
        ? Array.from(
            new Set(filtered.map((appointment) => dateKey(new Date(appointment.start_time)))),
          ).map((key) => {
            const [y, m, d] = key.split('-').map(Number);
            return new Date(y, m - 1, d);
          })
        : [],
    [filtered, searchActive],
  );

  const selectedKey = dateKey(selectedDate);
  const selectedDayAppointments = byDay.get(selectedKey) ?? [];

  const upcoming = useMemo(
    () =>
      filtered
        .filter((a) => isActiveAppointmentStatus(a.status) && new Date(a.start_time) >= today)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [filtered, today],
  );

  const stats = useMemo(() => {
    const todayKey = dateKey(today);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    for (const item of decrypted) {
      if (!isActiveAppointmentStatus(item.status)) continue;
      const start = new Date(item.start_time);
      const key = dateKey(start);
      if (key === todayKey) todayCount++;
      if (start >= weekStart && start < weekEnd) weekCount++;
      if (start.getMonth() === month.getMonth() && start.getFullYear() === month.getFullYear()) {
        monthCount++;
      }
    }

    return { todayCount, weekCount, monthCount };
  }, [decrypted, month, today]);

  return (
    <div className="space-y-8">
      <PatientSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        className="max-w-md"
      />

      {searchActive && (
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0
            ? `Keine Termine für „${searchQuery.trim()}“ in diesem Monat.`
            : `${filtered.length} Treffer für „${searchQuery.trim()}“`}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Heute', value: stats.todayCount },
          { label: 'Diese Woche', value: stats.weekCount },
          { label: 'Dieser Monat', value: stats.monthCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <section className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm">
          <Calendar
            mode="single"
            locale={de}
            month={month}
            onMonthChange={handleMonthChange}
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(startOfDay(date))}
            modifiers={{
              hasAppointments: daysWithAppointments,
              searchMatch: daysWithSearchMatches,
            }}
            modifiersClassNames={{
              hasAppointments: 'font-semibold',
              searchMatch: 'ring-2 ring-primary/40 ring-offset-1',
            }}
            className="mx-auto w-full [--cell-size:2.75rem]"
            components={{
              DayButton: (props) => (
                <AppointmentDayButton {...props} dayAppointments={byDay} />
              ),
            }}
          />
          <p className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              Bestätigt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              Anfrage
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-destructive/70" />
              Storniert
            </span>
          </p>
        </section>

        <section className="space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Tagesübersicht
              </p>
              <h2 className="text-xl font-semibold capitalize">
                {dayFormatter.format(selectedDate)}
              </h2>
            </div>
            {!isSameDay(selectedDate, today) && (
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)}>
                Heute
              </Button>
            )}
          </header>

          {selectedDayAppointments.length > 0 ? (
            <div className="space-y-3">
              {selectedDayAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={searchActive ? 'Keine Treffer an diesem Tag' : 'Keine Termine an diesem Tag'}
              description={
                searchActive
                  ? 'Wählen Sie einen markierten Tag im Kalender oder passen Sie die Suche an.'
                  : 'Wählen Sie einen anderen Tag im Kalender oder teilen Sie Ihren Buchungslink.'
              }
            />
          )}
        </section>
      </div>

      <section className="space-y-4">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {searchActive ? 'Suchergebnisse' : 'Kommende Termine'}
          </p>
          <h2 className="text-xl font-semibold">
            {searchActive ? 'Gefundene Termine' : 'Alle anstehenden Termine'}
          </h2>
        </header>

        {upcoming.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} showDate />
            ))}
          </div>
        ) : (
          <EmptyState
            title={searchActive ? 'Keine Treffer' : 'Keine anstehenden Termine'}
            description={
              searchActive
                ? 'Versuchen Sie einen anderen Namen oder wechseln Sie den Monat.'
                : 'Sobald Patienten online buchen, erscheinen die Termine hier und im Kalender.'
            }
          />
        )}
      </section>
    </div>
  );
}
