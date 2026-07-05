export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  sent: boolean;
  mode: 'resend' | 'simulated';
}

/**
 * Sends transactional email via Resend when configured, otherwise logs locally.
 * RESEND_API_KEY + EMAIL_FROM must be set for real delivery.
 */
export async function sendEmail(message: OutboundEmail): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.log(`[email] SIMULATED -> ${message.to} | ${message.subject}\n${message.body}`);
    return { sent: false, mode: 'simulated' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.body,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${detail}`);
  }

  return { sent: true, mode: 'resend' };
}
