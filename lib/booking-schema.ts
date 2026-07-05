import { z } from 'zod';
import { TREATMENT_IDS } from '@/lib/treatments';

export const BOOKING_TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '14:00',
  '15:00',
  '16:00',
] as const;

/**
 * Validates the public booking form before encryption. Runs client-side —
 * the server never sees the plaintext, so this is the last point where
 * the data CAN be validated.
 */
export const bookingSchema = z.object({
  insuranceType: z.enum(['kasse', 'privat']),
  treatmentId: z.enum(TREATMENT_IDS),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datum')
    .refine(
      (date) => new Date(`${date}T23:59:59`) >= new Date(),
      'Das Datum muss in der Zukunft liegen',
    ),
  timeSlot: z.enum(BOOKING_TIME_SLOTS),
  patientName: z.string().trim().min(2, 'Bitte geben Sie Ihren Namen an').max(200),
  email: z.string().trim().email('Ungültige E-Mail-Adresse').max(320),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s/-]{5,25}$/, 'Ungültige Telefonnummer')
    .optional()
    .or(z.literal('')),
});

export type BookingInput = z.infer<typeof bookingSchema>;
