import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMonthParam, shiftMonth } from '@/lib/date-ranges';

interface CalendarMonthNavProps {
  year: number;
  month: number;
}

export function CalendarMonthNav({ year, month }: CalendarMonthNavProps) {
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const monthLabel = new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="icon" aria-label="Vorheriger Monat">
          <Link href={`/dashboard/calendar?month=${formatMonthParam(prev.year, prev.month)}`}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon" aria-label="Nächster Monat">
          <Link href={`/dashboard/calendar?month=${formatMonthParam(next.year, next.month)}`}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
      <h2 className="min-w-[12rem] text-xl font-semibold capitalize">{monthLabel}</h2>
      {!isCurrentMonth && (
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/calendar">Aktueller Monat</Link>
        </Button>
      )}
    </div>
  );
}
