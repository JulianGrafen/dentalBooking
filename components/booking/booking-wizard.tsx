'use client';

import { useState, useTransition } from 'react';
import { de } from 'react-day-picker/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { bookingSchema, BOOKING_TIME_SLOTS } from '@/lib/booking-schema';
import { encryptPatientData } from '@/lib/crypto';
import { getTreatment, TREATMENT_TYPES, type TreatmentId } from '@/lib/treatments';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import type { InsuranceType } from '@/types/database';

const STEPS = ['Versicherung', 'Behandlung', 'Termin'] as const;

interface BookingWizardProps {
  practiceId: string;
  /** Base64 public key of the practice — all patient data is encrypted against it. */
  practicePublicKey: string;
}

export function BookingWizard({ practiceId, practicePublicKey }: BookingWizardProps) {
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
      const startTime = new Date(`${parsed.data.date}T${parsed.data.timeSlot}:00`);
      const endTime = new Date(startTime.getTime() + treatment.durationMinutes * 60_000);

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
      const { error: insertError } = await supabase.from('appointments').insert({
        practice_id: practiceId,
        encrypted_payload: encryptedPayload,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        source: 'online',
      });

      if (insertError) {
        console.error('[booking] insert failed:', insertError.message);
        setError('Buchung fehlgeschlagen. Bitte versuchen Sie es erneut.');
        return;
      }

      setConfirmed(true);
    });
  }

  if (confirmed) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Termin angefragt</CardTitle>
          <CardDescription>
            Vielen Dank, {patientName}! Ihre verschlüsselte Buchung ist eingegangen —
            die Praxis meldet sich zur Bestätigung bei Ihnen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {STEPS.map((label, index) => (
            <Badge key={label} variant={index === step ? 'default' : 'secondary'}>
              {index + 1}. {label}
            </Badge>
          ))}
        </div>
        <CardTitle className="pt-2">{STEPS[step]}</CardTitle>
        <CardDescription>
          {step === 0 && 'Wie sind Sie versichert?'}
          {step === 1 && 'Welche Behandlung benötigen Sie?'}
          {step === 2 && 'Wählen Sie Wunschtermin und geben Sie Ihre Kontaktdaten an.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 0 && (
          <RadioGroup
            value={insuranceType ?? ''}
            onValueChange={(value) => setInsuranceType(value as InsuranceType)}
            className="gap-3"
          >
            <Label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary">
              <RadioGroupItem value="kasse" />
              <div>
                <p className="font-medium">Gesetzlich versichert</p>
                <p className="text-sm text-muted-foreground">Kassenpatient/in</p>
              </div>
            </Label>
            <Label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary">
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
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary"
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
            <div className="flex justify-center rounded-lg border p-2">
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0 || isPending}
            onClick={() => setStep(step - 1)}
          >
            Zurück
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" disabled={!canContinue} onClick={() => setStep(step + 1)}>
              Weiter
            </Button>
          ) : (
            <Button type="button" disabled={!canSubmit || isPending} onClick={handleSubmit}>
              {isPending ? 'Wird gebucht…' : 'Termin buchen'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
