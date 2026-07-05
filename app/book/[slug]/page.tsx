import { notFound } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';
import { createSupabasePublicClient } from '@/utils/supabase/public';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { BookingWizard } from '@/components/booking/booking-wizard';

interface BookingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-muted-foreground">
          Buchungsseite ist lokal nicht konfiguriert. Bitte{' '}
          <code className="text-xs">npm run setup:local</code> ausführen.
        </p>
      </main>
    );
  }

  const supabase = createSupabasePublicClient();
  const { data: practice } = await supabase
    .rpc('get_public_booking_practice', { booking_slug: slug })
    .maybeSingle();

  if (!practice) notFound();

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

      <BookingWizard practiceSlug={slug} practicePublicKey={practice.public_key} />
    </main>
  );
}
