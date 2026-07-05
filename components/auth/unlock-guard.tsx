'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasPrivateKey } from '@/lib/practice-key';

interface UnlockGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side gate: the private key lives in localStorage and is invisible
 * to the server/proxy. Redirects to /unlock when the practice browser
 * has not yet loaded its key.
 */
export function UnlockGuard({ children }: UnlockGuardProps) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (hasPrivateKey()) {
      setUnlocked(true);
      return;
    }
    router.replace('/unlock');
  }, [router]);

  if (!unlocked) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Praxis wird entsperrt…
      </p>
    );
  }

  return children;
}
