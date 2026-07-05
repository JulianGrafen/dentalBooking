'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import QRCode from 'qrcode';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { totpCodeSchema } from '@/lib/auth-schema';
import { normalizeTotpCode } from '@/lib/mfa';
import { Badge } from '@/components/ui/badge';
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

type EnrollStep = 'idle' | 'scan' | 'confirm-disable';

interface VerifiedFactor {
  id: string;
  friendlyName: string;
}

export function TwoFactorSettings() {
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState<VerifiedFactor | null>(null);
  const [step, setStep] = useState<EnrollStep>('idle');
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadFactors = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data, error: listError } = await supabase.auth.mfa.listFactors();

    if (listError) {
      setError('2FA-Status konnte nicht geladen werden.');
      setLoading(false);
      return;
    }

    const verified = data.totp.find((f) => f.status === 'verified');
    setFactor(
      verified
        ? { id: verified.id, friendlyName: verified.friendly_name ?? 'Authenticator' }
        : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  function startEnroll() {
    setError(null);
    setCode('');

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'teeth.al Authenticator',
      });

      if (enrollError || !data) {
        setError(enrollError?.message ?? '2FA konnte nicht gestartet werden.');
        return;
      }

      const uri = data.totp.uri;
      setPendingFactorId(data.id);
      setSecret(data.totp.secret);
      setQrDataUrl(await QRCode.toDataURL(uri, { width: 220, margin: 2 }));
      setStep('scan');
    });
  }

  function confirmEnroll() {
    setError(null);
    const parsed = totpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültiger Code');
      return;
    }
    if (!pendingFactorId) return;

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: pendingFactorId,
        code: parsed.data,
      });

      if (verifyError) {
        setError('Code ungültig. Prüfen Sie die Uhrzeit Ihrer Authenticator-App.');
        return;
      }

      setStep('idle');
      setPendingFactorId(null);
      setQrDataUrl(null);
      setSecret(null);
      setCode('');
      await loadFactors();
    });
  }

  function confirmDisable() {
    setError(null);
    const parsed = totpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültiger Code');
      return;
    }
    if (!factor) return;

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: parsed.data,
      });

      if (verifyError) {
        setError('Code ungültig.');
        return;
      }

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });

      if (unenrollError) {
        setError('2FA konnte nicht deaktiviert werden.');
        return;
      }

      setStep('idle');
      setCode('');
      setFactor(null);
    });
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">2FA-Status wird geladen…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Zwei-Faktor-Authentifizierung (2FA)</CardTitle>
          <Badge variant={factor ? 'default' : 'secondary'}>
            {factor ? 'Aktiv' : 'Inaktiv'}
          </Badge>
        </div>
        <CardDescription>
          Schützen Sie Ihr Praxis-Konto mit TOTP (Google Authenticator, 1Password, Authy).
          Unabhängig vom E2EE Private Key — schützt den Login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {step === 'idle' && !factor && (
          <Button onClick={startEnroll} disabled={isPending}>
            {isPending ? 'Wird vorbereitet…' : '2FA aktivieren'}
          </Button>
        )}

        {step === 'idle' && factor && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Faktor: <span className="font-medium text-foreground">{factor.friendlyName}</span>
            </p>
            <Button variant="destructive" onClick={() => { setStep('confirm-disable'); setCode(''); setError(null); }}>
              2FA deaktivieren
            </Button>
          </div>
        )}

        {step === 'scan' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scannen Sie den QR-Code mit Ihrer Authenticator-App und geben Sie den Code ein.
            </p>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="TOTP QR-Code" className="mx-auto rounded-lg border" />
            )}
            {secret && (
              <p className="break-all text-center font-mono text-xs text-muted-foreground">
                Manuell: {secret}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="enroll-code">Bestätigungscode</Label>
              <Input
                id="enroll-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="font-mono tracking-widest"
                value={code}
                onChange={(event) => setCode(normalizeTotpCode(event.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (pendingFactorId) {
                    const supabase = createSupabaseBrowserClient();
                    void supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
                  }
                  setStep('idle');
                  setPendingFactorId(null);
                  setQrDataUrl(null);
                  setSecret(null);
                  setCode('');
                }}
                disabled={isPending}
              >
                Abbrechen
              </Button>
              <Button onClick={confirmEnroll} disabled={isPending || code.length !== 6}>
                {isPending ? 'Wird aktiviert…' : '2FA aktivieren'}
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm-disable' && factor && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Geben Sie einen aktuellen Authenticator-Code ein, um 2FA zu deaktivieren.
            </p>
            <div className="space-y-2">
              <Label htmlFor="disable-code">Authenticator-Code</Label>
              <Input
                id="disable-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="font-mono tracking-widest"
                value={code}
                onChange={(event) => setCode(normalizeTotpCode(event.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('idle')} disabled={isPending}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={confirmDisable} disabled={isPending || code.length !== 6}>
                {isPending ? 'Wird deaktiviert…' : '2FA deaktivieren'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
