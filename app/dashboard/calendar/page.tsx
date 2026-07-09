import { redirect } from 'next/navigation';
import { parseMonthParam } from '@/lib/date-ranges';
import {
  isScheduleView,
  parseDateParam,
  scheduleFetchRange,
  type ScheduleView,
} from '@/lib/schedule-view';
import { getCurrentPracticeContext } from '@/lib/server/current-practice';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { ScheduleCalendar } from '@/components/dashboard/schedule-calendar';

interface CalendarPageProps {
  searchParams: Promise<{ view?: string; date?: string; month?: string }>;
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
  const view: ScheduleView = isScheduleView(params.view) ? params.view : 'day';

  // Legacy ?month=YYYY-MM links from older bookmarks still open the right month.
  const legacyMonth = parseMonthParam(params.month);
  const anchor =
    parseDateParam(params.date) ??
    (legacyMonth ? new Date(legacyMonth.year, legacyMonth.month - 1, 1) : new Date());

  const range = scheduleFetchRange(view, anchor);

  const appointmentsResult = await supabase
    .from('appointments')
    .select('id, encrypted_payload, start_time, end_time, status, resource_id')
    .eq('practice_id', practice.id)
    .gte('start_time', range.startIso)
    .lt('start_time', range.endIso)
    .order('start_time');

  const appointments = appointmentsResult.data ?? [];

  return (
    <main className={`${uiClasses.pageContainer} max-w-6xl`}>
      <header className="mb-6 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Kalender
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{practice.name}</h1>
        <p className="text-muted-foreground">
          Terminkalender — Ende-zu-Ende entschlüsselt im Browser
        </p>
      </header>

      <section data-tour="calendar-overview">
        <ScheduleCalendar appointments={appointments} view={view} anchor={anchor} />
      </section>
    </main>
  );
}
