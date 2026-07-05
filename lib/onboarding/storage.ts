/** localStorage keys for onboarding state (browser only). */

const COMPLETED_KEY = 'teeth-al-onboarding-v1-completed';
const PENDING_KEY = 'teeth-al-onboarding-v1-pending';

export function isOnboardingCompleted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(COMPLETED_KEY) === 'true';
}

export function shouldAutoStartOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  if (isOnboardingCompleted()) return false;
  // Explicit flag set on registration, or any user who has not finished the tour yet.
  return localStorage.getItem(PENDING_KEY) === 'true' || !isOnboardingCompleted();
}

export function markOnboardingPending(): void {
  localStorage.removeItem(COMPLETED_KEY);
  localStorage.setItem(PENDING_KEY, 'true');
}

export function markOnboardingCompleted(): void {
  localStorage.setItem(COMPLETED_KEY, 'true');
  localStorage.removeItem(PENDING_KEY);
}

export function resetOnboarding(): void {
  localStorage.removeItem(COMPLETED_KEY);
  localStorage.removeItem(PENDING_KEY);
}
