/**
 * recall-engine — daily patient recall.
 *
 * Invoked by pg_cron (see migration 20260705000002). Finds all patients
 * whose last_visit_date is exactly RECALL_INTERVAL_MONTHS in the past
 * and sends them a recall email (simulated via console.log for the MVP).
 *
 * Security: runs with the service role (cross-tenant system job, bypasses
 * RLS by design). Invocation is gated by the X-Cron-Secret header, since
 * the platform-level JWT check only proves possession of the public anon key.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildRecallEmail,
  computeRecallTargetDate,
  type RecallPatient,
} from './recall-logic.ts';

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('RECALL_CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const targetDate = computeRecallTargetDate(new Date());

  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, practice_id, name, email, last_visit_date')
    .eq('last_visit_date', targetDate)
    .returns<RecallPatient[]>();

  if (error) {
    console.error('[recall-engine] patient query failed:', error.message);
    return jsonResponse(500, { error: 'Failed to query recall patients' });
  }

  let sent = 0;
  let skippedNoEmail = 0;

  for (const patient of patients) {
    const email = buildRecallEmail(patient);
    if (!email) {
      skippedNoEmail++;
      console.warn(
        `[recall-engine] Patient ${patient.id} is due for recall but has no email address.`,
      );
      continue;
    }

    // MVP: simulated send. Replace with a real email provider (e.g. Resend) later.
    console.log(
      `[recall-engine] EMAIL -> ${email.to} | ${email.subject}\n${email.body}`,
    );
    sent++;
  }

  console.log(
    `[recall-engine] Done. targetDate=${targetDate} due=${patients.length} sent=${sent} skipped=${skippedNoEmail}`,
  );

  return jsonResponse(200, { targetDate, due: patients.length, sent, skippedNoEmail });
});
