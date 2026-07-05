import { cn } from '@/lib/utils';

interface AppBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

/** Subtle medical-gradient backdrop used across all pages. */
export function AppBackground({ children, className }: AppBackgroundProps) {
  return (
    <div className={cn('relative min-h-full', className)}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-background"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-15%,rgba(15,76,129,0.14),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(45,107,163,0.06),transparent_40%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>
      {children}
    </div>
  );
}
