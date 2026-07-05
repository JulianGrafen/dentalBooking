'use client';

import { UnlockGuard } from '@/components/auth/unlock-guard';

interface DashboardShellProps {
  children: React.ReactNode;
}

/** Wraps authenticated dashboard content behind the E2EE unlock gate. */
export function DashboardShell({ children }: DashboardShellProps) {
  return <UnlockGuard>{children}</UnlockGuard>;
}
