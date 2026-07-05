import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { uiClasses } from '@/lib/ui-classes';
import { SITE_URL } from '@/lib/site';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

const trustBadges = [
  'DSGVO-konform',
  'Zero-Knowledge E2EE',
  '2FA-ready',
  'Made for dental teams',
] as const;

const features = [
  {
    icon: Lock,
    title: 'Zero-Knowledge E2EE',
    description:
      'Patientendaten werden im Browser verschlüsselt. Auf dem Server liegt nur Ciphertext.',
  },
  {
    icon: CalendarCheck,
    title: 'Online-Terminbuchung',
    description:
      'Ein sicherer Buchungslink pro Praxis. Patienten buchen ihren Zahnarzttermin online — ohne Konto und ohne App.',
  },
  {
    icon: BellRing,
    title: 'Recall-System',
    description:
      'Automatische Prophylaxe-Erinnerungen bringen Recall-Patienten zuverlässig zurück in die Praxis.',
  },
  {
    icon: Zap,
    title: 'Smart-Fill-Warteliste',
    description:
      'Kurzfristige Absagen werden aus der Warteliste nachbesetzt — so reduzieren Sie Terminausfälle, bevor Lücken entstehen.',
  },
] as const;

const complianceCards = [
  {
    icon: ShieldCheck,
    title: 'Datenschutz by design',
    description:
      'E2EE, 2FA, RLS und rollenbasierter Zugriff sind fest im System verankert.',
    points: ['Private Key bleibt im Browser', 'HttpOnly Supabase Sessions', 'Mandantentrennung via RLS'],
  },
  {
    icon: ClipboardCheck,
    title: 'Nachvollziehbare Abläufe',
    description:
      'Termine, Verschiebungen und Absagen laufen strukturiert statt über lose Notizen.',
    points: ['Absagegrund per Pflichtfeld', 'Patienten-E-Mail automatisch', 'Smart-Fill bei kurzfristigen Lücken'],
  },
  {
    icon: Users,
    title: 'Teamfähig',
    description:
      'Mehrere Nutzer verwalten denselben Kalender, ohne die Praxisdaten zu vermischen.',
    points: ['Owner & Kalender-Verwaltung', 'Einladungslinks mit Ablauf', 'Gemeinsame Praxis-Mitgliedschaft'],
  },
] as const;

const workflowSteps = [
  {
    title: 'Buchungslink teilen',
    description:
      'Website, E-Mail-Signatur oder QR-Code: Patienten öffnen direkt den sicheren Buchungsflow.',
  },
  {
    title: 'Patient bucht verschlüsselt',
    description:
      'Kontaktdaten und Behandlung werden client-seitig mit dem Praxis-Public-Key verschlüsselt.',
  },
  {
    title: 'Team verwaltet Kalender',
    description:
      'Termine ansehen, verschieben oder absagen. Patienten erhalten automatisch E-Mail-Updates.',
  },
] as const;

const plans = [
  {
    name: 'Starter',
    price: '0 €',
    description: 'Für den ersten sicheren Buchungsflow.',
    cta: 'Kostenlos starten',
    href: '/register',
    highlighted: false,
    features: ['Online-Buchungslink', 'E2EE-Termine', 'Dashboard & Kalender'],
  },
  {
    name: 'Practice',
    price: '139 € / Monat',
    description: 'Für Praxen mit aktivem Terminmanagement.',
    cta: 'Praxis anlegen',
    href: '/register',
    highlighted: true,
    features: ['Smart-Fill', 'Recall-Engine', 'Termin-E-Mails', 'Team-Zugriff'],
  },
  {
    name: 'Clinic',
    price: 'Auf Anfrage',
    description: 'Für mehrere Standorte und höhere Sicherheitsanforderungen.',
    cta: 'Kontakt aufnehmen',
    href: 'mailto:info@teeth.al',
    highlighted: false,
    features: ['Mehrere Teams', 'Security Review', 'Audit-Logging Roadmap', 'Onboarding-Support'],
  },
] as const;

