import { validateEmailFrom } from '@/lib/email/email-from';
import { mapResendError } from '@/lib/email/resend-errors';

export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  sent: boolean;
  mode: 'resend' | 'simulated';
  detail?: string;
}

/**
 * Sends transactional email via Resend when configured, otherwise logs locally.
 * RESEND_API_KEY + EMAIL_FROM must be set for real delivery.
 *
 * Resend sandbox (`onboarding@resend.dev`) only delivers to the Resend account
 * owner until a domain is verified — see lib/email/resend-errors.ts.
 */
export async function sendEmail(message: OutboundEmail): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey) {
    console.log(`[email] SIMULATED -> ${message.to} | ${message.subject}\n${message.body}`);
    return {
      sent: false,
      mode: 'simulated',
      detail: 'RESEND_API_KEY fehlt',
    };
  }

  const fromError = validateEmailFrom(from);
  if (fromError) {
    throw new Error(fromError);
  }

  console.log(`[email] sending via Resend from=${from} to=${message.to}`);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from!,
      to: [message.to],
      subject: message.subject,
      text: message.body,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(mapResendError(detail));
  }

  return { sent: true, mode: 'resend' };
}

export function emailActionMessage(
  action: 'bestätigt' | 'storniert' | 'verschoben',
  email: SendEmailResult | undefined,
): string {
  if (email?.sent) {
    return `Termin ${action} — Patient/in per E-Mail informiert`;
  }

  if (email?.mode === 'simulated') {
    return `Termin ${action} — E-Mail simuliert (${email.detail ?? 'RESEND nicht konfiguriert'})`;
  }

  return `Termin ${action}`;
}
