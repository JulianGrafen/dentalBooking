'use client';

import { useState, useTransition } from 'react';
import { de } from 'react-day-picker/locale';
import { CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { bookingSchema, BOOKING_TIME_SLOTS } from '@/lib/booking-schema';
import { encryptPatientData } from '@/lib/crypto';
import { buildSlotTimes } from '@/lib/appointment-times';
import { getTreatment, TREATMENT_TYPES, type TreatmentId } from '@/lib/treatments';
import { StepIndicator } from '@/components/booking/step-indicator';
import { uiClasses } from '@/lib/ui-classes';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';

import type { InsuranceType } from '@/types/database';

const STEPS = ['Versicherung', 'Behandlung', 'Termin'] as const;

const optionClass =
  'flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary/5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:shadow-sm';

function mapBookingError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid booking target')) {
    return 'Diese Buchungsseite ist nicht verfügbar. Bitte prüfen Sie den Link Ihrer Praxis.';
  }
  if (normalized.includes('appointment must be in the future')) {
    return 'Der Termin muss mindestens 30 Minuten in der Zukunft liegen.';
  }
  if (normalized.includes('appointment slot is no longer available')) {
    return 'Dieser Termin ist bereits belegt. Bitte wählen Sie eine andere Uhrzeit.';
  }
  if (normalized.includes('outside booking hours') || normalized.includes('not available on this day')) {
    return 'Dieser Termin liegt außerhalb der buchbaren Zeiten (Mo–Sa, 09–16 Uhr).';
  }
  if (normalized.includes('too many recent booking attempts')) {
    return 'Zu viele Buchungsversuche. Bitte warten Sie einige Minuten.';
  }
  if (normalized.includes('could not find the function') || normalized.includes('schema cache')) {
    return 'Buchungssystem nicht eingerichtet. Die Datenbank-Migrationen fehlen noch.';
  }
  return 'Buchung fehlgeschlagen. Bitte versuchen Sie es erneut.';
}

interface BookingWizardProps {
  practiceSlug: string;
  /** Base64 public key of the practice — all patient data is encrypted against it. */
  practicePublicKey: string;
}

export function BookingWizard({ practiceSlug, practicePublicKey }: BookingWizardProps) {
  const [step, setStep] = useState(0);
  const [insuranceType, setInsuranceType] = useState<InsuranceType | null>(null);
  const [treatmentId, setTreatmentId] = useState<TreatmentId | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canContinue =
    (step === 0 && insuranceType !== null) || (step === 1 && treatmentId !== null);

  const canSubmit =
    date !== undefined && timeSlot !== null && patientName.trim().length >= 2 && email.length > 0;

  function toIsoDate(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
      value.getDate(),
    ).padStart(2, '0')}`;
  }

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
      const treatment = getTreatment(parsed.data.treatmentId);
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

      const supabase = createSupabaseBrowserClient();
      const { error: insertError } = await supabase.rpc('create_public_booking', {
        booking_slug: practiceSlug,
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
          Vielen Dank, {patientName}! Ihre verschlüsselte Buchung ist eingegangen —
          die Praxis meldet sich zur Bestätigung bei Ihnen.
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
            onValueChange={(value) => setTreatmentId(value as TreatmentId)}
            className="gap-3"
          >
            {TREATMENT_TYPES.map((treatment) => (
              <Label
                key={treatment.id}
                className={optionClass}
              >
                <RadioGroupItem value={treatment.id} />
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
                disabled={{ before: new Date() }}
              />
            </div>

            <div className="space-y-2">
              <Label>Uhrzeit</Label>
              <div className="grid grid-cols-3 gap-2">
                {BOOKING_TIME_SLOTS.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={timeSlot === slot ? 'default' : 'outline'}
                    onClick={() => setTimeSlot(slot)}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
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
