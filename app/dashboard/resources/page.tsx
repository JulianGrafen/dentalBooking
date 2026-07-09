import { redirect } from 'next/navigation';
import { getCurrentPracticeContext } from '@/lib/server/current-practice';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { PracticeResourcesSettings } from '@/components/settings/practice-resources-settings';

export default async function ResourcesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <SupabaseNotConfigured />
      </main>
    );
  }

  const context = await getCurrentPracticeContext();
  if (!context) redirect('/login');

  const { practice, role } = context;
  const canEdit = role === 'owner';

  return (
    <main className={`${uiClasses.pageContainer} max-w-3xl`}>
      <header className="mb-8 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Praxis-Ausstattung
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Ressourcen</h1>
        <p className="text-muted-foreground">
          Stühle, Räume und Geräte für {practice.name} — Behandlungen können eine
          Ressource verpflichtend belegen.
        </p>
      </header>

      <PracticeResourcesSettings practiceId={practice.id} canEdit={canEdit} />
    </main>
  );
}
