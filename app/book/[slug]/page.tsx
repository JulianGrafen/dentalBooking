import { notFound } from 'next/navigation';
import { createSupabasePublicClient } from '@/utils/supabase/public';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { BookingWizard } from '@/components/booking/booking-wizard';

interface BookingPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Public booking page (/book/praxis-dr-mueller).
 *
 * Practice lookup runs through the anon role: RLS + column grants expose
 * exactly id, name, slug and public_key — nothing else is readable, and
 * no service-role client is involved anywhere in this flow.
 */
export default async function BookingPage({ params }: BookingPageProps) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-xl flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <p className="text-sm font-medium text-primary">teeth.al</p>
        <p className="text-muted-foreground">
          Buchungsseite ist lokal nicht konfiguriert. Bitte{' '}
          <code className="text-xs">npm run setup:local</code> ausführen.
        </p>
      </main>
    );
  }

  const supabase = createSupabasePublicClient();
  const { data: practice } = await supabase
    .from('practices')
    .select('id, name, public_key')
    .eq('slug', slug)
    .maybeSingle();

  if (!practice) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 px-4 py-12">
      <header className="space-y-1 text-center">
        <p className="text-sm font-medium text-primary">teeth.al</p>
        <h1 className="text-2xl font-semibold tracking-tight">{practice.name}</h1>
        <p className="text-muted-foreground">
          Online-Terminbuchung — Ihre Daten werden Ende-zu-Ende verschlüsselt
        </p>
      </header>

      {practice.public_key ? (
        <BookingWizard practiceId={practice.id} practicePublicKey={practice.public_key} />
      ) : (
        <p className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Diese Praxis hat die Online-Buchung noch nicht aktiviert. Bitte
          vereinbaren Sie Ihren Termin telefonisch.
        </p>
      )}
    </main>
  );
}
