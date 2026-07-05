import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/** Shown when NEXT_PUBLIC_SUPABASE_* env vars are missing. */
export function SupabaseNotConfigured() {
  return (
    <Card className="w-full max-w-md border-amber-500/40 bg-amber-50/50">
      <CardHeader>
        <CardTitle>Supabase nicht konfiguriert</CardTitle>
        <CardDescription>
          Die UI ist erreichbar, aber Login und Registrierung brauchen ein
          Supabase-Projekt. Tragen Sie URL und Anon-Key in{' '}
          <code className="text-xs">.env.local</code> ein und starten Sie den
          Dev-Server neu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}
        </pre>
        <p>
          Werte finden Sie unter{' '}
          <a
            href="https://supabase.com/dashboard"
            className="text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            supabase.com/dashboard
          </a>{' '}
          → Project Settings → API.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Zur Startseite</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
