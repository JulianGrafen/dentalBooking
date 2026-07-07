import { describe, expect, it } from 'vitest';
import { validateEmailFrom } from '@/lib/email/email-from';
import { mapResendError } from '@/lib/email/resend-errors';

describe('validateEmailFrom', () => {
  it('rejects resend.dev sandbox sender', () => {
    expect(validateEmailFrom('teeth.al <onboarding@resend.dev>')).toContain('Vercel');
  });

  it('accepts verified domain sender', () => {
    expect(validateEmailFrom('teeth.al <noreply@teethal.de>')).toBeNull();
  });
});

describe('mapResendError', () => {
  it('explains Resend sandbox recipient restriction', () => {
    const message = mapResendError(
      '{"message":"You can only send testing emails to your own email address (ju.liangraefen@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains"}',
    );

    expect(message).toContain('ju.liangraefen@gmail.com');
    expect(message).toContain('EMAIL_FROM');
  });

  it('names unverified domain from JSON error', () => {
    const message = mapResendError(
      '{"statusCode":403,"message":"The teethal.de domain is not verified. Please, add and verify your domain on https://resend.com/domains"}',
    );

    expect(message).toContain('teethal.de');
    expect(message).toContain('EMAIL_FROM');
  });
});
