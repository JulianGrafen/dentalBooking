import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { isSupabaseConfigured } from '@/lib/supabase-config';

/**
 * Anonymous Supabase client for public server reads (booking page).
 * No cookies, no session — strictly the anon role + RLS.
 */
export function createSupabasePublicClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
