'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Armchair, DoorOpen, Plus, Trash2, Wrench } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import {
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPES,
  resourceFormSchema,
} from '@/lib/resources';
import type { PracticeResource, ResourceType } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PracticeResourcesSettingsProps {
  practiceId: string;
  canEdit: boolean;
}

const RESOURCE_TYPE_ICONS: Record<ResourceType, typeof Armchair> = {
  chair: Armchair,
  room: DoorOpen,
  equipment: Wrench,
};

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export function PracticeResourcesSettings({
  practiceId,
  canEdit,
}: PracticeResourcesSettingsProps) {
  const [resources, setResources] = useState<PracticeResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ResourceType>('chair');
  const [isPending, startTransition] = useTransition();

  const loadResources = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data, error: loadError } = await supabase
      .from('resources')
      .select('*')
      .eq('practice_id', practiceId)
      .order('type')
      .order('name');

    if (loadError) {
      setError(
        loadError.message.includes('resources')
          ? 'Ressourcen-Tabelle fehlt — bitte npm run db:push ausführen.'
          : 'Ressourcen konnten nicht geladen werden.',
      );
      setLoading(false);
      return;
    }

    setResources(data ?? []);
    setLoading(false);
  }, [practiceId]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  function handleCreate() {
    setError(null);

    const parsed = resourceFormSchema.safeParse({ name: newName, type: newType });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.');
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: insertError } = await supabase.from('resources').insert({
        practice_id: practiceId,
        name: parsed.data.name,
        type: parsed.data.type,
      });

      if (insertError) {
        setError(
          insertError.code === '23505'
            ? 'Eine Ressource mit diesem Namen existiert bereits.'
            : 'Ressource konnte nicht angelegt werden.',
        );
        return;
      }

      setNewName('');
      await loadResources();
    });
  }

  function handleToggleActive(resource: PracticeResource) {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from('resources')
        .update({ is_active: !resource.is_active, updated_at: new Date().toISOString() })
        .eq('id', resource.id)
        .eq('practice_id', practiceId);

      if (updateError) {
        setError('Ressource konnte nicht aktualisiert werden.');
        return;
      }
      await loadResources();
    });
  }

  function handleDelete(resource: PracticeResource) {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: deleteError } = await supabase
        .from('resources')
        .delete()
        .eq('id', resource.id)
        .eq('practice_id', practiceId);

      if (deleteError) {
        setError('Ressource konnte nicht gelöscht werden.');
        return;
      }
      await loadResources();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Räume, Stühle & Geräte</CardTitle>
        <CardDescription>
          Ressourcen, die von Behandlungen belegt werden. Eine Behandlung mit
          Pflicht-Ressource (z. B. Röntgen → Röntgenraum) ist nur buchbar, wenn die
          Ressource zur gewünschten Zeit frei ist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Ressourcen werden geladen…</p>}

        {!loading && resources.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Noch keine Ressourcen angelegt. Legen Sie z. B. „Behandlungsstuhl 1“ oder
            „Röntgenraum“ an.
          </p>
        )}

        {!loading && resources.length > 0 && (
          <ul className="space-y-3">
            {resources.map((resource) => {
              const TypeIcon = RESOURCE_TYPE_ICONS[resource.type];
              return (
                <li
                  key={resource.id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4',
                    !resource.is_active && 'opacity-70',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <TypeIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{resource.name}</p>
                        {!resource.is_active && <Badge variant="secondary">Inaktiv</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {RESOURCE_TYPE_LABELS[resource.type]}
                      </p>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleToggleActive(resource)}
                      >
                        {resource.is_active ? 'Deaktivieren' : 'Aktivieren'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        aria-label={`${resource.name} löschen`}
                        disabled={isPending}
                        onClick={() => handleDelete(resource)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {canEdit && (
          <div className="rounded-xl border border-dashed border-border/70 p-4">
            <p className="mb-3 text-sm font-medium">Neue Ressource</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="resource-name">Name</Label>
                <Input
                  id="resource-name"
                  value={newName}
                  maxLength={120}
                  placeholder="z. B. Röntgenraum"
                  disabled={isPending}
                  onChange={(event) => setNewName(event.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:w-56">
                <Label htmlFor="resource-type">Typ</Label>
                <select
                  id="resource-type"
                  className={selectClassName}
                  value={newType}
                  disabled={isPending}
                  onChange={(event) => setNewType(event.target.value as ResourceType)}
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {RESOURCE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                className="gap-1.5"
                disabled={isPending || newName.trim().length < 2}
                onClick={handleCreate}
              >
                <Plus className="size-4" />
                Anlegen
              </Button>
            </div>
          </div>
        )}

        {!canEdit && (
          <p className="text-sm text-muted-foreground">
            Nur Praxis-Inhaber können Ressourcen verwalten.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
