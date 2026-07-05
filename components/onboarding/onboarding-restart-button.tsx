'use client';

import { Sparkles } from 'lucide-react';
import { useOnboarding } from '@/components/onboarding/onboarding-provider';
import { resetOnboarding } from '@/lib/onboarding/storage';
import { Button } from '@/components/ui/button';

export function OnboardingRestartButton() {
  const { startTour } = useOnboarding();

  function handleRestart() {
    resetOnboarding();
    startTour();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2 bg-card/80"
      onClick={handleRestart}
    >
      <Sparkles className="size-4" />
      Tour erneut starten
    </Button>
  );
}
