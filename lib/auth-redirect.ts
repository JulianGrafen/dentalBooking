import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { SupabaseClient } from '@supabase/supabase-js';
import { needsMfaVerification } from '@/lib/mfa';
import { hasPrivateKey } from '@/lib/practice-key';

/**
 * Post-authentication navigation: MFA gate → E2EE unlock gate → dashboard.
 * Single entry point so login, register and MFA verify stay in sync.
 */
export async function redirectAfterAuth(
  supabase: SupabaseClient,
  router: AppRouterInstance,
): Promise<void> {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (needsMfaVerification(aal)) {
    router.push('/login/mfa');
    router.refresh();
    return;
  }

  router.push(hasPrivateKey() ? '/dashboard' : '/unlock');
  router.refresh();
}
