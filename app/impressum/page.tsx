import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, Scale } from 'lucide-react';
import { uiClasses } from '@/lib/ui-classes';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Impressum',
  description:
    'Impressum und Anbieterkennzeichnung von teeth.al — Online-Terminbuchung und Terminverwaltung für Zahnarztpraxen.',
  alternates: {
    canonical: '/impressum',
  },
};

const sections = [
  {
    title: 'Angaben gemäß § 5 DDG',
    body: ['Julian Gräfen', 'Pfarrer-Reinartz-Str. 11', '53925 Kall', 'Deutschland'],
  },
  {
    title: 'Kontakt',
    body: ['E-Mail: info@teeth.al'],
  },
  {
    title: 'Umsatzsteuer-Identifikationsnummer',
    body: ['Gemäß § 27a Umsatzsteuergesetz: DE 369543245'],
  },
  {
    title: 'Verantwortlich für den Inhalt',
    body: ['Julian Gräfen', 'Pfarrer-Reinartz-Str. 11', '53925 Kall'],
  },
  {
    title: 'Streitschlichtung',
    body: [
      'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/.',
      'Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
    ],
  },
  {
    title: 'Haftung für Inhalte',
    body: [
      'Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.',
      'Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.',
    ],
  },
  {
    title: 'Haftung für Links',
    body: [
      'Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.',
      'Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.',
    ],
  },
  {
    title: 'Urheberrecht',
    body: [
      'Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.',
      'Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.',
    ],
  },
] as const;

export default function ImpressumPage() {
  return (
    <main className={`${uiClasses.pageContainer} max-w-4xl`}>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 gap-2">
        <Link href="/">
          <ArrowLeft className="size-4" />
          Zurück zur Startseite
        </Link>
      </Button>

      <header className="mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Scale className="size-3.5" />
          Rechtliche Angaben
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Impressum</h1>
        <p className="max-w-2xl text-muted-foreground">
          Anbieterkennzeichnung und Kontaktinformationen für teeth.al.
        </p>
      </header>

      <Card className={uiClasses.glassCard}>
        <CardHeader>
          <CardTitle>teeth.al</CardTitle>
          <CardDescription>Praxis-Management für Zahnärzte</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card/80 p-4">
              <MapPin className="mb-3 size-5 text-primary" />
              <p className="font-medium">Anschrift</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Julian Gräfen
                <br />
                Pfarrer-Reinartz-Str. 11
                <br />
                53925 Kall
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/80 p-4">
              <Mail className="mb-3 size-5 text-primary" />
              <p className="font-medium">Kontakt</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                E-Mail:{' '}
                <a href="mailto:info@teeth.al" className="text-primary underline">
                  info@teeth.al
                </a>
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            {sections.map((section) => (
              <section key={section.title} className="border-t border-border/60 pt-5">
                <h2 className="font-semibold">{section.title}</h2>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
