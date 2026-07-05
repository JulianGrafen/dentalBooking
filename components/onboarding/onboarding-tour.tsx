'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';
import type { OnboardingStep } from '@/lib/onboarding/steps';
import { uiClasses } from '@/lib/ui-classes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface OnboardingTourProps {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  navigating: boolean;
  autoDelayMs: number;
  onSkip: () => void;
}

const SPOTLIGHT_PADDING = 10;

function getTooltipStyle(
  rect: DOMRect | null,
  placement: OnboardingStep['placement'],
): React.CSSProperties {
  if (!rect || placement === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(420px, calc(100vw - 2rem))',
    };
  }

  const centerX = rect.left + rect.width / 2;
  const gap = 16;

  if (placement === 'bottom') {
    return {
      top: rect.bottom + gap + SPOTLIGHT_PADDING,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(400px, calc(100vw - 2rem))',
    };
  }

  if (placement === 'top') {
    return {
      bottom: window.innerHeight - rect.top + gap + SPOTLIGHT_PADDING,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(400px, calc(100vw - 2rem))',
    };
  }

  return {
    top: rect.top + rect.height / 2,
    left: centerX,
    transform: 'translate(-50%, -50%)',
    width: 'min(400px, calc(100vw - 2rem))',
  };
}

export function OnboardingTour({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  navigating,
  autoDelayMs,
  onSkip,
}: OnboardingTourProps) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const Icon = step.icon;
  const isCentered = !step.target || step.placement === 'center';

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setProgress(0);
    const started = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const elapsed = now - started;
      setProgress(Math.min(100, (elapsed / autoDelayMs) * 100));
      if (elapsed < autoDelayMs) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step.id, autoDelayMs, navigating]);

  if (!mounted) return null;

  const spotlightStyle: React.CSSProperties | undefined = targetRect
    ? {
        top: targetRect.top - SPOTLIGHT_PADDING,
        left: targetRect.left - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
      }
    : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[200]" aria-live="polite" role="dialog" aria-modal="true">
      {(isCentered || navigating || !targetRect) && (
        <div
          className={cn(
            'absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] transition-opacity duration-300',
            navigating && 'opacity-90',
          )}
          aria-hidden
        />
      )}

      {spotlightStyle && !navigating && !isCentered && (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-primary ring-offset-2 ring-offset-transparent transition-all duration-300"
          style={{
            ...spotlightStyle,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
          }}
        />
      )}

      <div
        className={cn(
          'fixed z-[201] transition-all duration-300',
          navigating && 'opacity-0',
        )}
        style={getTooltipStyle(isCentered ? null : targetRect, step.placement ?? 'bottom')}
      >
        <article className={cn(uiClasses.glassCard, 'overflow-hidden shadow-2xl shadow-primary/15')}>
          <div className="relative border-b border-border/60 bg-gradient-to-br from-primary/8 via-card to-card px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-2 text-muted-foreground"
              onClick={onSkip}
              aria-label="Tour überspringen"
            >
              <X className="size-4" />
            </Button>

            <div className="flex items-start gap-3 pr-8">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <Icon className="size-5" strokeWidth={2} />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                  Schritt {stepIndex + 1} von {totalSteps}
                </p>
                <h2 className="text-lg font-semibold tracking-tight">{step.title}</h2>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              {navigating ? 'Wechsle Ansicht…' : 'Tour läuft automatisch weiter'}
            </div>

            <div className="space-y-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[#2d6ba3] transition-[width] duration-100 ease-linear"
                  style={{ width: `${navigating ? 0 : progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        'size-1.5 rounded-full transition-colors',
                        index === stepIndex ? 'bg-primary' : 'bg-border',
                        index < stepIndex && 'bg-primary/40',
                      )}
                    />
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onSkip}>
                  Überspringen
                </Button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>,
    document.body,
  );
}