const practiceFeatures = [
  {
    icon: CalendarClock,
    title: 'Termin verschieben',
    description: 'Neuer Slot auswählen, Patient per E-Mail informieren.',
  },
  {
    icon: Mail,
    title: 'Absage mit Grund',
    description: 'Absagegrund dokumentieren und automatisch versenden.',
  },
  {
    icon: KeyRound,
    title: 'Recovery-Key',
    description: 'Neue Teamgeräte bewusst entsperren, nicht heimlich synchronisieren.',
  },
  {
    icon: FileCheck2,
    title: 'Audit-ready Roadmap',
    description: 'Zugriffe und Aktionen werden als nächster Security-Layer vorbereitet.',
  },
  {
    icon: Users,
    title: 'Mehrere Nutzer',
    description: 'Owner laden Kalender-Manager per zeitlich begrenztem Link ein.',
  },
  {
    icon: Sparkles,
    title: 'Onboarding-Tour',
    description: 'Neue Praxen lernen Buchung, Kalender, Team und Sicherheit automatisch kennen.',
  },
] as const;

const faqs = [
  [
    'Ist die Online-Terminbuchung von teeth.al DSGVO-konform?',
    'Ja. teeth.al wurde für Zahnarztpraxen in Deutschland entwickelt und setzt Datenschutz technisch um: Patientendaten werden bereits im Browser Ende-zu-Ende verschlüsselt (Zero-Knowledge-Architektur), Mandanten sind auf Datenbankebene per Row Level Security getrennt und Logins lassen sich mit Zwei-Faktor-Authentifizierung absichern.',
  ],
  [
    'Kann teeth.al Patientendaten lesen?',
    'Nein. Sensible Buchungsdaten wie Name und Kontaktdaten werden Ende-zu-Ende verschlüsselt und sind ausschließlich mit dem Private Key Ihrer Praxis lesbar. Auf dem Server liegt nur Ciphertext — auch wir als Anbieter haben keinen Zugriff auf Patientendaten im Klartext.',
  ],
  [
    'Wie reduziert teeth.al Terminausfälle in der Zahnarztpraxis?',
    'Zwei Mechanismen greifen ineinander: Die Recall-Engine erinnert Prophylaxe-Patienten automatisch an fällige Kontrolltermine, und Smart-Fill besetzt kurzfristig abgesagte Termine aus der Warteliste nach, bevor Lücken im Praxiskalender entstehen.',
  ],
  [
    'Brauchen Patienten einen Account, um online einen Zahnarzttermin zu buchen?',
    'Nein. Patienten buchen über einen öffentlichen Buchungslink Ihrer Praxis — ohne Registrierung, ohne App und ohne Passwort. Der Link lässt sich auf der Praxis-Website, in der E-Mail-Signatur oder als QR-Code teilen.',
  ],
  [
    'Können mehrere Mitarbeiter den Praxiskalender gemeinsam verwalten?',
    'Ja. Praxisinhaber laden Teammitglieder als Kalender-Manager über zeitlich begrenzte Einladungslinks ein. Den Recovery-Key zum Entschlüsseln der Patientendaten geben Sie separat und bewusst weiter — neue Geräte werden nie heimlich synchronisiert.',
  ],
  [
    'Was kostet eine Online-Terminverwaltung für Zahnarztpraxen?',
    'Der Einstieg ist kostenlos: Der Starter-Tarif enthält Buchungslink, verschlüsselte Termine und Kalender. Der Practice-Tarif mit Smart-Fill, Recall-Engine und Team-Zugriff kostet 139 € pro Monat zzgl. MwSt. Für Praxisgruppen mit mehreren Standorten gibt es individuelle Clinic-Konditionen.',
  ],
] as const;

