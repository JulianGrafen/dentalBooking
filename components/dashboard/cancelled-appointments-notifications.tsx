'use client';

import { useMemo } from 'react';
import { BellRing } from 'lucide-react';
import { decryptAppointments, type EncryptedAppointment } from '@/lib/appointment-decrypt';
import { formatAppointmentTimeRange } from '@/lib/format-datetime';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface CancelledAppointmentsNotificationsProps {
  appointments: EncryptedAppointment[];
}

const cancelledFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function CancelledAppointmentsNotifications({
  appointments,
}: CancelledAppointmentsNotificationsProps) {
  const rows = useMemo(
    () =>
      decryptAppointments(appointments)
        .filter((appointment) => appointment.status === 'cancelled')
        .sort((a, b) => (b.cancelled_at ?? '').localeCompare(a.cancelled_at ?? '')),
    [appointments],
  );

  if (rows.length === 0) return null;

  return (
    <Card className="mb-8 border-destructive/25 bg-destructive/5 shadow-sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <BellRing className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl">Terminabsagen</CardTitle>
            <CardDescription>
              {rows.length === 1
                ? '1 Termin wurde abgesagt und sollte geprüft werden.'
                : `${rows.length} Termine wurden abgesagt und sollten geprüft werden.`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((appointment) => (
          <article
            key={appointment.id}
            className="rounded-xl border border-destructive/20 bg-card/90 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold">
                    {appointment.error ? (
                      <span className="text-destructive">{appointment.error}</span>
                    ) : (
                      appointment.patientName
                    )}
                  </p>
                  <Badge variant="destructive">Abgesagt</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{appointment.treatment}</p>
                <p className="text-sm font-medium">
                  {formatAppointmentTimeRange(appointment.start_time, appointment.end_time)}
                </p>
                {appointment.patientEmail && (
                  <p className="text-sm text-muted-foreground">{appointment.patientEmail}</p>
                )}
              </div>
              {appointment.cancelled_at && (
                <p className="text-xs text-muted-foreground">
                  Abgesagt am {cancelledFormatter.format(new Date(appointment.cancelled_at))}
                </p>
              )}
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
