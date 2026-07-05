import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">teeth.al</p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Praxis-Management für Zahnärzte
        </h1>
        <p className="max-w-md text-muted-foreground">
          Online-Terminbuchung, automatischer Prophylaxe-Recall und Smart-Fill für
          kurzfristige Terminlücken.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/login">Zum Praxis-Login</Link>
      </Button>
    </main>
  );
}