/**
 * Schema.org structured data for search engines and answer engines (AEO).
 * Built from the same content constants as the visible page to stay in sync.
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'teeth.al',
      url: SITE_URL,
      email: 'info@teeth.al',
      description:
        'Anbieter von DSGVO-konformer Online-Terminbuchung und Terminverwaltung für Zahnarztpraxen mit Ende-zu-Ende-Verschlüsselung.',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Pfarrer-Reinartz-Str. 11',
        postalCode: '53925',
        addressLocality: 'Kall',
        addressCountry: 'DE',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'teeth.al',
      inLanguage: 'de-DE',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: 'Online-Terminbuchung & Terminverwaltung für Zahnarztpraxen',
      inLanguage: 'de-DE',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#software` },
      description:
        'DSGVO-konforme Online-Terminbuchung für Zahnarztpraxen: Ende-zu-Ende-Verschlüsselung, Recall-System gegen Terminausfälle und Smart-Fill-Warteliste.',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'teeth.al',
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Praxissoftware / Terminverwaltung für Zahnarztpraxen',
      operatingSystem: 'Web',
      inLanguage: 'de-DE',
      description:
        'Online-Terminbuchung, Praxiskalender, Recall-Engine und Smart-Fill-Warteliste für Zahnarztpraxen — mit Zero-Knowledge-Ende-zu-Ende-Verschlüsselung, Zwei-Faktor-Authentifizierung und Team-Zugriff.',
      featureList: [
        'Online-Terminbuchung ohne Patienten-Account',
        'Ende-zu-Ende-Verschlüsselung (Zero-Knowledge)',
        'Recall-Engine für Prophylaxe-Erinnerungen',
        'Smart-Fill-Warteliste gegen Terminausfälle',
        'Praxiskalender mit Team-Zugriff für mehrere Mitarbeiter',
        'Terminabsagen und -verschiebungen mit automatischer Patienten-E-Mail',
        'Zwei-Faktor-Authentifizierung',
      ],
      offers: [
        {
          '@type': 'Offer',
          name: 'Starter',
          price: '0',
          priceCurrency: 'EUR',
          description: 'Online-Buchungslink, E2EE-Termine, Dashboard & Kalender — kostenlos.',
        },
        {
          '@type': 'Offer',
          name: 'Practice',
          price: '139',
          priceCurrency: 'EUR',
          description:
            'Smart-Fill, Recall-Engine, Termin-E-Mails und Team-Zugriff für 139 € pro Monat zzgl. MwSt.',
        },
      ],
      provider: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      inLanguage: 'de-DE',
      mainEntity: faqs.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      })),
    },
  ],
} as const;

export default function HomePage() {
  return (
    <main className="overflow-hidden text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="relative px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:pb-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <ShieldCheck className="size-4" />
              Medizinische Daten · Ende-zu-Ende geschützt
            </div>

            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Online-Terminbuchung für Zahnarztpraxen —{' '}
              <span className={uiClasses.gradientText}>ohne Patientendaten im Klartext</span>.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              teeth.al ist die DSGVO-konforme Terminverwaltung für Zahnarztpraxen:
              Online-Buchung ohne Patienten-Account, Praxiskalender, Recall-System
              und Smart-Fill-Warteliste gegen Terminausfälle. Dank
              Zero-Knowledge-Verschlüsselung sind sensible Patientendaten nur in
              Ihrer Praxis lesbar.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 gap-2 px-7 shadow-lg shadow-primary/20">
                <Link href="/register">
                  Kostenlos starten
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 bg-card/80 px-7">
                <Link href="/login">Praxis-Login</Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {trustBadges.map((badge) => (
                <div key={badge} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-primary" />
                  {badge}
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-3xl border border-primary/15 bg-card/90 p-4 shadow-xl shadow-primary/10">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Live Kalender
                  </p>
                  <p className="text-lg font-semibold">Heute in der Praxis</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
                  E2EE aktiv
                </span>
              </div>
              {[
                ['09:00', 'Prophylaxe', 'Gebucht'],
                ['10:30', 'Kontrolle', 'Verschoben'],
                ['14:00', 'Smart-Fill', 'Nachbesetzt'],
              ].map(([time, treatment, status]) => (
                <div
                  key={`${time}-${treatment}`}
                  className="mb-3 flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 last:mb-0"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-primary">{time}</p>
                    <p className="text-sm font-medium">{treatment}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    {status}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['12', 'Termine'],
                ['3', 'Recall'],
                ['1', 'Lücke gefüllt'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-border/60 bg-card p-4 text-center">
                  <p className="text-2xl font-semibold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/40 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Funktionen
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Terminverwaltung für die Zahnarztpraxis — weniger Telefon, weniger Ausfälle.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Vier Bausteine, die zusammenspielen: Patienten buchen online, das
              Recall-System erinnert an Prophylaxe-Termine und Smart-Fill besetzt
              kurzfristig frei gewordene Slots aus der Warteliste nach.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" strokeWidth={2} />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Compliance auf Autopilot
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              DSGVO-konforme Praxissoftware statt nachträglicher Datenschutz-Patch.
            </h2>
            <p className="text-muted-foreground">
              Für Zahnarztpraxen zählt nicht nur eine schöne Oberfläche.
              Patientendaten, Zugriffsrechte und Terminänderungen müssen von
              Anfang an kontrolliert, verschlüsselt und nachvollziehbar sein —
              Datenschutz ist hier Architektur, kein Add-on.
            </p>
            <Button asChild variant="outline" className="gap-2 bg-card/80">
              <Link href="/register">
                Praxis sicher starten
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4">
            {complianceCards.map(({ icon: Icon, title, description, points }) => (
              <article key={title} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
                    <div className="mt-3 grid gap-1.5">
                      {points.map((point) => (
                        <p key={point} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="size-3.5 text-primary" />
                          {point}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary px-4 py-16 text-primary-foreground sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
              Workflow
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Vom Online-Termin zur gefüllten Lücke im Praxiskalender.
            </h2>
          </div>
          <div className="grid gap-4 lg:col-span-2">
            {workflowSteps.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-5">
                <div className="flex items-start gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-primary-foreground/75">
                      {step.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Praxisalltag
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Gebaut für Praxisteams, die Zahnarzttermine wirklich steuern müssen.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Termine verschieben, Absagen mit Grund dokumentieren, mehrere
              Mitarbeiter im selben Praxiskalender — der Alltag einer
              Zahnarztpraxis, sicher abgebildet.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {practiceFeatures.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Preise
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Was kostet Online-Terminverwaltung? Starten ohne IT-Projekt.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Vom kostenlosen Buchungslink bis zur teamfähigen Praxisverwaltung
              mit Recall und Smart-Fill. Alle Preise verstehen sich zzgl. MwSt.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-2xl border p-6 ${
                  plan.highlighted
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 bg-card'
                }`}
              >
                <p className="text-sm font-medium opacity-80">{plan.name}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{plan.price}</p>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    plan.highlighted ? 'text-primary-foreground/75' : 'text-muted-foreground'
                  }`}
                >
                  {plan.description}
                </p>
                <div className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 shrink-0" />
                      {feature}
                    </p>
                  ))}
                </div>
                <Button
                  asChild
                  variant={plan.highlighted ? 'secondary' : 'outline'}
                  className="mt-6 w-full gap-2"
                >
                  <Link href={plan.href}>
                    {plan.cta}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              FAQ
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Häufige Fragen zur Online-Terminbuchung
            </h2>
            <p className="mt-3 text-muted-foreground">
              Antworten zu Datenschutz, Terminausfällen und Team-Zugriff — kurz
              und ohne Marketing-Sprech.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map(([question, answer]) => (
              <article key={question} className="rounded-2xl border border-border/60 bg-card p-5">
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 text-center sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Kostenlos & unverbindlich
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Jetzt sichere Online-Terminverwaltung für Ihre Zahnarztpraxis testen.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Legen Sie Ihre Praxis kostenlos an, sichern Sie den Recovery-Key und
            starten Sie mit dem ersten verschlüsselten Buchungslink für Ihre
            Patienten.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 gap-2 px-8">
              <Link href="/register">
                Kostenlos starten
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 bg-card/80 px-8">
              <Link href="/impressum">Impressum</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} teeth.al</p>
          <div className="flex gap-4">
            <Link href="/impressum" className="hover:text-foreground">
              Impressum
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
