import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function BrandLogo({ className, showWordmark = true }: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-transform group-hover:scale-105">
        <Sparkles className="size-4" strokeWidth={2.25} />
      </span>
      {showWordmark && (
        <span className="text-base font-semibold tracking-tight">
          teeth<span className="text-primary">.al</span>
        </span>
      )}
    </Link>
  );
}
