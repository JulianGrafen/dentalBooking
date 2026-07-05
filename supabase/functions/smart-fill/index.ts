/**
 * smart-fill — refills short-notice cancellations from the waitlist.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  type AppointmentRecord,
  processSmartFillWebhook,
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const result = await processSmartFillWebhook(record, old_record, {
    listWaitlistedPatients: async (practiceId) => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, email, phone')
        .eq('practice_id', practiceId)
        .eq('is_waitlisted', true)
        .returns<WaitlistedPatient[]>();

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    sendOffer: async (offer) => {
      console.log(`[smart-fill] EMAIL -> ${offer.to} | ${offer.subject}\n${offer.body}`);
    },
  });

  if (result.action === 'skipped') {
    return jsonResponse(200, { skipped: result.reason });
  }

  console.log(
    `[smart-fill] Done. appointment=${result.appointmentId} waitlisted=${result.waitlisted} notified=${result.notified}`,
  );

  return jsonResponse(200, {
    appointmentId: result.appointmentId,
    waitlisted: result.waitlisted,
    notified: result.notified,
  });
});

// Re-export for tests that assert on window constant
export { SMART_FILL_WINDOW_HOURS };
