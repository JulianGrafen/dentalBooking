import { redirect } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import {
  formatMonthParam,
  monthRangeFor,
  parseMonthParam,
} from '@/lib/date-ranges';
import { getCurrentPracticeContext } from '@/lib/server/current-practice';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { AppointmentsCalendar } from '@/components/dashboard/appointments-calendar';
import { CalendarMonthNav } from '@/components/dashboard/calendar-month-nav';

interface CalendarPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <SupabaseNotConfigured />
      </main>
    );
  }

  const context = await getCurrentPracticeContext();
  if (!context) redirect('/login');
  const { supabase, practice } = context;

  const params = await searchParams;
  const now = new Date();
  const parsed = parseMonthParam(params.month);
  const year = parsed?.year ?? now.getFullYear();
  const month = parsed?.month ?? now.getMonth() + 1;
  const range = monthRangeFor(year, month);
  const monthDate = new Date(year, month - 1, 1);

  const appointmentsResult = await supabase
      .from('appointments')
      .select('id, encrypted_payload, start_time, end_time, status')
      .eq('practice_id', practice.id)
      .gte('start_time', range.startIso)
      .lt('start_time', range.endIso)
      .order('start_time');

  const appointments = appointmentsResult.data ?? [];

  return (
    <main className={`${uiClasses.pageContainer} max-w-6xl`}>
        <header className="mb-8 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Kalender
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {practice.name}
          </h1>
          <p className="text-muted-foreground">
            Monatsübersicht — Ende-zu-Ende entschlüsselt im Browser
          </p>
        </header>

        <section className={`${uiClasses.glassCard} p-6 sm:p-8`} data-tour="calendar-overview">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CalendarMonthNav year={year} month={month} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4 text-primary" />
              <span>
                {appointments.length} Termin(e) im {formatMonthParam(year, month)}
              </span>
            </div>
          </div>

          <AppointmentsCalendar appointments={appointments} month={monthDate} />
        </section>
      </main>
  );
}
