'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Users } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { ACTIVE_PRACTICE_COOKIE } from '@/lib/practice-selection';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AcceptInviteCardProps {
  token: string | null;
}

const ACTIVE_PRACTICE_MAX_AGE = 60 * 60 * 24 * 365;

export function AcceptInviteCard({ token }: AcceptInviteCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'accepted' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    if (!token) {
      setStatus('error');
      setMessage('Einladungslink ist ungültig.');
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus('error');
        setMessage('Bitte melden Sie sich mit der eingeladenen E-Mail an und öffnen Sie den Link erneut.');
        return;
      }

      const { data, error } = await supabase.rpc('accept_practice_invite', {
        invite_token: token,
      });

      if (error || !data?.[0]) {
        setStatus('error');
        setMessage(error?.message ?? 'Einladung konnte nicht angenommen werden.');
        return;
      }

      document.cookie = `${ACTIVE_PRACTICE_COOKIE}=${data[0].practice_id}; path=/; max-age=${ACTIVE_PRACTICE_MAX_AGE}; SameSite=Lax`;
      setStatus('accepted');
      setMessage('Kalender-Zugang aktiviert. Sie werden zum Dashboard weitergeleitet.');
      router.refresh();
      setTimeout(() => router.push('/dashboard/calendar'), 900);
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {status === 'accepted' ? <CheckCircle2 className="size-6" /> : <Users className="size-6" />}
        </div>
        <CardTitle>Kalender-Zugang annehmen</CardTitle>
        <CardDescription>
          Akzeptieren Sie die Einladung, um den Praxis-Kalender zu verwalten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <p className={status === 'error' ? 'text-sm text-destructive' : 'text-sm text-emerald-600'}>
            {message}
          </p>
        )}

        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
          Hinweis: Für verschlüsselte Patientendaten benötigen Sie zusätzlich den
          Praxis-Recovery-Key. Dieser sollte separat und sicher übergeben werden.
        </div>

        <Button className="w-full" onClick={handleAccept} disabled={isPending || status === 'accepted'}>
          {isPending ? 'Wird angenommen…' : 'Einladung annehmen'}
        </Button>

        <div className="flex justify-center gap-4 text-sm">
          <Link href="/login" className="text-primary underline">
            Login
          </Link>
          <Link href="/register" className="text-primary underline">
            Registrieren
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
