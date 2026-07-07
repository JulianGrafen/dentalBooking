import { describe, expect, it } from 'vitest';
import { filterAppointmentsByPatientName, matchesPatientName } from '@/lib/appointment-search';
import type { DecryptedAppointment } from '@/lib/appointment-decrypt';

const sample: DecryptedAppointment[] = [
  {
    id: '1',
    patientName: 'Julian Gräfen',
    patientEmail: 'j@example.com',
    treatment: 'Kontrolle',
    insuranceLabel: 'Privat',
    start_time: '2026-07-10T12:15:00.000Z',
    end_time: '2026-07-10T12:45:00.000Z',
    status: 'booked',
  },
  {
    id: '2',
    patientName: 'Anna Müller',
    patientEmail: null,
    treatment: 'Prophylaxe',
    insuranceLabel: 'Kasse',
    start_time: '2026-07-11T08:00:00.000Z',
    end_time: '2026-07-11T09:00:00.000Z',
    status: 'pending',
  },
];

describe('matchesPatientName', () => {
  it('matches case-insensitively and partially', () => {
    expect(matchesPatientName('Julian Gräfen', 'gräf')).toBe(true);
    expect(matchesPatientName('Anna Müller', 'müller')).toBe(true);
    expect(matchesPatientName('Anna Müller', 'julian')).toBe(false);
  });
});

describe('filterAppointmentsByPatientName', () => {
  it('returns all appointments for empty query', () => {
    expect(filterAppointmentsByPatientName(sample, '')).toHaveLength(2);
  });

  it('filters by patient name', () => {
    expect(filterAppointmentsByPatientName(sample, 'Anna')).toEqual([sample[1]]);
  });
});
