'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { redirectAfterAuth } from '@/lib/auth-redirect';
import { totpCodeSchema } from '@/lib/auth-schema';
import { needsMfaVerification, normalizeTotpCode } from '@/lib/mfa';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginMfaPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setChecking(false);
      return;
    }

    async function init() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!needsMfaVerification(aal)) {
        await redirectAfterAuth(supabase, router);
        return;
      }

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        setError('MFA-Faktoren konnten nicht geladen werden.');
        setChecking(false);
        return;
      }

      const verifiedTotp = factors.totp.find((factor) => factor.status === 'verified');
      if (!verifiedTotp) {
        router.replace('/dashboard/security');
        return;
      }

      setFactorId(verifiedTotp.id);
      setChecking(false);
    }

    init();
  }, [router]);

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <SupabaseNotConfigured />
      </main>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = totpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültiger Code');
      return;
    }

    if (!factorId) return;

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: parsed.data,
      });

      if (verifyError) {
        setError('Ungültiger Code. Bitte erneut versuchen.');
        return;
      }

      await redirectAfterAuth(supabase, router);
    });
  }

  if (checking) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Wird geladen…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <p className="text-sm font-medium text-primary">teeth.al</p>
          <CardTitle>Zwei-Faktor-Authentifizierung</CardTitle>
          <CardDescription>
            Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp">Authenticator-Code</Label>
              <Input
                id="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                className="text-center font-mono text-lg tracking-widest"
                value={code}
                onChange={(event) => setCode(normalizeTotpCode(event.target.value))}
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isPending || code.length !== 6}>
              {isPending ? 'Wird geprüft…' : 'Bestätigen'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary underline">
                Zurück zum Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
