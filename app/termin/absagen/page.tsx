import { Link2Off } from 'lucide-react';
import { CancelAppointmentForm } from '@/app/termin/absagen/cancel-appointment-form';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { hashPublicCancelToken, isPublicCancelToken } from '@/lib/server/public-cancel-token';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { createSupabasePublicClient } from '@/utils/supabase/public';

interface CancelPageProps {
  searchParams: Promise<{ token?: string }>;
}

function InvalidCancelLink({ message }: { message: string }) {
  return (
    <main className={`${uiClasses.pageContainer} max-w-lg`}>
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Link2Off className="size-6" />
          </div>
          <CardTitle>Absage-Link ungültig</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

export default async function PublicCancelPage({ searchParams }: CancelPageProps) {
  const { token } = await searchParams;

  if (!isPublicCancelToken(token)) {
    return (
      <InvalidCancelLink message="Dieser Link ist unvollständig oder ungültig. Bitte wenden Sie sich direkt an Ihre Praxis." />
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <InvalidCancelLink message="Das Buchungssystem ist vorübergehend nicht konfiguriert." />
    );
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc('get_public_cancel_appointment', {
    cancel_token_hash: hashPublicCancelToken(token),
  });

  if (error) {
    return (
      <InvalidCancelLink message="Der Termin konnte nicht geladen werden. Bitte versuchen Sie es später erneut." />
    );
  }

  const appointment = Array.isArray(data) ? data[0] : data;
  if (!appointment) {
    return (
      <InvalidCancelLink message="Dieser Link ist abgelaufen oder wurde bereits verwendet." />
    );
  }

  if (appointment.status === 'cancelled') {
    return <InvalidCancelLink message="Dieser Termin wurde bereits abgesagt." />;
  }

  return (
    <main className={`${uiClasses.pageContainer} max-w-lg`}>
      <header className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Terminabsage
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Absage bestätigen</h1>
      </header>

      <CancelAppointmentForm
        token={token}
        practiceName={appointment.practice_name}
        startTime={appointment.start_time}
        endTime={appointment.end_time}
      />
    </main>
  );
}
