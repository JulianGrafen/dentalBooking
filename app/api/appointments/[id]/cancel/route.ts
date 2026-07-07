import { NextResponse } from 'next/server';
import { cancelAppointmentSchema } from '@/lib/appointment-manage-schema';
import { buildCancellationEmail } from '@/lib/appointment-notifications';
import { sendEmail, type SendEmailResult } from '@/lib/email/send-email';
import { requireOwnedAppointment } from '@/lib/server/appointment-auth';
import {
  createPublicWaitlistToken,
  hashPublicWaitlistToken,
} from '@/lib/server/public-cancel-token';
import { sendWaitlistOfferEmail } from '@/lib/server/waitlist-offer-email';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireOwnedAppointment(id);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.appointment.status === 'cancelled') {
    return NextResponse.json({ error: 'Termin ist bereits storniert' }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const parsed = cancelAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, start_time, end_time, status')
    .single();

  if (updateError || !updated) {
    console.error('[cancel] update failed:', updateError?.message);
    return NextResponse.json({ error: 'Stornierung fehlgeschlagen' }, { status: 500 });
  }

  let emailResult: SendEmailResult = { sent: false, mode: 'simulated' };
  try {
    emailResult = await sendEmail(
      buildCancellationEmail({
        patientName: parsed.data.patientName,
        patientEmail: parsed.data.patientEmail,
        practiceName: auth.practiceName,
        treatment: parsed.data.treatment,
        startTime: auth.appointment.start_time,
        endTime: auth.appointment.end_time,
        reason: parsed.data.reason,
      }),
    );
  } catch (error) {
    console.error('[cancel] email failed:', error);
    const message =
      error instanceof Error ? error.message : 'E-Mail konnte nicht gesendet werden';
    return NextResponse.json(
      {
        error: `Termin storniert, aber ${message}`,
        appointment: updated,
      },
      { status: 502 },
    );
  }

  const waitlistToken = createPublicWaitlistToken();
  let waitlistEmailResult: SendEmailResult | null = null;
  const { data: waitlistOffers, error: waitlistOfferError } = await auth.supabase.rpc(
    'offer_public_waitlist_for_slot',
    {
      target_practice_id: auth.appointment.practice_id,
      freed_start_time: auth.appointment.start_time,
      freed_end_time: auth.appointment.end_time,
      new_offer_token_hash: hashPublicWaitlistToken(waitlistToken),
    },
  );

  if (waitlistOfferError) {
    console.error('[cancel] waitlist offer failed:', waitlistOfferError.message);
  }

  const waitlistOffer = waitlistOffers?.[0];
  if (waitlistOffer) {
    try {
      waitlistEmailResult = await sendWaitlistOfferEmail(
        {
          practiceName: waitlistOffer.practice_name,
          patientEmail: waitlistOffer.patient_email,
          treatmentLabel: waitlistOffer.treatment_label,
          startTime: waitlistOffer.start_time,
          endTime: waitlistOffer.end_time,
        },
        new URL(request.url).origin,
        waitlistToken,
      );
    } catch (error) {
      console.error('[cancel] waitlist email failed:', error);
    }
  }

  return NextResponse.json({
    appointment: updated,
    email: emailResult,
    waitlistEmail: waitlistEmailResult,
  });
}
