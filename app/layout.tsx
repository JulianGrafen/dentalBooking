import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppBackground } from "@/components/layout/app-background";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "teeth.al — Online-Terminbuchung & Terminverwaltung für Zahnarztpraxen",
    template: "%s | teeth.al",
  },
  description:
    "DSGVO-konforme Online-Terminbuchung für Zahnarztpraxen mit Ende-zu-Ende-Verschlüsselung. Terminausfälle reduzieren mit Recall-System und Smart-Fill-Warteliste — ohne Patienten-Account.",
  applicationName: "teeth.al",
  keywords: [
    "Online-Terminbuchung Zahnarztpraxis",
    "Terminverwaltung Zahnarzt Software",
    "DSGVO-konforme Praxissoftware Zahnarzt",
    "Zahnarzt Termine online buchen ohne Konto",
    "Terminausfälle Zahnarztpraxis reduzieren",
    "Recall-System Prophylaxe Zahnarzt",
    "Warteliste kurzfristige Termine Zahnarzt",
    "Praxiskalender mit Ende-zu-Ende-Verschlüsselung",
    "Zahnarztpraxis Terminplaner mehrere Mitarbeiter",
  ],
  authors: [{ name: "teeth.al" }],
  creator: "teeth.al",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "teeth.al",
    locale: "de_DE",
    title: "teeth.al — Online-Terminbuchung & Terminverwaltung für Zahnarztpraxen",
    description:
      "Ende-zu-Ende-verschlüsselte Online-Terminbuchung, Recall-Engine und Smart-Fill für Zahnarztpraxen. DSGVO-konform, teamfähig, ohne Patienten-Account.",
  },
  twitter: {
    card: "summary_large_image",
    title: "teeth.al — Sichere Online-Terminbuchung für Zahnarztpraxen",
    description:
      "DSGVO-konforme Praxissoftware mit E2EE: Online-Buchung, Recall und Smart-Fill gegen Terminausfälle.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppBackground>
          <SiteHeader />
          <div className="flex-1">{children}</div>
        </AppBackground>
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
