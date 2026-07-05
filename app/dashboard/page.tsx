import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BellRing, CalendarDays, Shield, Users } from 'lucide-react';
import { currentMonthRange, todayRange } from '@/lib/date-ranges';
import { getCurrentPracticeContext } from '@/lib/server/current-practice';
import { getBookingUrl } from '@/lib/site';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { AppointmentsTable } from '@/components/dashboard/appointments-table';
import { BookingLinkCard } from '@/components/dashboard/booking-link-card';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { EmptyState } from '@/components/dashboard/empty-state';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function DashboardPage() {
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

  const today = todayRange();
  const month = currentMonthRange();

  const [practiceResult, appointmentsResult, recallResult, smartFillResult] =
    await Promise.all([
      Promise.resolve({ data: practice }),
      supabase
        .from('appointments')
        .select('id, encrypted_payload, start_time, end_time, status')
        .eq('practice_id', practice.id)
        .gte('start_time', today.startIso)
        .lt('start_time', today.endIso)
        .order('start_time'),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('practice_id', practice.id)
        .eq('source', 'recall')
        .gte('start_time', month.startIso)
        .lt('start_time', month.endIso),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('practice_id', practice.id)
        .eq('source', 'smart_fill')
        .gte('start_time', month.startIso)
        .lt('start_time', month.endIso),
    ]);

  const appointments = appointmentsResult.data ?? [];
  const dateFormatter = new Intl.DateTimeFormat('de-DE', { dateStyle: 'full' });

  return (
    <DashboardShell>
      <main className={uiClasses.pageContainer}>
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Dashboard
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {practiceResult.data?.name ?? 'Ihre Praxis'}
            </h1>
            <p className="text-muted-foreground">{dateFormatter.format(new Date())}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2 bg-card/80">
              <Link href="/dashboard/calendar">
                <CalendarDays className="size-4" />
                Kalender
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 bg-card/80">
              <Link href="/dashboard/security">
                <Shield className="size-4" />
                Sicherheit & 2FA
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 bg-card/80">
              <Link href="/dashboard/team">
                <Users className="size-4" />
                Team
              </Link>
            </Button>
          </div>
        </header>

        {practiceResult.data && (
          <section className="mb-8">
            <BookingLinkCard bookingUrl={getBookingUrl(practiceResult.data.slug)} />
          </section>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <MetricCard
            title="Recall-Termine"
            value={recallResult.count ?? 0}
            description="Gebucht nach Prophylaxe-Erinnerung diesen Monat"
            icon={BellRing}
            tourId="recall-metric"
          />
          <MetricCard
            title="Smart-Fill Lücken"
            value={smartFillResult.count ?? 0}
            description="Kurzfristige Absagen automatisch nachbesetzt"
            icon={CalendarDays}
            accent="emerald"
            tourId="smart-fill-metric"
          />
        </section>

        <section data-tour="today-appointments">
          <Card className={uiClasses.glassCard}>
            <CardHeader>
              <CardTitle className="text-xl">Heutige Termine</CardTitle>
              <CardDescription>
                {appointments.length === 0
                  ? 'Keine Termine für heute.'
                  : `${appointments.length} Termin(e) — Ende-zu-Ende entschlüsselt`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <AppointmentsTable appointments={appointments} />
              ) : (
                <EmptyState
                  title="Keine Termine heute"
                  description="Teilen Sie Ihren Buchungslink, damit Patienten online Termine vereinbaren können."
                />
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </DashboardShell>
  );
}
