/**
 * E2E tests for Smart-Fill against a running Supabase instance.
 * Skipped automatically when Supabase is not reachable.
 *
 * Run: npm run test:e2e:smart-fill
 * Requires: local Supabase (`npm run db:start`) + demo practice (`npm run seed:demo`)
 */

import { createClient } from '@supabase/supabase-js';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import ws from 'ws';
import {
  processSmartFillWebhook,
  type WaitlistOffer,
} from '../supabase/functions/smart-fill/smart-fill-logic';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

const FIXTURE = {
  practiceId: '',
  patientIds: [] as string[],
  appointmentIds: [] as string[],
};

async function isSupabaseReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SERVICE_ROLE_KEY },
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

describe.runIf(await isSupabaseReachable())('Smart-Fill E2E', () => {
  beforeAll(async () => {
    const { data: practice } = await admin
      .from('practices')
      .select('id')
      .eq('slug', 'zahnarztpraxis-dr-mueller')
      .maybeSingle();

    if (!practice) {
      throw new Error('Demo-Praxis fehlt — zuerst `npm run seed:demo` ausführen');
    }
    FIXTURE.practiceId = practice.id;
  });

  afterEach(async () => {
    if (FIXTURE.appointmentIds.length > 0) {
      await admin.from('appointments').delete().in('id', FIXTURE.appointmentIds);
      FIXTURE.appointmentIds = [];
    }
    if (FIXTURE.patientIds.length > 0) {
      await admin.from('patients').delete().in('id', FIXTURE.patientIds);
      FIXTURE.patientIds = [];
    }
  });

  async function createWaitlistedPatient(email: string, name: string) {
    const { data, error } = await admin
      .from('patients')
      .insert({
        practice_id: FIXTURE.practiceId,
        name,
        email,
        insurance_type: 'kasse',
        is_waitlisted: true,
      })
      .select('id')
      .single();

    if (error) throw error;
    FIXTURE.patientIds.push(data.id);
    return data.id;
  }

  async function createAppointment(startTime: string, status: 'booked' | 'cancelled' = 'booked') {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const { data, error } = await admin
      .from('appointments')
      .insert({
        practice_id: FIXTURE.practiceId,
        encrypted_payload: '{"v":1,"test":"e2e-smart-fill"}',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status,
        source: 'manual',
      })
      .select('id, practice_id, start_time, end_time, status')
      .single();

    if (error) throw error;
    FIXTURE.appointmentIds.push(data.id);
    return data;
  }

  it('notifies waitlisted patients on short-notice cancellation', async () => {
    await createWaitlistedPatient('smartfill-a@test.de', 'Smart Fill A');
    await createWaitlistedPatient('smartfill-b@test.de', 'Smart Fill B');
    await createWaitlistedPatient('smartfill-noemail@test.de', 'No Email');
    // Patient without email — clear email after insert
    const noEmailId = FIXTURE.patientIds.at(-1)!;
    await admin.from('patients').update({ email: null }).eq('id', noEmailId);

    const appt = await createAppointment(hoursFromNow(24));

    const offers: WaitlistOffer[] = [];
    const result = await processSmartFillWebhook(
      { ...appt, status: 'cancelled' },
      { status: 'booked' },
      {
        listWaitlistedPatients: async (practiceId) => {
          const { data, error } = await admin
            .from('patients')
            .select('id, name, email, phone')
            .eq('practice_id', practiceId)
            .eq('is_waitlisted', true);
          if (error) throw error;
          return data ?? [];
        },
        sendOffer: async (offer) => {
          offers.push(offer);
        },
      },
    );

    expect(result.action).toBe('notified');
    if (result.action === 'notified') {
      expect(result.notified).toBeGreaterThanOrEqual(2);
      expect(offers.some((o) => o.to === 'smartfill-a@test.de')).toBe(true);
      expect(offers.some((o) => o.to === 'smartfill-b@test.de')).toBe(true);
      expect(offers.every((o) => o.subject.includes('Kurzfristiger'))).toBe(true);
    }
  });

  it('skips cancellation when appointment is more than 48h away', async () => {
    await createWaitlistedPatient('smartfill-far@test.de', 'Far Away');
    const appt = await createAppointment(hoursFromNow(72));

    const result = await processSmartFillWebhook(
      { ...appt, status: 'cancelled' },
      { status: 'booked' },
      {
        listWaitlistedPatients: async () => {
          throw new Error('should not query waitlist');
        },
        sendOffer: async () => {
          throw new Error('should not send');
        },
      },
    );

    expect(result).toEqual({
      action: 'skipped',
      reason: 'slot not within the next 48h',
    });
  });

  it('skips duplicate cancellation events', async () => {
    const appt = await createAppointment(hoursFromNow(12), 'cancelled');

    const result = await processSmartFillWebhook(
      appt,
      { status: 'cancelled' },
      {
        listWaitlistedPatients: async () => {
          throw new Error('should not query waitlist');
        },
        sendOffer: async () => {
          throw new Error('should not send');
        },
      },
    );

    expect(result).toEqual({ action: 'skipped', reason: 'not a new cancellation' });
  });
});

describe.runIf(!(await isSupabaseReachable()))('Smart-Fill E2E (skipped)', () => {
  it('Supabase not reachable — run `npm run db:start` and `npm run seed:demo`', () => {
    expect(true).toBe(true);
  });
});
