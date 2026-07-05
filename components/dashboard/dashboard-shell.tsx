'use client';

import { MfaGuard } from '@/components/auth/mfa-guard';
import { UnlockGuard } from '@/components/auth/unlock-guard';
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider';

interface DashboardShellProps {
  children: React.ReactNode;
}

/** MFA (AAL2) → E2EE unlock → dashboard content + onboarding tour. */
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <MfaGuard>
      <UnlockGuard>
        <OnboardingProvider>{children}</OnboardingProvider>
      </UnlockGuard>
    </MfaGuard>
  );
}
