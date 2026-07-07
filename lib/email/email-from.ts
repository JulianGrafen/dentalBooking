/** Validates EMAIL_FROM before calling Resend. Returns a user-facing error or null. */
export function validateEmailFrom(from: string | undefined): string | null {
  if (!from?.trim()) {
    return 'EMAIL_FROM ist nicht gesetzt — in Vercel unter Environment Variables hinterlegen.';
  }

  const normalized = from.trim();

  if (normalized.includes('@resend.dev')) {
    return (
      'EMAIL_FROM nutzt noch den Resend-Testabsender (onboarding@resend.dev). ' +
      'In Vercel auf Ihre verifizierte Domain umstellen, z. B. teeth.al <noreply@teethal.de>.'
    );
  }

  const emailMatch = normalized.match(/<([^>]+)>$/) ?? normalized.match(/(\S+@\S+)/);
  const email = emailMatch?.[1] ?? emailMatch?.[0];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return `EMAIL_FROM hat ein ungültiges Format: „${normalized}“. Beispiel: teeth.al <noreply@teethal.de>`;
  }

  return null;
}
