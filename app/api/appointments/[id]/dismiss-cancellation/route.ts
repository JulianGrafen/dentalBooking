import { NextResponse } from 'next/server';
import { requireOwnedAppointment } from '@/lib/server/appointment-auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireOwnedAppointment(id);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.appointment.status !== 'cancelled') {
    return NextResponse.json(
      { error: 'Nur abgesagte Termine können als geprüft markiert werden' },
      { status: 409 },
    );
  }

  const { error } = await auth.supabase
    .from('appointments')
    .update({ cancellation_notice_dismissed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('practice_id', auth.appointment.practice_id);

  if (error) {
    return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
