import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { currentMonthRange, todayRange } from '@/lib/date-ranges';
import { getBookingUrl } from '@/lib/site';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { AppointmentsTable } from '@/components/dashboard/appointments-table';
import { BookingLinkCard } from '@/components/dashboard/booking-link-card';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * Practice dashboard (RSC). All queries run as the logged-in practice
 * through the cookie-based client — RLS scopes every row to the tenant,
 * so no explicit practice_id filter is needed here.
 */
export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <SupabaseNotConfigured />
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = todayRange();
  const month = currentMonthRange();

  const [practiceResult, appointmentsResult, recallResult, smartFillResult] =
    await Promise.all([
      supabase.from('practices').select('name, slug').single(),
      supabase
        .from('appointments')
        .select('id, encrypted_payload, start_time, end_time, status')
        .gte('start_time', today.startIso)
        .lt('start_time', today.endIso)
        .order('start_time'),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'recall')
        .gte('start_time', month.startIso)
        .lt('start_time', month.endIso),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'smart_fill')
        .gte('start_time', month.startIso)
        .lt('start_time', month.endIso),
    ]);

  const appointments = appointmentsResult.data ?? [];

  const dateFormatter = new Intl.DateTimeFormat('de-DE', { dateStyle: 'full' });

  return (
    <DashboardShell>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-1">
        <p className="text-sm font-medium text-primary">teeth.al</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {practiceResult.data?.name ?? 'Ihre Praxis'}
        </h1>
        <p className="text-muted-foreground">{dateFormatter.format(new Date())}</p>
      </header>

      {practiceResult.data && (
        <BookingLinkCard bookingUrl={getBookingUrl(practiceResult.data.slug)} />
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Recall-Termine diesen Monat</CardDescription>
            <CardTitle className="text-4xl tabular-nums">
              {recallResult.count ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gebucht nach Prophylaxe-Erinnerung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Durch Smart-Fill gefüllte Lücken</CardDescription>
            <CardTitle className="text-4xl tabular-nums">
              {smartFillResult.count ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Kurzfristige Absagen automatisch nachbesetzt
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Heutige Termine</CardTitle>
            <CardDescription>
              {appointments.length === 0
                ? 'Keine Termine für heute.'
                : `${appointments.length} Termin(e) heute`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length > 0 && (
              <AppointmentsTable appointments={appointments} />
            )}
          </CardContent>
        </Card>
      </section>
      </main>
    </DashboardShell>
  );
}
