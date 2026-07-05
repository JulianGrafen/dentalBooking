'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  DEFAULT_STEP_DELAY_MS,
  ONBOARDING_STEPS,
  type OnboardingStep,
} from '@/lib/onboarding/steps';
import {
  markOnboardingCompleted,
  shouldAutoStartOnboarding,
} from '@/lib/onboarding/storage';
import { OnboardingTour } from '@/components/onboarding/onboarding-tour';

interface OnboardingContextValue {
  active: boolean;
  startTour: () => void;
  skipTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function waitForElement(selector: string, timeoutMs = 5000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const started = Date.now();

    const check = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
      if (element) {
        resolve(element);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      requestAnimationFrame(check);
    };

    check();
  });
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [navigating, setNavigating] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoStartedRef = useRef(false);

  const step: OnboardingStep | null = active ? ONBOARDING_STEPS[stepIndex] ?? null : null;
  const totalSteps = ONBOARDING_STEPS.length;

  const finishTour = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    markOnboardingCompleted();
    setActive(false);
    setTargetRect(null);
    setNavigating(false);
  }, []);

  const skipTour = useCallback(() => {
    finishTour();
  }, [finishTour]);

  const startTour = useCallback(() => {
    hasAutoStartedRef.current = true;
    setStepIndex(0);
    setActive(true);
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
  }, [pathname, router]);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= ONBOARDING_STEPS.length) {
        finishTour();
        return;
      }
      setStepIndex(index);
      setTargetRect(null);
    },
    [finishTour],
  );

  const advanceStep = useCallback(() => {
    goToStep(stepIndex + 1);
  }, [goToStep, stepIndex]);

  // Auto-start once when the dashboard is ready (Strict Mode–safe).
  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    if (!pathname.startsWith('/dashboard')) return;
    if (!shouldAutoStartOnboarding()) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled || hasAutoStartedRef.current || !shouldAutoStartOnboarding()) return;
      hasAutoStartedRef.current = true;
      setActive(true);
      setStepIndex(0);
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname]);

  // Navigate + resolve spotlight target for current step
  useEffect(() => {
    if (!active || !step) return;

    let cancelled = false;

    async function syncStep() {
      if (pathname !== step!.route) {
        setNavigating(true);
        setTargetRect(null);
        router.push(step!.route);
        return;
      }

      setNavigating(false);

      if (!step!.target) {
        setTargetRect(null);
        return;
      }

      const element = await waitForElement(step!.target);
      if (cancelled) return;

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        await new Promise((resolve) => setTimeout(resolve, 350));
        if (!cancelled) {
          setTargetRect(element.getBoundingClientRect());
        }
      } else {
        setTargetRect(null);
      }
    }

    syncStep();

    return () => {
      cancelled = true;
    };
  }, [active, step, pathname, router]);

  // Keep spotlight aligned on scroll/resize
  useEffect(() => {
    if (!active || !step?.target) return;

    function updateRect() {
      const element = document.querySelector<HTMLElement>(`[data-tour="${step!.target}"]`);
      if (element) setTargetRect(element.getBoundingClientRect());
    }

    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [active, step]);

  // Auto-advance timer
  useEffect(() => {
    if (!active || !step || navigating) return;
    if (pathname !== step.route) return;

    const delay = step.autoDelayMs ?? DEFAULT_STEP_DELAY_MS;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);

    advanceTimerRef.current = setTimeout(() => {
      advanceStep();
    }, delay);

    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [active, step, navigating, pathname, advanceStep]);

  const contextValue = useMemo(
    () => ({ active, startTour, skipTour }),
    [active, startTour, skipTour],
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      {active && step && (
        <OnboardingTour
          step={step}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          targetRect={targetRect}
          navigating={navigating}
          autoDelayMs={step.autoDelayMs ?? DEFAULT_STEP_DELAY_MS}
          onSkip={skipTour}
        />
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
