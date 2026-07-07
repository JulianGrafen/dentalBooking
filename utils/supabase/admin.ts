import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { isSupabaseConfigured } from '@/lib/supabase-config';

export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Service-role client — bypasses RLS for trusted server-side waitlist processing. */
export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY fehlt');
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
