'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Armchair,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { BrandLogo } from '@/components/layout/brand-logo';
import { uiClasses } from '@/lib/ui-classes';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const configured = isSupabaseConfigured();

  const isPublicBooking = pathname.startsWith('/book/');

  useEffect(() => {
    if (!configured) return;

    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  async function handleLogout() {
    if (!configured) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className={uiClasses.glassHeader}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandLogo />

        <nav className="flex items-center gap-1.5 sm:gap-2" data-tour="main-nav">
          {!configured && (
            <span className="mr-2 hidden rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 sm:inline">
              Demo-Modus
            </span>
          )}

          {isLoggedIn ? (
            <>
              <Button
                asChild
                variant={pathname === '/dashboard' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-1.5"
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
              <Button
                asChild
                variant={pathname.startsWith('/dashboard/calendar') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-1.5"
              >
                <Link href="/dashboard/calendar">
                  <CalendarDays className="size-4" />
                  <span className="hidden sm:inline">Kalender</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="hidden gap-1.5 sm:inline-flex">
                <Link href="/dashboard/security">
                  <Shield className="size-4" />
                  Sicherheit
                </Link>
              </Button>
              <Button
                asChild
                variant={pathname.startsWith('/dashboard/treatments') ? 'secondary' : 'ghost'}
                size="sm"
                className="hidden gap-1.5 sm:inline-flex"
              >
                <Link href="/dashboard/treatments">
                  <ClipboardList className="size-4" />
                  Behandlungen
                </Link>
              </Button>
              <Button
                asChild
                variant={pathname.startsWith('/dashboard/resources') ? 'secondary' : 'ghost'}
                size="sm"
                className="hidden gap-1.5 sm:inline-flex"
              >
                <Link href="/dashboard/resources">
                  <Armchair className="size-4" />
                  Ressourcen
                </Link>
              </Button>
              <Button
                asChild
                variant={pathname.startsWith('/dashboard/team') ? 'secondary' : 'ghost'}
                size="sm"
                className="hidden gap-1.5 sm:inline-flex"
              >
                <Link href="/dashboard/team">
                  <Users className="size-4" />
                  Team
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              {!isPublicBooking && (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild size="sm" className="shadow-sm shadow-primary/20">
                    <Link href="/register">Registrieren</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
