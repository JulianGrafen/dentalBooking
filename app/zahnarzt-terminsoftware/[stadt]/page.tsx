import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, Lock, MailCheck, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CITY_LANDING_PAGES,
  cityLandingPath,
  findCityLandingPage,
} from '@/lib/seo/city-landing-pages';
import { SITE_URL } from '@/lib/site';
import { uiClasses } from '@/lib/ui-classes';

interface CityLandingPageProps {
  params: Promise<{ stadt: string }>;
}

export function generateStaticParams() {
  return CITY_LANDING_PAGES.map((page) => ({ stadt: page.slug }));
}

export async function generateMetadata({ params }: CityLandingPageProps): Promise<Metadata> {
  const { stadt } = await params;
  const page = findCityLandingPage(stadt);
  if (!page) return {};

  const title = `Zahnarzt-Terminsoftware ${page.city} — Terminausfälle automatisch nachbesetzen`;
  const description = `DSGVO-konforme Terminbuchung für Zahnärzte in ${page.city}: Smart-Fill KI-Warteliste besetzt abgesagte Termine automatisch nach — mit Zero-Knowledge-Verschlüsselung statt zentraler Datenspeicherung.`;

  return {
    title,
    description,
    alternates: { canonical: cityLandingPath(page.slug) },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${cityLandingPath(page.slug)}`,
      type: 'website',
      locale: 'de_DE',
      siteName: 'teeth.al',
    },
  };
}

function buildJsonLd(page: NonNullable<ReturnType<typeof findCityLandingPage>>) {
  const softwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'teeth.al',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Terminverwaltung für Zahnarztpraxen',
    operatingSystem: 'Web',
    url: SITE_URL,
    inLanguage: 'de',
    description:
      'DSGVO-konforme Terminbuchung für Zahnärzte mit Zero-Knowledge Ende-zu-Ende-Verschlüsselung, Smart-Fill KI-Warteliste gegen Terminausfälle und automatisiertem Recall-System.',
    featureList: [
      'Zero-Knowledge Ende-zu-Ende-Verschlüsselung der Patientendaten',
      'Smart-Fill Warteliste: automatische Neuvergabe abgesagter Termine per E-Mail-Bestätigungslink',
      'Automatisiertes Recall-System für Prophylaxe und Kontrolluntersuchungen',
      'Online-Terminbuchung ohne Klartext-Datenspeicherung beim Anbieter',
    ],
    audience: {
      '@type': 'BusinessAudience',
      audienceType: 'Zahnarztpraxen',
      name: 'Dentist',
    },
    availableLanguage: 'de',
    countriesSupported: 'DE',
    areaServed: {
      '@type': 'City',
      name: page.city,
      containedInPlace: {
        '@type': 'AdministrativeArea',
        name: page.region,
      },
    },
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return [softwareApplication, faqPage];
}

export default async function CityLandingPage({ params }: CityLandingPageProps) {
  const { stadt } = await params;
  const page = findCityLandingPage(stadt);
  if (!page) notFound();

  return (
    <main className={uiClasses.pageContainer}>
      {buildJsonLd(page).map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* AEO answer block — direct snippet food for AI overviews */}
      <section
        className={`${uiClasses.glassCard} mb-10 border-primary/25 bg-primary/5 p-6`}
        aria-label="Kurzantwort"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Kurz beantwortet
        </p>
        <p className="mt-2 text-base font-medium leading-relaxed">{page.aeoAnswer}</p>
      </section>

      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Smart-Fill KI-Warteliste: Terminausfälle und leere Behandlungsstühle in{' '}
          <span className={uiClasses.gradientText}>{page.city}er Zahnarztpraxen</span>{' '}
          automatisch auffüllen
        </h1>
      </header>

      <section className="mb-12 space-y-4 text-[0.95rem] leading-relaxed text-muted-foreground">
        <p>
          Jede kurzfristige Absage kostet eine Zahnarztpraxis real zwischen 150 und 400 Euro
          Umsatz — bei Prophylaxe- und Füllungsterminen im Schnitt, bei prothetischen
          Behandlungen deutlich mehr. Hochgerechnet auf zwei bis drei Ausfälle pro Woche
          entsteht ein fünfstelliger Jahresschaden, den keine Auslastungsplanung der Welt
          nachträglich kompensiert. Wer Terminausfälle in der Zahnarztpraxis reduzieren will,
          braucht keine Software, die Ausfälle nur dokumentiert — sondern eine, die den frei
          gewordenen Stuhl innerhalb von Minuten neu besetzt.
        </p>
        <p>
          Genau das leistet die Smart-Fill Warteliste von teeth.al: Patienten, deren
          Wunschtermin belegt ist, tragen sich bei der Online-Buchung mit einem Klick auf die
          Warteliste für exakt diesen Slot ein. Sagt der ursprüngliche Patient ab, erhält der
          erste passende Wartelisten-Patient automatisch eine E-Mail mit Bestätigungslink.
          Bestätigt er, steht der Termin verbindlich im Praxiskalender — ohne dass eine ZFA
          telefonieren muss.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold tracking-tight">
          Rationale Analyse: Warum klassische PVS-Systeme bei Terminausfällen versagen
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
          Praxisverwaltungssysteme sind für Abrechnung und Dokumentation gebaut, nicht für die
          Wiedervergabe frei werdender Kapazität. Zwei strukturelle Schwächen sind dabei
          entscheidend:
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className={`${uiClasses.glassCard} p-5`}>
            <h3 className="font-semibold">
              1. Die Absage ist im PVS ein passiver Datensatz, kein Auslöser
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Wird ein Termin storniert, ändert das klassische System lediglich einen Status im
              Kalender. Die Wiederbesetzung bleibt manuelle Arbeit: Das Team muss eine oft auf
              Papier oder in Excel geführte Warteliste durchtelefonieren — während der
              Behandlungsstuhl bereits leer steht. Bei Absagen am selben oder Vortag ist der
              Slot faktisch verloren, weil niemand Zeit für fünf Rückrufversuche hat.
            </p>
          </article>
          <article className={`${uiClasses.glassCard} p-5`}>
            <h3 className="font-semibold">
              2. Es fehlt die Patienten-Selbstbedienung außerhalb der Sprechzeiten
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Die meisten Absagen und Terminwünsche entstehen abends oder am Wochenende — genau
              dann, wenn das PVS-Terminal in der Praxis niemand bedient. Ohne öffentlich
              erreichbare Buchungs- und Wartelistenstrecke kann ein frei gewordener
              Freitagnachmittag-Slot am Donnerstagabend schlicht nicht neu vergeben werden.
              Herkömmliche Systeme koppeln die Kapazitätssteuerung an die Anwesenheit des Teams.
            </p>
          </article>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold tracking-tight">
          Die technische Lösung: Automatisierung ohne zentralen Datenzugriff
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
          Der übliche Einwand gegen externe Buchungsportale ist berechtigt: Wer Terminvergabe
          auslagert, gibt in der Regel Patientendaten an einen zentralen Plattformbetreiber ab.
          teeth.al ist bewusst als Alternative zu herkömmlichen Buchungsportalen ohne
          Datenspeicherung im Klartext konzipiert — als DSGVO-konforme Terminbuchung für
          Zahnärzte nach dem Zero-Knowledge-Prinzip:
        </p>
        <ul className="mt-6 space-y-4">
          {[
            {
              icon: Lock,
              title: 'Ende-zu-Ende-Verschlüsselung im Browser des Patienten',
              text: 'Name, Kontaktdaten und Behandlungsgrund werden bereits auf dem Gerät des Patienten gegen den öffentlichen Schlüssel der Praxis verschlüsselt. Auf dem Server liegt ausschließlich Chiffretext plus Terminzeit — der Betreiber kann Patientendaten technisch nicht einsehen.',
            },
            {
              icon: ShieldCheck,
              title: 'Entschlüsselung nur in der Praxis',
              text: 'Der private Schlüssel verbleibt beim Praxisteam. Kalender und Wartelisten-Benachrichtigungen im Dashboard werden lokal im Browser entschlüsselt.',
            },
            {
              icon: Zap,
              title: 'Automatisierung trotz Verschlüsselung',
              text: 'Die Smart-Fill-Logik arbeitet ausschließlich mit Terminzeiten und verschlüsselten Datensätzen. Bestätigungs- und Wartelisten-Links sind Einmal-Tokens (SHA-256-gehasht gespeichert), die nach Nutzung ungültig werden.',
            },
            {
              icon: MailCheck,
              title: 'Hosting und Entwicklung in Deutschland',
              text: 'Abrechnung ohne Provisionsmodell pro Patiententermin — es entsteht kein dauerhaft auswertbares Patientenprofil beim Anbieter.',
            },
          ].map((item) => (
            <li key={item.title} className="flex gap-4">
              <div className={uiClasses.iconBox}>
                <item.icon className="size-5" />
              </div>
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[0.95rem] leading-relaxed text-muted-foreground">
          {page.localParagraph}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold tracking-tight">
          Häufige Fragen zur Smart-Fill Warteliste
        </h2>
        <div className="mt-6 space-y-4">
          {page.faqs.map((faq) => (
            <article key={faq.question} className={`${uiClasses.glassCard} p-5`}>
              <h3 className="font-semibold">{faq.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className={`${uiClasses.glassCard} flex flex-col items-start gap-4 border-primary/25 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Terminausfälle in {page.city} automatisch nachbesetzen
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-primary" />
            Kostenlos starten — ohne Einrichtungsgebühr, ohne Provision pro Termin.
          </p>
        </div>
        <Button asChild className="shrink-0 gap-2 shadow-sm shadow-primary/20">
          <Link href="/register">
            Praxis anlegen
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </main>
  );
}
