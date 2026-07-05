import { describe, expect, it, vi } from 'vitest';
import {
  buildWaitlistOffer,
  isNewCancellation,
  isShortNoticeCancellation,
  processSmartFillWebhook,
  SMART_FILL_WINDOW_HOURS,
  type AppointmentRecord,
  type WaitlistedPatient,
} from './smart-fill-logic';

const BASE_NOW = new Date('2026-07-05T10:00:00.000Z');

function appointment(
  overrides: Partial<AppointmentRecord> & Pick<AppointmentRecord, 'start_time' | 'status'>,
): AppointmentRecord {
  return {
    id: 'appt-1',
    practice_id: 'practice-1',
    end_time: '2026-07-05T11:00:00.000Z',
    ...overrides,
  };
}

function hoursFromNow(hours: number, from = BASE_NOW): string {
  return new Date(from.getTime() + hours * 60 * 60 * 1000).toISOString();
}

describe('isNewCancellation', () => {
  it('returns true only on transition into cancelled', () => {
    expect(isNewCancellation({ status: 'cancelled' }, { status: 'booked' })).toBe(true);
    expect(isNewCancellation({ status: 'cancelled' }, { status: 'cancelled' })).toBe(false);
    expect(isNewCancellation({ status: 'cancelled' }, null)).toBe(true);
    expect(isNewCancellation({ status: 'booked' }, { status: 'booked' })).toBe(false);
  });
});

describe('isShortNoticeCancellation', () => {
  it('returns true for future slot within 48h', () => {
    const record = appointment({
      status: 'cancelled',
      start_time: hoursFromNow(24),
    });
    expect(isShortNoticeCancellation(record, BASE_NOW)).toBe(true);
  });

  it('returns false when slot is more than 48h away', () => {
    const record = appointment({
      status: 'cancelled',
      start_time: hoursFromNow(SMART_FILL_WINDOW_HOURS + 1),
    });
    expect(isShortNoticeCancellation(record, BASE_NOW)).toBe(false);
  });

  it('returns false when slot is in the past', () => {
    const record = appointment({
      status: 'cancelled',
      start_time: hoursFromNow(-2),
    });
    expect(isShortNoticeCancellation(record, BASE_NOW)).toBe(false);
  });

  it('returns false when status is not cancelled', () => {
    const record = appointment({
      status: 'booked',
      start_time: hoursFromNow(12),
    });
    expect(isShortNoticeCancellation(record, BASE_NOW)).toBe(false);
  });

  it('returns false exactly at 48h boundary (exclusive upper bound)', () => {
    const record = appointment({
      status: 'cancelled',
      start_time: hoursFromNow(SMART_FILL_WINDOW_HOURS),
    });
    expect(isShortNoticeCancellation(record, BASE_NOW)).toBe(false);
  });
});

describe('buildWaitlistOffer', () => {
  const patient: WaitlistedPatient = {
    id: 'patient-1',
    name: 'Anna Test',
    email: 'anna@test.de',
    phone: '+49170',
  };

  it('builds a German offer email with slot time', () => {
    const offer = buildWaitlistOffer(
      patient,
      appointment({ status: 'cancelled', start_time: '2026-07-06T14:00:00.000Z' }),
    );

    expect(offer).not.toBeNull();
    expect(offer!.to).toBe('anna@test.de');
    expect(offer!.subject).toBe('Kurzfristiger Termin frei geworden');
    expect(offer!.body).toContain('Anna Test');
    expect(offer!.body).toContain('Warteliste');
  });

  it('returns null when patient has no email', () => {
    const offer = buildWaitlistOffer(
      { ...patient, email: null },
      appointment({ status: 'cancelled', start_time: hoursFromNow(12) }),
    );
    expect(offer).toBeNull();
  });
});

describe('processSmartFillWebhook', () => {
  const cancelledShortNotice = appointment({
    status: 'cancelled',
    start_time: hoursFromNow(20),
  });

  it('skips when not a new cancellation', async () => {
    const result = await processSmartFillWebhook(
      cancelledShortNotice,
      { status: 'cancelled' },
      { listWaitlistedPatients: vi.fn(), sendOffer: vi.fn() },
      BASE_NOW,
    );
    expect(result).toEqual({ action: 'skipped', reason: 'not a new cancellation' });
  });

  it('skips when slot is outside 48h window', async () => {
    const result = await processSmartFillWebhook(
      appointment({ status: 'cancelled', start_time: hoursFromNow(72) }),
      { status: 'booked' },
      { listWaitlistedPatients: vi.fn(), sendOffer: vi.fn() },
      BASE_NOW,
    );
    expect(result).toEqual({
      action: 'skipped',
      reason: `slot not within the next ${SMART_FILL_WINDOW_HOURS}h`,
    });
  });

  it('notifies all waitlisted patients with email', async () => {
    const patients: WaitlistedPatient[] = [
      { id: 'p1', name: 'A', email: 'a@test.de', phone: null },
      { id: 'p2', name: 'B', email: 'b@test.de', phone: null },
      { id: 'p3', name: 'C', email: null, phone: null },
    ];
    const sendOffer = vi.fn().mockResolvedValue(undefined);

    const result = await processSmartFillWebhook(
      cancelledShortNotice,
      { status: 'booked' },
      {
        listWaitlistedPatients: vi.fn().mockResolvedValue(patients),
        sendOffer,
      },
      BASE_NOW,
    );

    expect(result).toEqual({
      action: 'notified',
      appointmentId: 'appt-1',
      waitlisted: 3,
      notified: 2,
    });
    expect(sendOffer).toHaveBeenCalledTimes(2);
  });

  it('returns notified with zero when waitlist is empty', async () => {
    const result = await processSmartFillWebhook(
      cancelledShortNotice,
      { status: 'booked' },
      {
        listWaitlistedPatients: vi.fn().mockResolvedValue([]),
        sendOffer: vi.fn(),
      },
      BASE_NOW,
    );

    expect(result).toEqual({
      action: 'notified',
      appointmentId: 'appt-1',
      waitlisted: 0,
      notified: 0,
    });
  });
});
