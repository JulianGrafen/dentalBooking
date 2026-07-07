'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { de } from 'react-day-picker/locale';
import { CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { createBookingSchema } from '@/lib/booking-schema';
import { mapBookingError } from '@/lib/booking-errors';
import { formatOpeningHoursLabel, getOpeningHoursForDate } from '@/lib/booking-hours';
import { getAvailableBookingSlots, type BookedInterval } from '@/lib/booking-slots';
import { encryptPatientData } from '@/lib/crypto';
import { buildSlotTimes } from '@/lib/appointment-times';
import { findBookingTreatment, type PracticeBookingTreatment } from '@/lib/treatments';
import { StepIndicator } from '@/components/booking/step-indicator';
import { uiClasses } from '@/lib/ui-classes';
import { createSupabasePublicBrowserClient } from '@/utils/supabase/public-browser';
import { cn } from '@/lib/utils';

import type { InsuranceType } from '@/types/database';

const STEPS = ['Versicherung', 'Behandlung', 'Termin'] as const;

const optionClass =
  'flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary/5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:shadow-sm';

interface BookingWizardProps {
  practiceSlug: string;
  /** Base64 public key of the practice — all patient data is encrypted against it. */
  practicePublicKey: string;
  treatments: PracticeBookingTreatment[];
}

function toIsoDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate(),
  ).padStart(2, '0')}`;
}

export function BookingWizard({
  practiceSlug,
  practicePublicKey,
  treatments,
}: BookingWizardProps) {
  const bookingSchema = useMemo(
    () =>
      createBookingSchema(
        treatments.length > 0
          ? (treatments.map((treatment) => treatment.slug) as [string, ...string[]])
          : ['__none__'],
      ),
    [treatments],
  );

  const [step, setStep] = useState(0);
  const [insuranceType, setInsuranceType] = useState<InsuranceType | null>(null);
  const [treatmentId, setTreatmentId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [bookedIntervals, setBookedIntervals] = useState<BookedInterval[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const selectedTreatment = treatmentId
    ? findBookingTreatment(treatmentId, treatments)
    : null;

  const availableSlots = useMemo(() => {
    if (!date || !selectedTreatment) return [];
    return getAvailableBookingSlots(
      toIsoDate(date),
      selectedTreatment.durationMinutes,
      bookedIntervals,
    );
  }, [date, selectedTreatment, bookedIntervals]);

  useEffect(() => {
    if (!date || !selectedTreatment) {
      setBookedIntervals([]);
      setTimeSlot(null);
      setSlotsError(null);
      return;
    }

    const isoDate = toIsoDate(date);
    if (!getOpeningHoursForDate(isoDate)) {
      setBookedIntervals([]);
      setTimeSlot(null);
      setSlotsError(null);
      return;
    }

    let cancelled = false;

    async function loadAvailability() {
      setSlotsLoading(true);
      setTimeSlot(null);
      setSlotsError(null);

      const supabase = createSupabasePublicBrowserClient();
      const { data, error: availabilityError } = await supabase.rpc(
        'get_public_booking_availability',
        {
          booking_slug: practiceSlug,
          booking_date: isoDate,
        },
      );

      if (cancelled) return;

      if (availabilityError) {
        console.error('[booking] availability failed:', availabilityError.message);
        setBookedIntervals([]);
        setSlotsError(mapBookingError(availabilityError.message));
      } else {
        setBookedIntervals(Array.isArray(data) ? data : []);
      }

      setSlotsLoading(false);
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [date, selectedTreatment, practiceSlug]);

  useEffect(() => {
    if (timeSlot && !availableSlots.includes(timeSlot)) {
      setTimeSlot(null);
    }
  }, [availableSlots, timeSlot]);

  const canContinue =
    (step === 0 && insuranceType !== null) || (step === 1 && treatmentId !== null);

  const canSubmit =
    date !== undefined && timeSlot !== null && patientName.trim().length >= 2 && email.length > 0;

  /**
   * Zero-knowledge submit: validate → encrypt in the browser → insert.
   * Only ciphertext plus slot times ever leave this device; Supabase
   * cannot read name, contact or treatment.
   */
  function handleSubmit() {
    if (!insuranceType || !treatmentId || !date || !timeSlot) return;
    setError(null);

    const parsed = bookingSchema.safeParse({
      insuranceType,
      treatmentId,
      date: toIsoDate(date),
      timeSlot,
      patientName,
      email,
      phone,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe');
      return;
    }

    startTransition(async () => {
      const treatment = findBookingTreatment(parsed.data.treatmentId, treatments);
      if (!treatment) {
        setError('Bitte wählen Sie eine gültige Behandlung.');
        return;
      }

      const { start_time, end_time } = buildSlotTimes(
        parsed.data.date,
        parsed.data.timeSlot,
        treatment.durationMinutes,
      );

      const encryptedPayload = encryptPatientData(
        {
          name: parsed.data.patientName,
          email: parsed.data.email,
          phone: parsed.data.phone || undefined,
          insuranceType: parsed.data.insuranceType,
          treatment: treatment.label,
        },
        practicePublicKey,
      );

      const supabase = createSupabasePublicBrowserClient();
      const { error: insertError } = await supabase.rpc('create_public_booking', {
        booking_slug: practiceSlug,
        treatment_slug: treatment.slug,
        encrypted_payload: encryptedPayload,
        requested_start_time: start_time,
        requested_end_time: end_time,
      });

      if (insertError) {
        console.error('[booking] insert failed:', insertError.message);
        setError(mapBookingError(insertError.message));
        return;
      }

      setConfirmed(true);
    });
  }

  if (confirmed) {
    return (
      <div className={cn(uiClasses.glassCard, 'p-8 text-center')}>
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </div>
        <h2 className="text-xl font-semibold">Termin angefragt</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Vielen Dank, {patientName}! Ihre Buchungsanfrage ist eingegangen — die Praxis prüft
          den Termin und sendet Ihnen nach Bestätigung eine E-Mail.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(uiClasses.glassCard, 'overflow-hidden')}>
      <div className="border-b border-border/60 bg-muted/30 px-6 py-5">
        <StepIndicator steps={STEPS} currentStep={step} />
        <h2 className="mt-4 text-lg font-semibold">{STEPS[step]}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 0 && 'Wie sind Sie versichert?'}
          {step === 1 && 'Welche Behandlung benötigen Sie?'}
          {step === 2 && 'Wählen Sie Wunschtermin und geben Sie Ihre Kontaktdaten an.'}
        </p>
      </div>

      <div className="space-y-6 p-6">
        {step === 0 && (
          <RadioGroup
            value={insuranceType ?? ''}
            onValueChange={(value) => setInsuranceType(value as InsuranceType)}
            className="gap-3"
          >
            <Label className={optionClass}>
              <RadioGroupItem value="kasse" />
              <div>
                <p className="font-medium">Gesetzlich versichert</p>
                <p className="text-sm text-muted-foreground">Kassenpatient/in</p>
              </div>
            </Label>
            <Label className={optionClass}>
              <RadioGroupItem value="privat" />
              <div>
                <p className="font-medium">Privat versichert</p>
                <p className="text-sm text-muted-foreground">Privatpatient/in</p>
              </div>
            </Label>
          </RadioGroup>
        )}

        {step === 1 && (
          <RadioGroup
            value={treatmentId ?? ''}
            onValueChange={(value) => setTreatmentId(value)}
            className="gap-3"
          >
            {treatments.map((treatment) => (
              <Label
                key={treatment.slug}
                className={optionClass}
              >
                <RadioGroupItem value={treatment.slug} />
                <div className="flex w-full items-center justify-between">
                  <p className="font-medium">{treatment.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {treatment.durationMinutes} Min.
                  </p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-center rounded-xl border border-border/60 bg-card p-3 shadow-inner">
              <Calendar
                mode="single"
                locale={de}
                selected={date}
                onSelect={setDate}
                disabled={(day) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (day < today) return true;
                  if (day.getDay() === 0) return true;
                  return getOpeningHoursForDate(toIsoDate(day)) === null;
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label>Uhrzeit</Label>
                {date && (
                  <span className="text-xs text-muted-foreground">
                    Öffnungszeiten: {formatOpeningHoursLabel(toIsoDate(date))}
                  </span>
                )}
              </div>

              {!date && (
                <p className="text-sm text-muted-foreground">Bitte wählen Sie zuerst ein Datum.</p>
              )}

              {date && !selectedTreatment && (
                <p className="text-sm text-muted-foreground">
                  Bitte wählen Sie zuerst eine Behandlung.
                </p>
              )}

              {date && selectedTreatment && slotsLoading && (
                <p className="text-sm text-muted-foreground">Freie Termine werden geladen…</p>
              )}

              {date && selectedTreatment && slotsError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {slotsError}
                </p>
              )}

              {date && selectedTreatment && !slotsLoading && !slotsError && availableSlots.length === 0 && (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  An diesem Tag sind keine freien Termine mehr verfügbar. Bitte wählen Sie
                  einen anderen Tag.
                </p>
              )}

              {date && selectedTreatment && !slotsLoading && !slotsError && availableSlots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      variant={timeSlot === slot ? 'default' : 'outline'}
                      className="font-mono text-sm"
                      onClick={() => setTimeSlot(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Name</Label>
                <Input
                  id="patientName"
                  value={patientName}
                  onChange={(event) => setPatientName(event.target.value)}
                  placeholder="Vor- und Nachname"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ihre@email.de"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+49 ..."
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0 || isPending}
            onClick={() => setStep(step - 1)}
          >
            Zurück
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              disabled={!canContinue}
              onClick={() => setStep(step + 1)}
              className="min-w-28 shadow-sm shadow-primary/20"
            >
              Weiter
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canSubmit || isPending}
              onClick={handleSubmit}
              className="min-w-36 gap-2 shadow-sm shadow-primary/20"
            >
              <Lock className="size-4" />
              {isPending ? 'Wird gebucht…' : 'Verschlüsselt buchen'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
