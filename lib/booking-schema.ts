import { z } from 'zod';
import { getOpeningHoursForDate } from '@/lib/booking-hours';
import { QUARTER_HOUR_MINUTES } from '@/lib/booking-slots';

export const QUARTER_HOUR_TIME_PATTERN = /^([01]\d|2[0-3]):(00|15|30|45)$/;

export const timeSlotSchema = z
  .string()
  .regex(QUARTER_HOUR_TIME_PATTERN, 'Ungültige Uhrzeit — nur Viertelstunden');

function createTreatmentIdSchema(treatmentSlugs: [string, ...string[]]) {
  if (treatmentSlugs.length === 0) {
    return z.string().min(1, 'Bitte wählen Sie eine Behandlung');
  }

  return z.enum(treatmentSlugs, {
    message: 'Bitte wählen Sie eine gültige Behandlung',
  });
}

/**
 * Validates the public booking form before encryption. Runs client-side —
 * the server never sees the plaintext, so this is the last point where
 * the data CAN be validated.
 */
export function createBookingSchema(treatmentSlugs: [string, ...string[]]) {
  return z
    .object({
      insuranceType: z.enum(['kasse', 'privat']),
      treatmentId: createTreatmentIdSchema(treatmentSlugs),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datum')
        .refine(
          (date) => new Date(`${date}T23:59:59`) >= new Date(),
          'Das Datum muss in der Zukunft liegen',
        ),
      timeSlot: timeSlotSchema,
      patientName: z.string().trim().min(2, 'Bitte geben Sie Ihren Namen an').max(200),
      email: z.string().trim().email('Ungültige E-Mail-Adresse').max(320),
      phone: z
        .string()
        .trim()
        .regex(/^[+\d][\d\s/-]{5,25}$/, 'Ungültige Telefonnummer')
        .optional()
        .or(z.literal('')),
    })
    .superRefine((data, ctx) => {
      const opening = getOpeningHoursForDate(data.date);
      if (!opening) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'An diesem Tag ist die Praxis geschlossen.',
          path: ['date'],
        });
        return;
      }

      const [hours, minutes] = data.timeSlot.split(':').map(Number);
      const slotStart = hours * 60 + minutes;
      const openStart =
        Number(opening.open.split(':')[0]) * 60 + Number(opening.open.split(':')[1]);
      const openEnd =
        Number(opening.close.split(':')[0]) * 60 + Number(opening.close.split(':')[1]);

      if (slotStart < openStart || slotStart >= openEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Die Uhrzeit liegt außerhalb der Öffnungszeiten.',
          path: ['timeSlot'],
        });
      }

      if (slotStart % QUARTER_HOUR_MINUTES !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bitte wählen Sie eine Viertelstunde.',
          path: ['timeSlot'],
        });
      }
    });
}

export type BookingInput = z.infer<ReturnType<typeof createBookingSchema>>;
