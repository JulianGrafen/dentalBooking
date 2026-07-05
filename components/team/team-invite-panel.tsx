'use client';

import { useMemo, useState, useTransition } from 'react';
import { Copy, Send } from 'lucide-react';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { SITE_URL } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TeamInvitePanelProps {
  canInvite: boolean;
}

export function TeamInvitePanel({ canInvite }: TeamInvitePanelProps) {
  const [email, setEmail] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inviteUrl = useMemo(() => {
    if (!inviteToken) return null;
    return `${SITE_URL}/team/accept?token=${inviteToken}`;
  }, [inviteToken]);

  function handleCreateInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!canInvite) return;

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('create_practice_invite', {
        target_email: email,
      });

      if (error || !data?.[0]) {
        toast.error(error?.message ?? 'Einladung konnte nicht erstellt werden');
        return;
      }

      setInviteToken(data[0].token);
      toast.success('Einladungslink erstellt');
    });
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success('Einladungslink kopiert');
  }

  if (!canInvite) {
    return (
      <p className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
        Nur Praxis-Owner können neue Kalender-Nutzer einladen.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreateInvite} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="team-email">E-Mail des neuen Nutzers</Label>
          <Input
            id="team-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="kollegin@praxis.de"
            className="h-11 bg-card"
          />
        </div>
        <Button type="submit" disabled={isPending} className="gap-2">
          <Send className="size-4" />
          {isPending ? 'Wird erstellt…' : 'Kalender-Zugang einladen'}
        </Button>
      </form>

      {inviteUrl && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">Einladungslink</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Der Link ist 7 Tage gültig. Der Nutzer muss mit genau dieser E-Mail angemeldet sein.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={inviteUrl} className="h-10 bg-card font-mono text-xs" />
            <Button type="button" variant="outline" className="gap-2" onClick={handleCopy}>
              <Copy className="size-4" />
              Kopieren
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
