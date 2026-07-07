import { describe, expect, it } from 'vitest';
import {
  buildCancellationEmail,
  buildConfirmationEmail,
  buildRescheduleEmail,
} from '@/lib/appointment-notifications';
import {
  appointmentDurationMinutes,
  buildSlotTimes,
  isFutureSlot,
  isWithinBookingLeadTime,
  wallTimeToUtcIso,
} from '@/lib/appointment-times';

describe('buildCancellationEmail', () => {
  it('includes patient name, treatment and practice', () => {
    const email = buildCancellationEmail({
      patientName: 'Anna Müller',
      patientEmail: 'anna@test.de',
      practiceName: 'Dr. Schmidt',
      treatment: 'Prophylaxe',
      startTime: '2026-07-10T09:00:00.000Z',
      endTime: '2026-07-10T10:00:00.000Z',
    });

    expect(email.to).toBe('anna@test.de');
    expect(email.subject).toContain('Dr. Schmidt');
    expect(email.subject).toContain('Terminabsage');
    expect(email.body).toContain('Anna Müller');
    expect(email.body).toContain('Prophylaxe');
  });

  it('includes cancellation reason when provided', () => {
    const email = buildCancellationEmail({
      patientName: 'Anna Müller',
      patientEmail: 'anna@test.de',
      practiceName: 'Dr. Schmidt',
      treatment: 'Prophylaxe',
      startTime: '2026-07-10T09:00:00.000Z',
      endTime: '2026-07-10T10:00:00.000Z',
      reason: 'Behandler/in ist krank',
    });

    expect(email.body).toContain('Grund: Behandler/in ist krank');
  });
});

describe('buildConfirmationEmail', () => {
  it('includes confirmed slot details', () => {
    const email = buildConfirmationEmail({
      patientName: 'Anna Müller',
      patientEmail: 'anna@test.de',
      practiceName: 'Dr. Schmidt',
      treatment: 'Prophylaxe',
      startTime: '2026-07-10T09:00:00.000Z',
      endTime: '2026-07-10T10:00:00.000Z',
      cancellationUrl: 'https://teethal.de/termin/absagen?token=test-token',
    });

    expect(email.subject).toContain('Terminbestätigung');
    expect(email.body).toContain('bestätigt');
    expect(email.body).toContain('Prophylaxe');
    expect(email.body).toContain('https://teethal.de/termin/absagen?token=test-token');
  });
});

describe('buildRescheduleEmail', () => {
  it('includes old and new slot', () => {
    const email = buildRescheduleEmail({
      patientName: 'Tom Weber',
      patientEmail: 'tom@test.de',
      practiceName: 'Zahnarztpraxis',
      treatment: 'Kontrolle',
      previousStartTime: '2026-07-10T09:00:00.000Z',
      previousEndTime: '2026-07-10T09:30:00.000Z',
      startTime: '2026-07-12T14:00:00.000Z',
      endTime: '2026-07-12T14:30:00.000Z',
    });

    expect(email.subject).toContain('Terminverschiebung');
    expect(email.body).toContain('Bisheriger Termin');
    expect(email.body).toContain('Neuer Termin');
    expect(email.body).toContain('Tom Weber');
  });
});

describe('appointment-times', () => {
  it('preserves duration when building slot times', () => {
    const { start_time, end_time } = buildSlotTimes('2026-07-15', '10:00', 45);
    expect(appointmentDurationMinutes(start_time, end_time)).toBe(45);
  });

  it('detects future slots', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(isFutureSlot(future)).toBe(true);
    expect(isFutureSlot('2020-01-01T10:00:00.000Z')).toBe(false);
  });

  it('accepts slots exactly 30 minutes ahead', () => {
    const now = new Date('2026-07-07T14:00:00.000Z');
    const start = new Date(now.getTime() + 30 * 60_000).toISOString();
    expect(isWithinBookingLeadTime(start, now)).toBe(true);
  });

  it('maps Berlin wall time to UTC', () => {
    const utc = wallTimeToUtcIso('2026-07-14', '10:00');
    expect(new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(utc))).toBe('10:00');
  });
});
