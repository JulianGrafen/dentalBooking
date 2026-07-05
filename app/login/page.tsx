'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { redirectAfterAuth } from '@/lib/auth-redirect';
import { loginSchema } from '@/lib/auth-schema';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <SupabaseNotConfigured />
      </main>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe');
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (signInError) {
        setError('Anmeldung fehlgeschlagen. Bitte prüfen Sie Ihre Zugangsdaten.');
        return;
      }

      await redirectAfterAuth(supabase, router);
    });
  }

  return (
    <AuthLayout
      title="Willkommen zurück"
      description="Melden Sie sich mit Ihrem Praxis-Konto an."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="h-11"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="h-11 w-full shadow-sm shadow-primary/20" disabled={isPending}>
          {isPending ? 'Anmeldung…' : 'Anmelden'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Noch kein Konto?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Praxis registrieren
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
