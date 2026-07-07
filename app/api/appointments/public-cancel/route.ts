import { NextResponse } from 'next/server';
import {
  createPublicWaitlistToken,
  hashPublicCancelToken,
  hashPublicWaitlistToken,
  isPublicCancelToken,
} from '@/lib/server/public-cancel-token';
import { sendWaitlistOfferEmail } from '@/lib/server/waitlist-offer-email';
import { createSupabasePublicClient } from '@/utils/supabase/public';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const rawToken =
    typeof body === 'object' && body !== null && 'token' in body
      ? (body as { token?: unknown }).token
      : null;
  const token = typeof rawToken === 'string' ? rawToken : null;

  if (!isPublicCancelToken(token)) {
    return NextResponse.json({ error: 'Ungültiger Absage-Link' }, { status: 400 });
  }

  const supabase = createSupabasePublicClient();
  const waitlistToken = createPublicWaitlistToken();
  const { data, error } = await supabase.rpc('cancel_public_appointment', {
    cancel_token_hash: hashPublicCancelToken(token),
    waitlist_offer_token_hash: hashPublicWaitlistToken(waitlistToken),
  });

  if (error) {
    console.error('[public-cancel] failed:', error.message);
    return NextResponse.json({ error: 'Termin konnte nicht abgesagt werden' }, { status: 500 });
  }

  const appointment = Array.isArray(data) ? data[0] : data;
  if (!appointment) {
    return NextResponse.json(
      { error: 'Dieser Absage-Link ist ungültig, abgelaufen oder der Termin wurde bereits abgesagt.' },
      { status: 404 },
    );
  }

  if (appointment.waitlist_entry_id && appointment.waitlist_patient_email) {
    try {
      await sendWaitlistOfferEmail(
        {
          practiceName: appointment.practice_name,
          patientEmail: appointment.waitlist_patient_email,
          treatmentLabel: appointment.waitlist_treatment_label ?? 'Behandlung',
          startTime: appointment.waitlist_start_time ?? appointment.start_time,
          endTime: appointment.waitlist_end_time ?? appointment.end_time,
        },
        new URL(request.url).origin,
        waitlistToken,
      );
    } catch (emailError) {
      console.error('[public-cancel] waitlist email failed:', emailError);
    }
  }

  return NextResponse.json({ appointment });
}
