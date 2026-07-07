'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { hasPrivateKey } from '@/lib/practice-key';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function EncryptionKeyNotice() {
  const [needsRestore, setNeedsRestore] = useState(false);

  useEffect(() => {
    setNeedsRestore(!hasPrivateKey());
  }, []);

  if (!needsRestore) return null;

  return (
    <Card className="mb-8 border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl">Patientendaten verschlüsselt</CardTitle>
            <CardDescription>
              Sie sind angemeldet. Auf diesem Gerät fehlt nur der lokale Schlüssel, um
              Patientennamen und Kontaktdaten zu lesen.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Die Wiederherstellung ist optional und nur nötig, wenn Sie Patientendaten auf diesem
          Gerät entschlüsseln möchten.
        </p>
        <Button asChild variant="outline">
          <Link href="/unlock">Daten wiederherstellen</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
