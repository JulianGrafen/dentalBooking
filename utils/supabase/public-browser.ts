'use client';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Browser client for public booking flows — always uses the anon role.
 * Unlike createSupabaseBrowserClient(), this ignores any logged-in session
 * so practice staff can test their booking link without RPC permission errors.
 */
export function createSupabasePublicBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
