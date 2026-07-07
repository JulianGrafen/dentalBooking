import { Link2Off } from 'lucide-react';
import { ConfirmWaitlistOfferForm } from '@/app/termin/warteliste-bestaetigen/confirm-waitlist-offer-form';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  hashPublicWaitlistToken,
  isPublicWaitlistToken,
} from '@/lib/server/public-cancel-token';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { createSupabasePublicClient } from '@/utils/supabase/public';

interface WaitlistConfirmPageProps {
  searchParams: Promise<{ token?: string }>;
}

function InvalidWaitlistLink({ message }: { message: string }) {
  return (
    <main className={`${uiClasses.pageContainer} max-w-lg`}>
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Link2Off className="size-6" />
          </div>
          <CardTitle>Wartelisten-Link ungültig</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

export default async function PublicWaitlistConfirmPage({
  searchParams,
}: WaitlistConfirmPageProps) {
  const { token } = await searchParams;

  if (!isPublicWaitlistToken(token)) {
    return (
      <InvalidWaitlistLink message="Dieser Link ist unvollständig oder ungültig. Bitte wenden Sie sich direkt an Ihre Praxis." />
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <InvalidWaitlistLink message="Das Buchungssystem ist vorübergehend nicht konfiguriert." />
    );
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc('get_public_waitlist_offer', {
    waitlist_token_hash: hashPublicWaitlistToken(token),
  });

  if (error) {
    return (
      <InvalidWaitlistLink message="Der Termin konnte nicht geladen werden. Bitte versuchen Sie es später erneut." />
    );
  }

  const offer = Array.isArray(data) ? data[0] : data;
  if (!offer) {
    return (
      <InvalidWaitlistLink message="Dieser Link ist abgelaufen oder wurde bereits verwendet." />
    );
  }

  if (offer.status !== 'offered') {
    return <InvalidWaitlistLink message="Dieses Wartelisten-Angebot ist nicht mehr verfügbar." />;
  }

  return (
    <main className={`${uiClasses.pageContainer} max-w-lg`}>
      <header className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Warteliste
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Termin bestätigen</h1>
      </header>

      <ConfirmWaitlistOfferForm
        token={token}
        practiceName={offer.practice_name}
        treatment={offer.treatment_label}
        startTime={offer.start_time}
        endTime={offer.end_time}
      />
    </main>
  );
}
