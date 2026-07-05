'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { registerSchema } from '@/lib/auth-schema';
import { redirectAfterAuth } from '@/lib/auth-redirect';
import { markOnboardingPending } from '@/lib/onboarding/storage';
import { generateKeyPair } from '@/lib/crypto';
import { downloadRecoveryKey, setPrivateKey } from '@/lib/practice-key';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [practiceName, setPracticeName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [pendingPrivateKey, setPendingPrivateKey] = useState<string | null>(null);
  const [recoveryDownloaded, setRecoveryDownloaded] = useState(false);
  const [registeredPracticeName, setRegisteredPracticeName] = useState('');

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

    const parsed = registerSchema.safeParse({ practiceName, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe');
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { practice_name: parsed.data.practiceName },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!authData.user) {
        setError('Registrierung fehlgeschlagen.');
        return;
      }

      if (!authData.session) {
        setError(
          'Bitte bestätigen Sie zuerst Ihre E-Mail. In Supabase können Sie die E-Mail-Bestätigung für die Entwicklung deaktivieren (Authentication → Providers → Email).',
        );
        return;
      }

      const keyPair = generateKeyPair();

      const { error: updateError } = await supabase
        .from('practices')
        .update({ public_key: keyPair.publicKey })
        .eq('id', authData.user.id);

      if (updateError) {
        setError('Public Key konnte nicht gespeichert werden: ' + updateError.message);
        return;
      }

      setPrivateKey(keyPair.privateKey);
      setPendingPrivateKey(keyPair.privateKey);
      setRegisteredPracticeName(parsed.data.practiceName);
      setRecoveryDownloaded(false);
      setRecoveryOpen(true);
    });
  }

  function handleDownloadRecovery() {
    if (!pendingPrivateKey) return;
    downloadRecoveryKey(pendingPrivateKey, registeredPracticeName);
    setRecoveryDownloaded(true);
  }

  function handleRecoveryComplete() {
    setRecoveryOpen(false);
    markOnboardingPending();
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await redirectAfterAuth(supabase, router);
    });
  }

  return (
    <>
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-8">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <p className="text-sm font-medium text-primary">teeth.al</p>
            <CardTitle>Praxis registrieren</CardTitle>
            <CardDescription>
              Ihr Private Key wird nur in diesem Browser gespeichert — niemals auf
              dem Server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="practiceName">Praxisname</Label>
                <Input
                  id="practiceName"
                  required
                  value={practiceName}
                  onChange={(event) => setPracticeName(event.target.value)}
                  placeholder="Zahnarztpraxis Dr. Müller"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Wird erstellt…' : 'Praxis anlegen'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Bereits registriert?{' '}
                <Link href="/login" className="text-primary underline">
                  Anmelden
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>

      <Dialog open={recoveryOpen} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recovery-Key sichern</DialogTitle>
            <DialogDescription>
              Laden Sie Ihren Private Key herunter. Wenn Sie diesen verlieren, sind
              Ihre verschlüsselten Patientendaten unwiederbringlich verloren — der
              Server kann sie nicht entschlüsseln.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            Der Private Key verlässt niemals Ihren Browser, außer in dieser
            Recovery-Datei, die Sie selbst speichern.
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              variant={recoveryDownloaded ? 'secondary' : 'default'}
              className="w-full"
              onClick={handleDownloadRecovery}
            >
              {recoveryDownloaded ? 'Erneut herunterladen' : 'Recovery-Key herunterladen'}
            </Button>
            <Button
              type="button"
              className="w-full"
              disabled={!recoveryDownloaded}
              onClick={handleRecoveryComplete}
            >
              Weiter zum Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
