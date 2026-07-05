import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

/** Centered auth shell — login, register, MFA, unlock. */
export function AuthLayout({ children, title, description, className }: AuthLayoutProps) {
  return (
    <main
      className={cn(
        'flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10',
        className,
      )}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-lg shadow-primary/5 backdrop-blur-sm sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
