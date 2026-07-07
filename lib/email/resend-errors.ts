/** Maps Resend API errors to actionable German messages for practice staff. */
export function mapResendError(detail: string): string {
  const normalized = detail.toLowerCase();

  if (
    normalized.includes('only send testing emails to your own email') ||
    normalized.includes('verify a domain')
  ) {
    const ownEmailMatch = detail.match(
      /your own email address \(([^)]+)\)/i,
    );
    const ownEmail = ownEmailMatch?.[1];

    return ownEmail
      ? `Resend-Testmodus: E-Mails gehen nur an ${ownEmail}. Für Patienten-Mails Domain bei resend.com/domains verifizieren und EMAIL_FROM anpassen.`
      : 'Resend-Testmodus: E-Mails gehen nur an Ihre Resend-Konto-E-Mail. Domain verifizieren für Patienten-Versand.';
  }

  if (normalized.includes('invalid from') || normalized.includes('from address')) {
    return 'Absender ungültig — EMAIL_FROM muss eine verifizierte Domain bei Resend nutzen.';
  }

  if (normalized.includes('invalid api key') || normalized.includes('unauthorized')) {
    return 'Resend API-Key ungültig — RESEND_API_KEY in .env.local prüfen.';
  }

  if (normalized.includes('domain is not verified')) {
    return 'E-Mail-Domain bei Resend noch nicht verifiziert — siehe resend.com/domains.';
  }

  return `E-Mail-Versand fehlgeschlagen: ${detail}`;
}
