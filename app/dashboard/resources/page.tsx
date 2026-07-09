import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCurrentPracticeContext } from '@/lib/server/current-practice';
import {
  formatDateParam,
  parseDateParam,
  scheduleFetchRange,
  shiftAnchor,
} from '@/lib/schedule-view';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { Button } from '@/components/ui/button';
import { PracticeResourcesSettings } from '@/components/settings/practice-resources-settings';
import { ResourceOccupancyPlan } from '@/components/settings/resource-occupancy-plan';

interface ResourcesPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <SupabaseNotConfigured />
      </main>
    );
  }

  const context = await getCurrentPracticeContext();
  if (!context) redirect('/login');

  const { practice, role } = context;
  const canEdit = role === 'owner';
  const params = await searchParams;
  const selectedDate = parseDateParam(params.date) ?? new Date();
  const range = scheduleFetchRange('day', selectedDate);

  const [resourcesResult, appointmentsResult] = await Promise.all([
    context.supabase
      .from('resources')
      .select('*')
      .eq('practice_id', practice.id)
      .eq('type', 'room')
      .order('name'),
    context.supabase
      .from('appointments')
      .select('id, encrypted_payload, start_time, end_time, status, resource_id')
      .eq('practice_id', practice.id)
      .gte('start_time', range.startIso)
      .lt('start_time', range.endIso)
      .not('resource_id', 'is', null)
      .order('start_time'),
  ]);

  const rooms = resourcesResult.data ?? [];
  const roomAppointments = appointmentsResult.data ?? [];
  const previousDay = shiftAnchor(selectedDate, 'day', -1);
  const nextDay = shiftAnchor(selectedDate, 'day', 1);

  return (
    <main className={`${uiClasses.pageContainer} max-w-5xl`}>
      <header className="mb-8 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Praxis-Ausstattung
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Ressourcen</h1>
        <p className="text-muted-foreground">
          Räume, Stühle und Geräte für {practice.name}. Räume werden beim
          Bestätigen eines Termins zugewiesen und im Belegungsplan sichtbar.
        </p>
      </header>

      <div className="space-y-6">
        <PracticeResourcesSettings practiceId={practice.id} canEdit={canEdit} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Raumbelegung</h2>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline" size="icon" aria-label="Vorheriger Tag">
              <Link href={`/dashboard/resources?date=${formatDateParam(previousDay)}`}>
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/resources">Heute</Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Nächster Tag">
              <Link href={`/dashboard/resources?date=${formatDateParam(nextDay)}`}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <ResourceOccupancyPlan
          rooms={rooms}
          appointments={roomAppointments}
          date={selectedDate}
        />
      </div>
    </main>
  );
}
