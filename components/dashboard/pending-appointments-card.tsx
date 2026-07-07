'use client';

import { useMemo } from 'react';
import { Inbox } from 'lucide-react';
import {
  decryptAppointments,
  type EncryptedAppointment,
} from '@/lib/appointment-decrypt';
import { isAwaitingConfirmation } from '@/lib/appointment-confirmation';
import { AppointmentManageActions } from '@/components/dashboard/appointment-manage-actions';
import { formatAppointmentTimeRange } from '@/lib/format-datetime';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PendingAppointmentsCardProps {
  appointments: EncryptedAppointment[];
}

export function PendingAppointmentsCard({ appointments }: PendingAppointmentsCardProps) {
  const rows = useMemo(
    () => decryptAppointments(appointments).filter((row) => isAwaitingConfirmation(row.status)),
    [appointments],
  );

  if (rows.length === 0) return null;

  return (
    <Card className="mb-8 border-amber-500/30 bg-amber-500/5 shadow-sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
            <Inbox className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl">Offene Buchungsanfragen</CardTitle>
            <CardDescription>
              {rows.length === 1
                ? '1 Termin wartet auf Ihre Bestätigung — der Patient erhält danach eine E-Mail.'
                : `${rows.length} Termine warten auf Ihre Bestätigung — Patienten erhalten danach eine E-Mail.`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((appointment) => (
          <article
            key={appointment.id}
            className="rounded-xl border border-amber-500/25 bg-card/90 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold">
                    {appointment.error ? (
                      <span className="text-destructive">{appointment.error}</span>
                    ) : (
                      appointment.patientName
                    )}
                  </p>
                  <Badge variant="secondary">Anfrage</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{appointment.treatment}</p>
                <p className="text-sm font-medium">
                  {formatAppointmentTimeRange(appointment.start_time, appointment.end_time)}
                </p>
                {appointment.patientEmail && (
                  <p className="text-sm text-muted-foreground">{appointment.patientEmail}</p>
                )}
              </div>
              <AppointmentManageActions appointment={appointment} compact />
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
