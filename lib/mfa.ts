import type { AuthenticatorAssuranceLevels, AuthMFAGetAuthenticatorAssuranceLevelResponse } from '@supabase/supabase-js';

type AalData = AuthMFAGetAuthenticatorAssuranceLevelResponse['data'];

/** True when the session must complete a TOTP challenge before accessing the app. */
export function needsMfaVerification(aal: AalData): boolean {
  if (!aal?.currentLevel || !aal?.nextLevel) return false;
  return aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2';
}

/** Normalises user input to a 6-digit TOTP code. */
export function normalizeTotpCode(input: string): string {
  return input.replace(/\s/g, '').slice(0, 6);
}
