import { NextResponse } from 'next/server';
import { confirmAppointmentSchema } from '@/lib/appointment-manage-schema';
import { buildConfirmationEmail } from '@/lib/appointment-notifications';
import { sendEmail, type SendEmailResult } from '@/lib/email/send-email';
import { requireOwnedAppointment } from '@/lib/server/appointment-auth';
import {
  buildPublicCancelUrl,
  createPublicCancelToken,
  hashPublicCancelToken,
} from '@/lib/server/public-cancel-token';

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

  if (auth.appointment.status === 'booked') {
    return NextResponse.json({ error: 'Termin ist bereits bestätigt' }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const parsed = confirmAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' },
      { status: 400 },
    );
  }

  const cancelToken = createPublicCancelToken();
  const requestOrigin = new URL(request.url).origin;

  const { data: updatedRows, error: updateError } = await auth.supabase.rpc(
    'confirm_practice_appointment',
    {
      target_appointment_id: id,
      target_resource_id: parsed.data.resourceId ?? null,
      cancel_token_hash: hashPublicCancelToken(cancelToken),
    },
  );
  const updated = updatedRows?.[0];

  if (updateError || !updated) {
    const message = updateError?.message ?? 'Bestätigung fehlgeschlagen';
    const isRoomConflict = message.toLowerCase().includes('room resource is not available');
    return NextResponse.json(
      {
        error: isRoomConflict
          ? 'Der ausgewählte Raum ist zu dieser Zeit bereits belegt.'
          : 'Bestätigung fehlgeschlagen',
      },
      { status: isRoomConflict ? 409 : 500 },
    );
  }

  let emailResult: SendEmailResult = { sent: false, mode: 'simulated' };
  try {
    emailResult = await sendEmail(
      buildConfirmationEmail({
        patientName: parsed.data.patientName,
        patientEmail: parsed.data.patientEmail,
        practiceName: auth.practiceName,
        treatment: parsed.data.treatment,
        startTime: auth.appointment.start_time,
        endTime: auth.appointment.end_time,
        cancellationUrl: buildPublicCancelUrl(requestOrigin, cancelToken),
      }),
    );
  } catch (error) {
    console.error('[confirm] email failed:', error);
    const message =
      error instanceof Error ? error.message : 'E-Mail konnte nicht gesendet werden';
    return NextResponse.json(
      {
        error: `Termin bestätigt, aber ${message}`,
        appointment: updated,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    appointment: updated,
    email: emailResult,
  });
}
