import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { ACTIVE_PRACTICE_COOKIE } from '@/lib/practice-selection';
import type { PracticeRole } from '@/types/database';

interface CurrentPractice {
  id: string;
  name: string;
  slug: string;
}

export interface CurrentPracticeContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  practice: CurrentPractice;
  role: PracticeRole;
}

export async function getCurrentPracticeContext(): Promise<CurrentPracticeContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const cookieStore = await cookies();
  const activePracticeId = cookieStore.get(ACTIVE_PRACTICE_COOKIE)?.value;

  let membershipQuery = supabase
    .from('practice_members')
    .select('practice_id, role')
    .eq('user_id', user.id);

  if (activePracticeId) {
    membershipQuery = membershipQuery.eq('practice_id', activePracticeId);
  }

  let { data: memberships } = await membershipQuery
    .order('role', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);

  if (!memberships?.[0] && activePracticeId) {
    const fallback = await supabase
      .from('practice_members')
      .select('practice_id, role')
      .eq('user_id', user.id)
      .order('role', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);
    memberships = fallback.data;
  }

  const membership = memberships?.[0];
  if (!membership) return null;

  const { data: practice } = await supabase
    .from('practices')
    .select('id, name, slug')
    .eq('id', membership.practice_id)
    .single();

  if (!practice) return null;

  return {
    supabase,
    userId: user.id,
    practice,
    role: membership.role,
  };
}
