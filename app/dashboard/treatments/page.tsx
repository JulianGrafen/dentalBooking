import { redirect } from 'next/navigation';
import { getCurrentPracticeContext } from '@/lib/server/current-practice';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { OnboardingRestartButton } from '@/components/onboarding/onboarding-restart-button';
import { BookingTreatmentsSettings } from '@/components/settings/booking-treatments-settings';

export default async function TreatmentsPage() {
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

  return (
    <main className={`${uiClasses.pageContainer} max-w-3xl`}>
      <header className="mb-8 space-y-1">
        <div className="mb-2">
          <OnboardingRestartButton />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Online-Buchung
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Behandlungen</h1>
        <p className="text-muted-foreground">
          Termindauer pro Behandlung für {practice.name} — sichtbar auf Ihrer Buchungsseite.
        </p>
      </header>

      <div data-tour="booking-treatments">
        <BookingTreatmentsSettings practiceId={practice.id} canEdit={canEdit} />
      </div>
    </main>
  );
}
