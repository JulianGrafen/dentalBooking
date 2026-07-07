function extractResendMessage(detail: string): string {
  try {
    const parsed = JSON.parse(detail) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    // Plain-text error body from Resend.
  }

  return detail;
}

/** Maps Resend API errors to actionable German messages for practice staff. */
export function mapResendError(detail: string): string {
  const message = extractResendMessage(detail);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('only send testing emails to your own email') ||
    (normalized.includes('verify a domain') && normalized.includes('testing emails'))
  ) {
    const ownEmailMatch = message.match(/your own email address \(([^)]+)\)/i);
    const ownEmail = ownEmailMatch?.[1];

    return ownEmail
      ? `Resend-Testmodus: E-Mails gehen nur an ${ownEmail}. EMAIL_FROM in Vercel auf Ihre verifizierte Domain setzen.`
      : 'Resend-Testmodus aktiv — EMAIL_FROM in Vercel auf Ihre verifizierte Domain setzen.';
  }

  if (normalized.includes('domain is not verified')) {
    const domainMatch = message.match(/the ([^\s]+) domain is not verified/i);
    const domain = domainMatch?.[1];

    return domain
      ? `Die Absender-Domain „${domain}“ ist bei Resend nicht verifiziert — prüfen Sie EMAIL_FROM in Vercel (z. B. noreply@${domain}).`
      : 'Die Absender-Domain in EMAIL_FROM ist bei Resend nicht verifiziert — prüfen Sie die Vercel-Umgebungsvariable.';
  }

  if (normalized.includes('invalid from') || normalized.includes('from address')) {
    return 'Absender ungültig — EMAIL_FROM muss eine Adresse Ihrer verifizierten Resend-Domain sein.';
  }

  if (normalized.includes('invalid api key') || normalized.includes('unauthorized')) {
    return 'Resend API-Key ungültig — RESEND_API_KEY in Vercel prüfen (gleiches Resend-Konto wie die Domain).';
  }

  return `E-Mail-Versand fehlgeschlagen: ${message}`;
}
