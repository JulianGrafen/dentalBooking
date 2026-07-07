import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function BookingNotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Buchungsseite nicht gefunden</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Dieser Buchungslink ist ungültig oder die Online-Buchung wurde für diese Praxis
        noch nicht eingerichtet (Verschlüsselungs-Schlüssel fehlt).
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Zur Startseite</Link>
      </Button>
    </main>
  );
}
