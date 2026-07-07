'use client';

import { MfaGuard } from '@/components/auth/mfa-guard';
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider';

interface DashboardShellProps {
  children: React.ReactNode;
}

/** MFA (AAL2) → dashboard content + onboarding tour. */
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <MfaGuard>
      <OnboardingProvider>{children}</OnboardingProvider>
    </MfaGuard>
  );
}
