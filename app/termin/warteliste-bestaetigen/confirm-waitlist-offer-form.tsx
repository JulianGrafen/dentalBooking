'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAppointmentTimeRange } from '@/lib/format-datetime';

interface ConfirmWaitlistOfferFormProps {
  token: string;
  practiceName: string;
  treatment: string;
  startTime: string;
  endTime: string;
}

export function ConfirmWaitlistOfferForm({
  token,
  practiceName,
  treatment,
  startTime,
  endTime,
}: ConfirmWaitlistOfferFormProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);

    startTransition(async () => {
      const response = await fetch('/api/waitlist/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? 'Termin konnte nicht bestätigt werden.');
        return;
      }

      setIsConfirmed(true);
    });
  }

  if (isConfirmed) {
    return (
      <Card className="border-emerald-500/25 bg-emerald-500/5">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle>Termin bestätigt</CardTitle>
          <CardDescription>
            Der Termin wurde verbindlich in den Kalender der Praxis eingetragen. Sie erhalten eine
            Bestätigung per E-Mail.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </div>
        <CardTitle>Wartelisten-Termin bestätigen</CardTitle>
        <CardDescription>
          Dieser Termin ist frei geworden. Bitte bestätigen Sie ihn nur, wenn Sie ihn wahrnehmen
          können.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm">
          <p className="font-medium">{practiceName}</p>
          <p className="mt-1">{treatment}</p>
          <p className="mt-1 text-muted-foreground">
            {formatAppointmentTimeRange(startTime, endTime)}
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="button"
          className="w-full"
          onClick={handleConfirm}
          disabled={isPending}
        >
          {isPending ? 'Wird bestätigt…' : 'Termin verbindlich bestätigen'}
        </Button>
      </CardContent>
    </Card>
  );
}
