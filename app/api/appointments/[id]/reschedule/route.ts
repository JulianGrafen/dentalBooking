import { NextResponse } from 'next/server';
import { rescheduleAppointmentSchema } from '@/lib/appointment-manage-schema';
import { buildRescheduleEmail } from '@/lib/appointment-notifications';
import {
  appointmentDurationMinutes,
  buildSlotTimes,
  isFutureSlot,
} from '@/lib/appointment-times';
import { sendEmail, type SendEmailResult } from '@/lib/email/send-email';
import { requireOwnedAppointment } from '@/lib/server/appointment-auth';

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
    return NextResponse.json(
      { error: 'Stornierte Termine können nicht verschoben werden' },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const parsed = rescheduleAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' },
      { status: 400 },
    );
  }

  const durationMinutes = appointmentDurationMinutes(
    auth.appointment.start_time,
    auth.appointment.end_time,
  );
  const { start_time, end_time } = buildSlotTimes(
    parsed.data.date,
    parsed.data.timeSlot,
    durationMinutes,
  );

  if (!isFutureSlot(start_time)) {
    return NextResponse.json(
      { error: 'Der neue Termin muss in der Zukunft liegen' },
      { status: 400 },
    );
  }

  const previousStartTime = auth.appointment.start_time;
  const previousEndTime = auth.appointment.end_time;

  const { data: updated, error: updateError } = await auth.supabase
    .from('appointments')
    .update({ start_time, end_time })
    .eq('id', id)
    .select('id, start_time, end_time, status')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Verschiebung fehlgeschlagen' }, { status: 500 });
  }

  let emailResult: SendEmailResult = { sent: false, mode: 'simulated' };
  try {
    emailResult = await sendEmail(
      buildRescheduleEmail({
        patientName: parsed.data.patientName,
        patientEmail: parsed.data.patientEmail,
        practiceName: auth.practiceName,
        treatment: parsed.data.treatment,
        startTime: start_time,
        endTime: end_time,
        previousStartTime,
        previousEndTime,
      }),
    );
  } catch (error) {
    console.error('[reschedule] email failed:', error);
    return NextResponse.json(
      {
        error: 'Termin verschoben, aber E-Mail konnte nicht gesendet werden',
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
