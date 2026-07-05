import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PracticeNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium text-primary">teeth.al</p>
      <h1 className="text-2xl font-semibold tracking-tight">Praxis nicht gefunden</h1>
      <p className="max-w-sm text-muted-foreground">
        Unter diesem Link ist keine Praxis erreichbar. Bitte prüfen Sie den
        Buchungslink, den Sie erhalten haben.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Zur Startseite</Link>
      </Button>
    </main>
  );
}
