'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { BOOKING_DURATION_OPTIONS } from '@/lib/treatments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TreatmentRow {
  slug: string;
  label: string;
  durationMinutes: number;
  isActive: boolean;
  sortOrder: number;
}

interface BookingTreatmentsSettingsProps {
  practiceId: string;
  canEdit: boolean;
}

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export function BookingTreatmentsSettings({
  practiceId,
  canEdit,
}: BookingTreatmentsSettingsProps) {
  const [treatments, setTreatments] = useState<TreatmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadTreatments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data, error: loadError } = await supabase
      .from('practice_booking_treatments')
      .select('slug, label, duration_minutes, is_active, sort_order')
      .eq('practice_id', practiceId)
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (loadError) {
      setError('Behandlungen konnten nicht geladen werden.');
      setLoading(false);
      return;
    }

    setTreatments(
      (data ?? []).map((row) => ({
        slug: row.slug,
        label: row.label,
        durationMinutes: row.duration_minutes,
        isActive: row.is_active,
        sortOrder: row.sort_order,
      })),
    );
    setLoading(false);
  }, [practiceId]);

  useEffect(() => {
    loadTreatments();
  }, [loadTreatments]);

  function updateTreatment(slug: string, patch: Partial<TreatmentRow>) {
    setTreatments((current) =>
      current.map((treatment) =>
        treatment.slug === slug ? { ...treatment, ...patch } : treatment,
      ),
    );
    setSuccess(null);
  }

  function handleSave() {
    setError(null);
    setSuccess(null);

    const activeCount = treatments.filter((treatment) => treatment.isActive).length;
    if (activeCount === 0) {
      setError('Mindestens eine Behandlung muss für die Online-Buchung aktiv sein.');
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();

      const updates = await Promise.all(
        treatments.map((treatment) =>
          supabase
            .from('practice_booking_treatments')
            .update({
              duration_minutes: treatment.durationMinutes,
              is_active: treatment.isActive,
              updated_at: new Date().toISOString(),
            })
            .eq('practice_id', practiceId)
            .eq('slug', treatment.slug),
        ),
      );

      const failed = updates.find((result) => result.error);
      if (failed?.error) {
        setError(failed.error.message ?? 'Speichern fehlgeschlagen.');
        await loadTreatments();
        return;
      }

      setSuccess('Behandlungsdauern wurden gespeichert.');
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Online-Buchung: Behandlungen</CardTitle>
        <CardDescription>
          Legen Sie fest, wie lange jede Behandlung im Kalender blockiert. Patienten sehen
          nur aktive Behandlungen und freie Termine entsprechend der gewählten Dauer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <p className="text-sm text-muted-foreground">Behandlungen werden geladen…</p>
        )}

        {!loading && treatments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Noch keine Behandlungen hinterlegt. Bitte führen Sie{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run db:push</code> aus.
          </p>
        )}

        {!loading && treatments.length > 0 && (
          <ul className="space-y-3">
            {treatments.map((treatment) => (
              <li
                key={treatment.slug}
                className={cn(
                  'rounded-xl border border-border/70 bg-card p-4',
                  !treatment.isActive && 'opacity-70',
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{treatment.label}</p>
                      {!treatment.isActive && (
                        <Badge variant="secondary">Nicht buchbar</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Interne Kennung: {treatment.slug}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`duration-${treatment.slug}`}>Termindauer</Label>
                      <select
                        id={`duration-${treatment.slug}`}
                        className={selectClassName}
                        value={treatment.durationMinutes}
                        disabled={!canEdit || isPending}
                        onChange={(event) =>
                          updateTreatment(treatment.slug, {
                            durationMinutes: Number(event.target.value),
                          })
                        }
                      >
                        {BOOKING_DURATION_OPTIONS.map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes} Minuten
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border border-input accent-primary"
                        checked={treatment.isActive}
                        disabled={!canEdit || isPending}
                        onChange={(event) =>
                          updateTreatment(treatment.slug, { isActive: event.target.checked })
                        }
                      />
                      Buchbar
                    </label>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        )}

        {canEdit && treatments.length > 0 && (
          <Button type="button" onClick={handleSave} disabled={isPending || loading}>
            {isPending ? 'Wird gespeichert…' : 'Änderungen speichern'}
          </Button>
        )}

        {!canEdit && treatments.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Nur Praxis-Inhaber können Behandlungsdauern ändern.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
