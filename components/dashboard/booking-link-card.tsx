'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface BookingLinkCardProps {
  bookingUrl: string;
}

const COPY_FEEDBACK_MS = 2000;

export function BookingLinkCard({ bookingUrl }: BookingLinkCardProps) {
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
    <Card className="border-primary/30 bg-secondary/40">
      <CardHeader>
        <CardTitle>Ihr öffentlicher Buchungslink</CardTitle>
        <CardDescription>
          Patienten buchen über diesen Link — Ende-zu-Ende-verschlüsselt, ohne Konto.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          value={bookingUrl}
          onFocus={(event) => event.target.select()}
          className="bg-card font-mono text-sm"
          aria-label="Öffentlicher Buchungslink"
        />
        <Button onClick={handleCopy} className="shrink-0">
          {copied ? 'Kopiert!' : 'Link kopieren'}
        </Button>
      </CardContent>
    </Card>
  );
}
