'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { needsMfaVerification } from '@/lib/mfa';

interface MfaGuardProps {
  children: React.ReactNode;
}

/** Blocks protected UI until the Supabase session reaches AAL2 (TOTP verified). */
export function MfaGuard({ children }: MfaGuardProps) {
  const router = useRouter();
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data: aal }) => {
      if (needsMfaVerification(aal)) {
        router.replace('/login/mfa');
        return;
      }
      setPassed(true);
    });
  }, [router]);

  if (!passed) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sicherheitsprüfung…
      </p>
    );
  }

  return children;
}
