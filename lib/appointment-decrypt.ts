import { decryptPatientData } from '@/lib/crypto';
import { getPrivateKey } from '@/lib/practice-key';

export interface EncryptedAppointment {
  id: string;
  encrypted_payload: string;
  start_time: string;
  end_time: string;
  status: 'booked' | 'cancelled' | 'pending';
  resource_id?: string | null;
  cancelled_at?: string | null;
}

export interface DecryptedAppointment {
  id: string;
  patientName: string;
  patientEmail: string | null;
  treatment: string;
  insuranceLabel: string;
  start_time: string;
  end_time: string;
  status: 'booked' | 'cancelled' | 'pending';
  resource_id?: string | null;
  cancelled_at?: string | null;
  error?: string;
}

export function decryptAppointments(
  appointments: EncryptedAppointment[],
): DecryptedAppointment[] {
  const privateKey = getPrivateKey();
  if (!privateKey) return [];

  return appointments.map((appointment) => {
    try {
      const data = decryptPatientData(appointment.encrypted_payload, privateKey);
      return {
        id: appointment.id,
        patientName: data.name,
        patientEmail: data.email,
        treatment: data.treatment,
        insuranceLabel: data.insuranceType === 'kasse' ? 'Kasse' : 'Privat',
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        resource_id: appointment.resource_id ?? null,
        cancelled_at: appointment.cancelled_at ?? null,
      };
    } catch {
      return {
        id: appointment.id,
        patientName: '—',
        patientEmail: null,
        treatment: '—',
        insuranceLabel: '—',
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        resource_id: appointment.resource_id ?? null,
        cancelled_at: appointment.cancelled_at ?? null,
        error: 'Entschlüsselung fehlgeschlagen',
      };
    }
  });
}
