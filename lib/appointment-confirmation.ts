import type { AppointmentStatus } from '@/types/database';

/** Online requests awaiting practice approval before the patient is notified. */
export function isAwaitingConfirmation(status: AppointmentStatus): boolean {
  return status === 'pending';
}
