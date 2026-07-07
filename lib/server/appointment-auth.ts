import { createSupabaseServerClient } from '@/utils/supabase/server';

interface OwnedAppointment {
  id: string;
  practice_id: string;
  start_time: string;
  end_time: string;
  status: 'booked' | 'cancelled' | 'pending';
}

type AuthSuccess = {
  ok: true;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  appointment: OwnedAppointment;
  practiceName: string;
};

type AuthFailure = {
  ok: false;
  status: number;
  error: string;
};

export async function requireOwnedAppointment(
  appointmentId: string,
): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: 'Nicht angemeldet' };
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .select('id, practice_id, start_time, end_time, status')
    .eq('id', appointmentId)
    .maybeSingle();

  if (error || !appointment) {
    return { ok: false, status: 404, error: 'Termin nicht gefunden' };
  }

  const { data: membership } = await supabase
    .from('practice_members')
    .select('practice_id')
    .eq('practice_id', appointment.practice_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return { ok: false, status: 403, error: 'Kein Zugriff auf diesen Termin' };
  }

  const { data: practice } = await supabase
    .from('practices')
    .select('name')
    .eq('id', appointment.practice_id)
    .single();

  return {
    ok: true,
    supabase,
    appointment,
    practiceName: practice?.name ?? 'Ihre Zahnarztpraxis',
  };
}
