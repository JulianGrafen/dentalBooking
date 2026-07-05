/**
 * smart-fill — refills short-notice cancellations from the waitlist.
 *
 * Invoked by a database trigger (see migration 20260705000003) whenever an
 * appointment transitions to 'cancelled'. If the freed slot starts in less
 * than 48 hours, all waitlisted patients of that practice are notified
 * (simulated via console.log for the MVP).
 *
 * Security: service role (system job, bypasses RLS by design). Invocation
 * is gated by the X-Webhook-Secret header set by the trigger.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  type AppointmentRecord,
  buildWaitlistOffer,
  isNewCancellation,
  isShortNoticeCancellation,
  SMART_FILL_WINDOW_HOURS,
  type WaitlistedPatient,
} from './smart-fill-logic.ts';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: AppointmentRecord;
  old_record: AppointmentRecord | null;
}

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('SMART_FILL_WEBHOOK_SECRET');
  if (!webhookSecret || req.headers.get('x-webhook-secret') !== webhookSecret) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const payload = (await req.json()) as WebhookPayload;
  const { record, old_record } = payload;

  // The trigger already filters, but stay defensive against replays/misfires.
  if (!isNewCancellation(record, old_record)) {
    return jsonResponse(200, { skipped: 'not a new cancellation' });
  }

  if (!isShortNoticeCancellation(record, new Date())) {
    return jsonResponse(200, {
      skipped: `slot not within the next ${SMART_FILL_WINDOW_HOURS}h`,
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: waitlisted, error } = await supabase
    .from('patients')
    .select('id, name, email, phone')
    .eq('practice_id', record.practice_id)
    .eq('is_waitlisted', true)
    .returns<WaitlistedPatient[]>();

  if (error) {
    console.error('[smart-fill] waitlist query failed:', error.message);
    return jsonResponse(500, { error: 'Failed to query waitlist' });
  }

  let notified = 0;

  for (const patient of waitlisted) {
    const offer = buildWaitlistOffer(patient, record);
    if (!offer) {
      console.warn(`[smart-fill] Waitlisted patient ${patient.id} has no email.`);
      continue;
    }

    // MVP: simulated send. Replace with a real email/SMS provider later.
    console.log(`[smart-fill] EMAIL -> ${offer.to} | ${offer.subject}\n${offer.body}`);
    notified++;
  }

  console.log(
    `[smart-fill] Done. appointment=${record.id} waitlisted=${waitlisted.length} notified=${notified}`,
  );

  return jsonResponse(200, {
    appointmentId: record.id,
    waitlisted: waitlisted.length,
    notified,
  });
});
