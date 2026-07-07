import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { SupabaseClient } from '@supabase/supabase-js';
import { needsMfaVerification } from '@/lib/mfa';

/**
 * Post-authentication navigation: MFA gate → dashboard.
 * Single entry point so login, register and MFA verify stay in sync.
 *
 * The E2EE recovery key is no longer a login requirement. It is only needed
 * when this browser must restore access to encrypted patient data.
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

  router.push('/dashboard');
  router.refresh();
}
