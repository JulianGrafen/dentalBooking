import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays, Shield, Users } from 'lucide-react';
import { getCurrentPracticeContext } from '@/lib/server/current-practice';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { uiClasses } from '@/lib/ui-classes';
import { SupabaseNotConfigured } from '@/components/auth/supabase-not-configured';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { TeamInvitePanel } from '@/components/team/team-invite-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const roleLabels = {
  owner: 'Owner',
  calendar_manager: 'Kalender-Verwaltung',
} as const;

export default async function TeamPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <SupabaseNotConfigured />
      </main>
    );
  }

  const context = await getCurrentPracticeContext();
  if (!context) redirect('/login');
  const { supabase, practice, role } = context;

  const [membersResult, invitesResult] = await Promise.all([
    supabase
      .from('practice_members')
      .select('member_email, role, created_at')
      .eq('practice_id', practice.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('practice_invites')
      .select('email, role, expires_at, accepted_at, created_at')
      .eq('practice_id', practice.id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  const members = membersResult.data ?? [];
  const invites = invitesResult.data ?? [];
  const canInvite = role === 'owner';

  return (
    <DashboardShell>
      <main className={`${uiClasses.pageContainer} max-w-4xl`}>
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Team
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{practice.name}</h1>
            <p className="text-muted-foreground">
              Mehrere Nutzer können denselben Kalender verwalten.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2 bg-card/80">
              <Link href="/dashboard/calendar">
                <CalendarDays className="size-4" />
                Kalender
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 bg-card/80">
              <Link href="/dashboard/security">
                <Shield className="size-4" />
                Sicherheit
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <Card className={uiClasses.glassCard}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                Mitglieder
              </CardTitle>
              <CardDescription>
                Nutzer mit Zugriff auf Kalender und Termindaten dieser Praxis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member) => (
                <div
                  key={`${member.member_email}-${member.role}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{member.member_email}</p>
                    <p className="text-xs text-muted-foreground">
                      Seit {new Intl.DateTimeFormat('de-DE').format(new Date(member.created_at))}
                    </p>
                  </div>
                  <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                    {roleLabels[member.role]}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={uiClasses.glassCard}>
            <CardHeader>
              <CardTitle>Kalender-Zugang einladen</CardTitle>
              <CardDescription>
                Eingeladene Nutzer können Termine ansehen, verschieben und absagen.
                Den E2EE-Recovery-Key müssen Sie separat sicher übergeben.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamInvitePanel canInvite={canInvite} />
            </CardContent>
          </Card>
        </div>

        {invites.length > 0 && (
          <section className="mt-6">
            <Card className={uiClasses.glassCard}>
              <CardHeader>
                <CardTitle>Offene Einladungen</CardTitle>
                <CardDescription>Noch nicht angenommene Kalender-Zugänge.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={`${invite.email}-${invite.created_at}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Gültig bis{' '}
                        {new Intl.DateTimeFormat('de-DE', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(invite.expires_at))}
                      </p>
                    </div>
                    <Badge variant="secondary">{roleLabels[invite.role]}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </DashboardShell>
  );
}
