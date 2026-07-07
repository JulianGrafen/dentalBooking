import { z } from 'zod';
import { timeSlotSchema } from '@/lib/booking-schema';

export const patientNotificationSchema = z.object({
  patientEmail: z.string().trim().email('Ungültige E-Mail-Adresse').max(320),
  patientName: z.string().trim().min(1).max(200),
  treatment: z.string().trim().min(1).max(200),
});

export const cancelAppointmentSchema = patientNotificationSchema.extend({
  reason: z
    .string()
    .trim()
    .min(3, 'Bitte geben Sie einen Grund an (mind. 3 Zeichen)')
    .max(500, 'Grund darf maximal 500 Zeichen haben'),
});

export const rescheduleAppointmentSchema = patientNotificationSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datum'),
  timeSlot: timeSlotSchema,
});

export const confirmAppointmentSchema = patientNotificationSchema;

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type ConfirmAppointmentInput = z.infer<typeof confirmAppointmentSchema>;
