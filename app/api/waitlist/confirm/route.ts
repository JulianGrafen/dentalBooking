import { NextResponse } from 'next/server';
import { buildConfirmationEmail } from '@/lib/appointment-notifications';
import { sendEmail, type SendEmailResult } from '@/lib/email/send-email';
import {
  buildPublicCancelUrl,
  createPublicCancelToken,
  hashPublicCancelToken,
  hashPublicWaitlistToken,
  isPublicWaitlistToken,
} from '@/lib/server/public-cancel-token';
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

  if (!isPublicWaitlistToken(token)) {
    return NextResponse.json({ error: 'Ungültiger Wartelisten-Link' }, { status: 400 });
  }

  const cancelToken = createPublicCancelToken();
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc('confirm_public_waitlist_offer', {
    waitlist_token_hash: hashPublicWaitlistToken(token),
    cancel_token_hash: hashPublicCancelToken(cancelToken),
  });

  if (error) {
    console.error('[waitlist-confirm] failed:', error.message);
    const message = error.message.toLowerCase().includes('appointment slot is no longer available')
      ? 'Der Termin ist leider nicht mehr verfügbar.'
      : 'Termin konnte nicht bestätigt werden.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const appointment = Array.isArray(data) ? data[0] : data;
  if (!appointment) {
    return NextResponse.json(
      { error: 'Dieser Wartelisten-Link ist ungültig, abgelaufen oder wurde bereits verwendet.' },
      { status: 404 },
    );
  }

  let emailResult: SendEmailResult = { sent: false, mode: 'simulated' };
  try {
    emailResult = await sendEmail(
      buildConfirmationEmail({
        patientName: 'Patient/in',
        patientEmail: appointment.patient_email,
        practiceName: appointment.practice_name,
        treatment: appointment.treatment_label,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        cancellationUrl: buildPublicCancelUrl(new URL(request.url).origin, cancelToken),
      }),
    );
  } catch (emailError) {
    console.error('[waitlist-confirm] confirmation email failed:', emailError);
  }

  return NextResponse.json({ appointment, email: emailResult });
}
