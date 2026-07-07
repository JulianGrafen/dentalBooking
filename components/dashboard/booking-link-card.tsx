'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, Link2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BookingLinkCardProps {
  bookingUrl: string;
  bookingReady?: boolean;
}

const COPY_FEEDBACK_MS = 2000;

export function BookingLinkCard({ bookingUrl, bookingReady = true }: BookingLinkCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success('Link kopiert', {
        description: 'Teilen Sie ihn auf Ihrer Website oder per E-Mail.',
      });
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      toast.error('Kopieren fehlgeschlagen', {
        description: 'Bitte markieren und kopieren Sie den Link manuell.',
      });
    }
  }

  return (
    <div
      data-tour="booking-link"
      className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-card p-6 shadow-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Link2 className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Buchungslink
            </span>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">
            Ihr öffentlicher Buchungslink
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Shield className="size-3.5 shrink-0 text-primary" />
            Ende-zu-Ende-verschlüsselt · ohne Patienten-Konto
          </p>
        </div>
      </div>

      {!bookingReady && (
        <p className="relative mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
          Buchung noch nicht aktiv: Der Verschlüsselungs-Schlüssel Ihrer Praxis fehlt.
          Bitte registrieren Sie die Praxis erneut oder kontaktieren Sie den Support.
        </p>
      )}

      <div className="relative mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          value={bookingUrl}
          onFocus={(event) => event.target.select()}
          className="h-11 border-primary/20 bg-card/90 font-mono text-sm"
          aria-label="Öffentlicher Buchungslink"
        />
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" className="h-11 gap-2">
            <Link href={bookingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Öffnen
            </Link>
          </Button>
          <Button onClick={handleCopy} className="h-11 gap-2 shadow-sm">
            <Copy className="size-4" />
            {copied ? 'Kopiert!' : 'Kopieren'}
          </Button>
        </div>
      </div>
    </div>
  );
}
