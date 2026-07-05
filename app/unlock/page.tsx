'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { extractPrivateKey } from '@/lib/auth-schema';
import { redirectAfterAuth } from '@/lib/auth-redirect';
import { isValidPrivateKey, setPrivateKey } from '@/lib/practice-key';
import { MfaGuard } from '@/components/auth/mfa-guard';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function UnlockPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <SupabaseNotConfigured />
      </main>
    );
  }

  function processKey(raw: string) {
    const key = extractPrivateKey(raw);
    if (!isValidPrivateKey(key)) {
      setError('Ungültiger Private Key. Bitte laden Sie Ihre Recovery-Datei hoch oder fügen Sie den Base64-Key ein.');
      return;
    }

    setPrivateKey(key);
    router.push('/dashboard');
    router.refresh();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(() => {
      processKey(privateKeyInput);
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      setPrivateKeyInput(content);
      processKey(content);
    };
    reader.readAsText(file);
  }

  return (
    <MfaGuard>
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <p className="text-sm font-medium text-primary">teeth.al</p>
          <CardTitle>Praxis entsperren</CardTitle>
          <CardDescription>
            Auf diesem Gerät ist kein Private Key gespeichert. Laden Sie Ihre
            Recovery-Datei hoch oder fügen Sie den Key ein, um verschlüsselte
            Termine lesen zu können.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-file">Recovery-Datei</Label>
              <input
                ref={fileInputRef}
                id="recovery-file"
                type="file"
                accept=".txt,.key,text/plain"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="privateKey">oder Private Key einfügen</Label>
              <Textarea
                id="privateKey"
                rows={6}
                className="font-mono text-xs"
                placeholder="Base64 Private Key oder komplette Recovery-Datei…"
                value={privateKeyInput}
                onChange={(event) => setPrivateKeyInput(event.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Wird geprüft…' : 'Entsperren & zum Dashboard'}
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
    </MfaGuard>
  );
}
