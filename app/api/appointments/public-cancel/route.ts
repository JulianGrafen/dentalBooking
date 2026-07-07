import { NextResponse } from 'next/server';
import {
  createPublicWaitlistToken,
  hashPublicCancelToken,
  hashPublicWaitlistToken,
  isPublicCancelToken,
} from '@/lib/server/public-cancel-token';
import { sendWaitlistOfferEmail } from '@/lib/server/waitlist-offer-email';
import { processWaitlistOfferForSlot } from '@/lib/server/process-waitlist-offer';
import { createSupabasePublicClient } from '@/utils/supabase/public';

interface CancelPublicAppointmentRow {
  practice_id?: string;
  practice_name: string;
  start_time: string;
  end_time: string;
  status: string;
  waitlist_entry_id?: string | null;
  waitlist_patient_email?: string | null;
  waitlist_treatment_label?: string | null;
  waitlist_start_time?: string | null;
  waitlist_end_time?: string | null;
}

function isMissingRpcError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('could not find the function') || normalized.includes('schema cache');
}

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
  const origin = new URL(request.url).origin;
  const waitlistToken = createPublicWaitlistToken();
  const cancelTokenHash = hashPublicCancelToken(token);

  let appointment: CancelPublicAppointmentRow | null = null;

  const cancelWithWaitlist = await supabase.rpc('cancel_public_appointment', {
    cancel_token_hash: cancelTokenHash,
    waitlist_offer_token_hash: hashPublicWaitlistToken(waitlistToken),
  });

  if (cancelWithWaitlist.error && isMissingRpcError(cancelWithWaitlist.error.message)) {
    const legacyCancel = await supabase.rpc('cancel_public_appointment', {
      cancel_token_hash: cancelTokenHash,
    });

    if (legacyCancel.error) {
      console.error('[public-cancel] failed:', legacyCancel.error.message);
      return NextResponse.json({ error: 'Termin konnte nicht abgesagt werden' }, { status: 500 });
    }

    appointment = (Array.isArray(legacyCancel.data) ? legacyCancel.data[0] : legacyCancel.data) as
      | CancelPublicAppointmentRow
      | null;
  } else if (cancelWithWaitlist.error) {
    console.error('[public-cancel] failed:', cancelWithWaitlist.error.message);
    return NextResponse.json({ error: 'Termin konnte nicht abgesagt werden' }, { status: 500 });
  } else {
    appointment = (
      Array.isArray(cancelWithWaitlist.data) ? cancelWithWaitlist.data[0] : cancelWithWaitlist.data
    ) as CancelPublicAppointmentRow | null;
  }

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
        origin,
        waitlistToken,
      );
    } catch (emailError) {
      console.error('[public-cancel] waitlist email failed:', emailError);
    }
  } else if (appointment.practice_id) {
    const waitlistResult = await processWaitlistOfferForSlot(
      {
        practiceId: appointment.practice_id,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
      },
      origin,
    );

    if (waitlistResult.error) {
      console.error('[public-cancel] waitlist fallback failed:', waitlistResult.error);
    }
  }

  return NextResponse.json({ appointment });
}
