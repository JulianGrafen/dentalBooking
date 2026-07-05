import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: readonly string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Fortschritt" className="mb-2">
      <ol className="flex items-center gap-0">
        {steps.map((label, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                    isComplete && 'bg-primary text-primary-foreground shadow-sm shadow-primary/30',
                    isCurrent &&
                      'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-sm',
                    !isComplete &&
                      !isCurrent &&
                      'border border-border bg-muted text-muted-foreground',
                  )}
                >
                  {isComplete ? '✓' : index + 1}
                </span>
                <span
                  className={cn(
                    'hidden truncate text-[10px] font-medium uppercase tracking-wide sm:block',
                    isCurrent ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  aria-hidden
                  className={cn(
                    'mx-1 h-0.5 flex-1 rounded-full transition-colors duration-300',
                    index < currentStep ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
