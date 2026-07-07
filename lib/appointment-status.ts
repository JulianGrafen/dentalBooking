import type { AppointmentStatus } from '@/types/database';

export function isActiveAppointmentStatus(status: AppointmentStatus): boolean {
  return status === 'booked' || status === 'pending';
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'pending':
      return 'Anfrage';
    case 'booked':
      return 'Bestätigt';
    case 'cancelled':
      return 'Storniert';
  }
}

export function appointmentStatusBadgeVariant(
  status: AppointmentStatus,
): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'pending':
      return 'secondary';
    case 'booked':
      return 'default';
    case 'cancelled':
      return 'destructive';
  }
}
