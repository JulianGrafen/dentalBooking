'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { de } from 'react-day-picker/locale';
import { CalendarClock, CalendarX2 } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QUARTER_HOUR_TIME_PATTERN } from '@/lib/booking-schema';
import { formatOpeningHoursLabel, getOpeningHoursForDate } from '@/lib/booking-hours';
import { generateCandidateSlots } from '@/lib/booking-slots';
import type { DecryptedAppointment } from '@/lib/appointment-decrypt';
import { appointmentDurationMinutes } from '@/lib/appointment-times';
import { formatAppointmentTimeRange } from '@/lib/format-datetime';
import { cn } from '@/lib/utils';

interface AppointmentManageActionsProps {
  appointment: DecryptedAppointment;
  compact?: boolean;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function slotFromStartTime(startIso: string): string {
  const date = new Date(startIso);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const slot = `${hours}:${minutes}`;
  return QUARTER_HOUR_TIME_PATTERN.test(slot) ? slot : '09:00';
}

export function AppointmentManageActions({
  appointment,
  compact = false,
}: AppointmentManageActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(appointment.start_time));
  const [timeSlot, setTimeSlot] = useState(() => slotFromStartTime(appointment.start_time));

  const isBooked = appointment.status === 'booked';
  const canNotify = Boolean(appointment.patientEmail) && !appointment.error;
  const slotLabel = useMemo(
    () => formatAppointmentTimeRange(appointment.start_time, appointment.end_time),
    [appointment.end_time, appointment.start_time],
  );
  const durationMinutes = useMemo(
    () => appointmentDurationMinutes(appointment.start_time, appointment.end_time),
    [appointment.end_time, appointment.start_time],
  );
  const rescheduleSlots = useMemo(() => {
    const opening = getOpeningHoursForDate(toIsoDate(selectedDate));
    if (!opening) return [];
    return generateCandidateSlots(opening.open, opening.close, durationMinutes);
  }, [selectedDate, durationMinutes]);

  if (!isBooked) return null;

  async function handleCancel() {
    if (!appointment.patientEmail) {
      toast.error('Keine E-Mail-Adresse — Benachrichtigung nicht möglich');
      return;
    }

    const trimmedReason = cancelReason.trim();
    if (trimmedReason.length < 3) {
      toast.error('Bitte geben Sie einen Grund für die Absage an');
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/appointments/${appointment.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientEmail: appointment.patientEmail,
          patientName: appointment.patientName,
          treatment: appointment.treatment,
          reason: trimmedReason,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        email?: { sent: boolean; mode: string };
      };

      if (!response.ok) {
        toast.error(payload.error ?? 'Stornierung fehlgeschlagen');
        return;
      }

      setCancelOpen(false);
      setCancelReason('');
      toast.success(
        payload.email?.sent
          ? 'Termin storniert — Patient/in per E-Mail informiert'
          : 'Termin storniert — E-Mail simuliert (RESEND_API_KEY fehlt)',
      );
      router.refresh();
    });
  }

  async function handleReschedule() {
    if (!appointment.patientEmail) {
      toast.error('Keine E-Mail-Adresse — Benachrichtigung nicht möglich');
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/appointments/${appointment.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientEmail: appointment.patientEmail,
          patientName: appointment.patientName,
          treatment: appointment.treatment,
          date: toIsoDate(selectedDate),
          timeSlot,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        email?: { sent: boolean; mode: string };
      };

      if (!response.ok) {
        toast.error(payload.error ?? 'Verschiebung fehlgeschlagen');
        return;
      }

      setRescheduleOpen(false);
      toast.success(
        payload.email?.sent
          ? 'Termin verschoben — Patient/in per E-Mail informiert'
          : 'Termin verschoben — E-Mail simuliert (RESEND_API_KEY fehlt)',
      );
      router.refresh();
    });
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', compact ? 'justify-end' : 'mt-3 pl-2')}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={pending || !canNotify}
          onClick={() => setRescheduleOpen(true)}
        >
          <CalendarClock className="size-3.5" />
          Verschieben
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          disabled={pending || !canNotify}
          onClick={() => setCancelOpen(true)}
        >
          <CalendarX2 className="size-3.5" />
          Absagen
        </Button>
      </div>

      {!canNotify && !compact && (
        <p className="mt-2 pl-2 text-xs text-muted-foreground">
          Verwaltung nicht möglich — E-Mail fehlt oder Entschlüsselung fehlgeschlagen.
        </p>
      )}

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) setCancelReason('');
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Termin absagen</DialogTitle>
            <DialogDescription>
              {appointment.patientName} wird per E-Mail über die Absage informiert — inklusive
              Ihres Absagegrunds.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <p className="font-medium">{appointment.treatment}</p>
              <p className="mt-1 text-muted-foreground">{slotLabel}</p>
              <p className="mt-2 text-muted-foreground">{appointment.patientEmail}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`cancel-reason-${appointment.id}`}>Grund der Absage</Label>
              <Textarea
                id={`cancel-reason-${appointment.id}`}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="z. B. Behandler/in krank, dringender Notfall, Praxis geschlossen …"
                rows={3}
                maxLength={500}
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                Wird in der E-Mail an den/die Patient/in mitgeteilt.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={pending || cancelReason.trim().length < 3}
            >
              {pending ? 'Wird abgesagt…' : 'Absage bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Termin verschieben</DialogTitle>
            <DialogDescription>
              Neuer Termin für {appointment.patientName} — Benachrichtigung per E-Mail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">Aktuell</p>
              <p className="font-medium">{slotLabel}</p>
            </div>

            <div className="flex justify-center rounded-xl border border-border/60 bg-card p-3">
              <Calendar
                mode="single"
                locale={de}
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={{ before: new Date() }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label>Neue Uhrzeit</Label>
                <span className="text-xs text-muted-foreground">
                  {formatOpeningHoursLabel(toIsoDate(selectedDate))}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {rescheduleSlots.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={timeSlot === slot ? 'default' : 'outline'}
                    size="sm"
                    className="font-mono"
                    onClick={() => setTimeSlot(slot)}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button onClick={handleReschedule} disabled={pending}>
              {pending ? 'Wird verschoben…' : 'Verschieben & E-Mail senden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
