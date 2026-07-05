import type { LucideIcon } from 'lucide-react';
import {
  BellRing,
  CalendarClock,
  CalendarDays,
  Link2,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export type OnboardingPlacement = 'center' | 'bottom' | 'top';

export interface OnboardingStep {
  id: string;
  route: string;
  /** `[data-tour="…"]` — omit for centered modal steps */
  target?: string;
  title: string;
  description: string;
  icon: LucideIcon;
  placement?: OnboardingPlacement;
  /** Auto-advance delay in ms (default applied in provider) */
  autoDelayMs?: number;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    route: '/dashboard',
    title: 'Willkommen bei teeth.al',
    description:
      'Diese Tour führt Sie automatisch durch alle Funktionen — Online-Buchung, Recall, Smart-Fill, Kalender und Sicherheit. Lehnen Sie sich zurück.',
    icon: Sparkles,
    placement: 'center',
    autoDelayMs: 6500,
  },
  {
    id: 'booking-link',
    route: '/dashboard',
    target: 'booking-link',
    title: 'Ihr Buchungslink',
    description:
      'Teilen Sie diesen Link auf Ihrer Website oder per E-Mail. Patienten buchen ohne Konto — alle Daten werden im Browser verschlüsselt, bevor sie den Server erreichen.',
    icon: Link2,
    placement: 'bottom',
  },
  {
    id: 'recall',
    route: '/dashboard',
    target: 'recall-metric',
    title: 'Recall-Engine',
    description:
      'Erinnert Patienten automatisch an die Prophylaxe, wenn der letzte Besuch genau 6 Monate zurückliegt. Termine erscheinen hier als Kennzahl.',
    icon: BellRing,
    placement: 'bottom',
  },
  {
    id: 'smart-fill',
    route: '/dashboard',
    target: 'smart-fill-metric',
    title: 'Smart-Fill',
    description:
      'Kurzfristige Absagen innerhalb von 48 Stunden werden automatisch an wartende Patienten gemeldet — Lücken im Kalender schließen sich von selbst.',
    icon: Zap,
    placement: 'bottom',
  },
  {
    id: 'today',
    route: '/dashboard',
    target: 'today-appointments',
    title: 'Heutige Termine',
    description:
      'Alle Termine werden in Ihrem Browser entschlüsselt. Sie sehen Patient/in, Behandlung und Status — der Server kennt diese Daten nie.',
    icon: CalendarDays,
    placement: 'top',
  },
  {
    id: 'manage',
    route: '/dashboard',
    target: 'today-appointments',
    title: 'Termine verwalten',
    description:
      'Absagen oder verschieben Sie Termine direkt hier. Patienten erhalten automatisch eine E-Mail — bei Absagen kann Smart-Fill kurzfristig nachrücken.',
    icon: CalendarClock,
    placement: 'top',
  },
  {
    id: 'navigation',
    route: '/dashboard',
    target: 'main-nav',
    title: 'Navigation',
    description:
      'Wechseln Sie jederzeit zwischen Dashboard, Kalender und Sicherheit. Die Tour zeigt Ihnen gleich die weiteren Bereiche.',
    icon: CalendarDays,
    placement: 'bottom',
  },
  {
    id: 'calendar',
    route: '/dashboard/calendar',
    target: 'calendar-overview',
    title: 'Kalenderübersicht',
    description:
      'Monatsansicht mit Termin-Markierungen, Tages-Timeline und Liste aller anstehenden Termine. Blau = gebucht, rot = storniert.',
    icon: CalendarDays,
    placement: 'top',
    autoDelayMs: 7000,
  },
  {
    id: 'security',
    route: '/dashboard/security',
    target: 'two-factor-settings',
    title: 'Sicherheit & 2FA',
    description:
      'Schützen Sie Ihr Praxis-Konto mit Zwei-Faktor-Authentifizierung. Nur mit 2FA und Ihrem Entsperr-Schlüssel sind Patientendaten lesbar.',
    icon: ShieldCheck,
    placement: 'top',
    autoDelayMs: 7000,
  },
  {
    id: 'e2ee',
    route: '/dashboard/security',
    title: 'Zero-Knowledge E2EE',
    description:
      'Ihr privater Schlüssel bleibt ausschließlich in diesem Browser. Bewahren Sie den Recovery-Key sicher auf — ohne ihn sind verschlüsselte Termine nicht wiederherstellbar.',
    icon: Lock,
    placement: 'center',
    autoDelayMs: 7000,
  },
  {
    id: 'finish',
    route: '/dashboard',
    title: 'Alles bereit!',
    description:
      'Sie kennen jetzt alle Kernfunktionen. Kopieren Sie Ihren Buchungslink, teilen Sie ihn — und starten Sie mit der digitalen Terminverwaltung.',
    icon: Sparkles,
    placement: 'center',
    autoDelayMs: 5500,
  },
];

export const DEFAULT_STEP_DELAY_MS = 5500;
