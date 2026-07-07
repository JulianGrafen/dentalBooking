import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { OnboardingRestartButton } from '@/components/onboarding/onboarding-restart-button';
import { TwoFactorSettings } from '@/components/settings/two-factor-settings';

export default async function SecurityPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <SupabaseNotConfigured />
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <header className="space-y-1">
          <div className="mb-2">
            <OnboardingRestartButton />
          </div>
          <p className="text-sm font-medium text-primary">teeth.al</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sicherheit</h1>
          <p className="text-muted-foreground">
            Kontosicherheit und Zwei-Faktor-Authentifizierung verwalten.
          </p>
        </header>

        <div data-tour="two-factor-settings">
          <TwoFactorSettings />
        </div>
      </main>
  );
}
