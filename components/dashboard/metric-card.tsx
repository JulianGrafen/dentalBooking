import type { LucideIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { uiClasses } from '@/lib/ui-classes';

interface MetricCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  accent?: 'primary' | 'emerald';
  tourId?: string;
}

const accentStyles = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-500/10 text-emerald-600',
} as const;

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  accent = 'primary',
  tourId,
}: MetricCardProps) {
  return (
    <Card className={uiClasses.metricCard} data-tour={tourId}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100"
      />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardDescription className="text-xs font-medium uppercase tracking-wide">
            {title}
          </CardDescription>
          <CardTitle className="text-4xl font-semibold tabular-nums tracking-tight">
            {value}
          </CardTitle>
        </div>
        <div className={`rounded-xl p-2.5 ${accentStyles[accent]}`}>
          <Icon className="size-5" strokeWidth={2} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
