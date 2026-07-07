import { notFound } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';
import { createSupabasePublicClient } from '@/utils/supabase/public';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { BookingWizard } from '@/components/booking/booking-wizard';

interface BookingPageProps {
  params: Promise<{ slug: string }>;
}

function BookingSetupError({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Buchung vorübergehend nicht verfügbar</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{message}</p>
    </main>
  );
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <BookingSetupError message="Supabase ist nicht konfiguriert. Bitte npm run setup:local ausführen und den Dev-Server neu starten." />
    );
  }

  const supabase = createSupabasePublicClient();
  const [practiceResult, treatmentsResult] = await Promise.all([
    supabase.rpc('get_public_booking_practice', { booking_slug: slug }),
    supabase.rpc('get_public_booking_treatments', { booking_slug: slug }),
  ]);

  const { data, error } = practiceResult;

  if (error) {
    const isMissingRpc =
      error.message.includes('Could not find the function') ||
      error.message.includes('schema cache');

    return (
      <BookingSetupError
        message={
          isMissingRpc
            ? 'Die Buchungs-API ist in der Datenbank noch nicht eingerichtet. Bitte npm run db:push ausführen.'
            : `Technischer Fehler beim Laden der Praxis: ${error.message}`
        }
      />
    );
  }

  const practice = Array.isArray(data) ? data[0] : data;
  if (!practice?.public_key) notFound();

  if (treatmentsResult.error) {
    const isMissingRpc =
      treatmentsResult.error.message.includes('Could not find the function') ||
      treatmentsResult.error.message.includes('schema cache');

    return (
      <BookingSetupError
        message={
          isMissingRpc
            ? 'Die Buchungs-API ist in der Datenbank noch nicht eingerichtet. Bitte npm run db:push ausführen.'
            : `Technischer Fehler beim Laden der Behandlungen: ${treatmentsResult.error.message}`
        }
      />
    );
  }

  const treatments = (Array.isArray(treatmentsResult.data) ? treatmentsResult.data : []).map(
    (row) => ({
      slug: row.slug,
      label: row.label,
      durationMinutes: row.duration_minutes,
    }),
  );

  if (treatments.length === 0) {
    return (
      <BookingSetupError message="Für diese Praxis sind derzeit keine Online-Behandlungen freigeschaltet." />
    );
  }

  return (
    <main className={`${uiClasses.pageContainer} max-w-xl`}>
      <header className="mb-8 space-y-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="size-3.5" />
          Sichere Online-Buchung
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {practice.name}
          </h1>
          <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5 text-primary" />
            Ihre Daten werden Ende-zu-Ende verschlüsselt
          </p>
        </div>
      </header>

      <BookingWizard
        practiceSlug={slug}
        practicePublicKey={practice.public_key}
        treatments={treatments}
      />
    </main>
  );
}
