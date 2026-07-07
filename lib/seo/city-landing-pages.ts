/**
 * Programmatic SEO datasets for city landing pages
 * (/zahnarzt-terminsoftware/[stadt]).
 *
 * Doorway-page protection: every city MUST ship an individually written
 * `localParagraph` — pure [Ort] substitution is not allowed.
 */

export interface CityLandingFaq {
  question: string;
  answer: string;
}

export interface CityLandingPage {
  slug: string;
  city: string;
  region: string;
  /** Max ~45 words — direct answer for AI overviews / featured snippets. */
  aeoAnswer: string;
  /** City-specific paragraph, individually written per city. */
  localParagraph: string;
  faqs: CityLandingFaq[];
}

export const CITY_LANDING_BASE_PATH = '/zahnarzt-terminsoftware';

export const CITY_LANDING_PAGES: CityLandingPage[] = [
  {
    slug: 'euskirchen',
    city: 'Euskirchen',
    region: 'Nordrhein-Westfalen',
    aeoAnswer:
      'Zahnärzte in Euskirchen verhindern kurzfristige Terminausfälle, indem abgesagte Termine automatisch an eine digitale Warteliste vergeben werden. Software wie teeth.al benachrichtigt wartende Patienten sofort per E-Mail; der erste, der bestätigt, rückt in den freien Slot nach — ohne Telefonaufwand für das Praxisteam.',
    localParagraph:
      'Für Praxen in Euskirchen und dem Kreis Euskirchen, die zwischen den Datenschutzanforderungen der Zahnärztekammer Nordrhein und wirtschaftlichem Druck durch Terminausfälle stehen, löst diese Architektur den scheinbaren Zielkonflikt: volle Automatisierung der Terminvergabe bei null Klartext-Datenhaltung beim Dienstleister. Gerade im ländlich geprägten Einzugsgebiet zwischen Eifel und Köln-Bonner Raum, wo Patienten längere Anfahrten einplanen, wiegt jeder verfallene Termin doppelt — und wird über die Warteliste besonders zuverlässig nachbesetzt.',
    faqs: [
      {
        question:
          'Wie schnell amortisiert sich eine Software gegen Terminausfälle in der Zahnarztpraxis?',
        answer:
          'Bereits ein einziger automatisch nachbesetzter Termin pro Woche deckt bei durchschnittlich 150–400 € Honorarumsatz die Monatskosten typischer Terminsoftware mehrfach. Praxen mit zwei bis drei kurzfristigen Absagen pro Woche erreichen den Break-even in der Regel innerhalb des ersten Monats.',
      },
      {
        question: 'Kann der Betreiber von teeth.al Patientendaten meiner Praxis einsehen?',
        answer:
          'Nein — Patientendaten werden im Browser des Patienten verschlüsselt, bevor sie den Server erreichen, und nur die Praxis besitzt den privaten Schlüssel. Der Betreiber speichert und sieht ausschließlich verschlüsselte Datensätze und Terminzeiten (Zero-Knowledge-Architektur).',
      },
      {
        question: 'Muss der Patient bei einem frei gewordenen Termin nochmal anrufen?',
        answer:
          'Nein, der Patient erhält automatisch eine E-Mail mit einem einmalig gültigen Bestätigungslink für den frei gewordenen Slot. Nach Klick und Bestätigung steht der Termin sofort verbindlich im Praxiskalender — das Praxisteam sieht die Buchung ohne weiteres Zutun.',
      },
    ],
  },
];

export function findCityLandingPage(slug: string): CityLandingPage | null {
  return CITY_LANDING_PAGES.find((page) => page.slug === slug) ?? null;
}

export function cityLandingPath(slug: string): string {
  return `${CITY_LANDING_BASE_PATH}/${slug}`;
}
