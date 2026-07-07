import { createSupabasePublicClient } from '@/utils/supabase/public';

/**
 * Returns whether slot-specific waitlist RPCs are deployed on the connected database.
 * Probes with an invalid token hash — a deployed function rejects the hash;
 * a missing function yields PostgREST PGRST202.
 */
export async function isWaitlistBookingAvailable(): Promise<boolean> {
  try {
    const supabase = createSupabasePublicClient();
    const { error } = await supabase.rpc('get_public_waitlist_offer', {
      waitlist_token_hash: '0'.repeat(64),
    });

    if (!error) return true;

    const message = error.message.toLowerCase();
    return (
      !message.includes('could not find the function') && !message.includes('schema cache')
    );
  } catch {
    return false;
  }
}
