/** Shared Tailwind class strings — single source for visual consistency. */
export const uiClasses = {
  glassCard:
    'rounded-2xl border border-border/60 bg-card/90 shadow-sm shadow-primary/5 backdrop-blur-sm',
  glassHeader:
    'sticky top-0 z-50 border-b border-border/50 bg-card/75 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60',
  pageContainer: 'mx-auto w-full max-w-5xl px-4 py-10 sm:px-6',
  gradientText: 'bg-gradient-to-br from-primary to-[#2d6ba3] bg-clip-text text-transparent',
  iconBox: 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary',
  metricCard:
    'group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md hover:shadow-primary/5',
} as const;
