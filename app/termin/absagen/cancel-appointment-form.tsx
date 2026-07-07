'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAppointmentTimeRange } from '@/lib/format-datetime';

interface CancelAppointmentFormProps {
  token: string;
  practiceName: string;
  startTime: string;
  endTime: string;
}

export function CancelAppointmentForm({
  token,
  practiceName,
  startTime,
  endTime,
}: CancelAppointmentFormProps) {
  const [isCancelled, setIsCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setError(null);

    startTransition(async () => {
      const response = await fetch('/api/appointments/public-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? 'Termin konnte nicht abgesagt werden.');
        return;
      }

      setIsCancelled(true);
    });
  }

  if (isCancelled) {
    return (
      <Card className="border-emerald-500/25 bg-emerald-500/5">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle>Termin abgesagt</CardTitle>
          <CardDescription>
            Ihr Termin wurde erfolgreich abgesagt. Die Praxis kann diesen Zeitraum nun neu
            vergeben.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="size-6" />
        </div>
        <CardTitle>Termin wirklich absagen?</CardTitle>
        <CardDescription>
          Bitte bestätigen Sie die Absage erst, wenn Sie den Termin nicht wahrnehmen können.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm">
          <p className="font-medium">{practiceName}</p>
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
          variant="destructive"
          className="w-full"
          onClick={handleCancel}
          disabled={isPending}
        >
          {isPending ? 'Wird abgesagt…' : 'Termin verbindlich absagen'}
        </Button>
      </CardContent>
    </Card>
  );
}
