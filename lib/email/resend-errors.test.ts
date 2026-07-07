import { describe, expect, it } from 'vitest';
import { mapResendError } from '@/lib/email/resend-errors';

describe('mapResendError', () => {
  it('explains Resend sandbox recipient restriction', () => {
    const message = mapResendError(
      '{"message":"You can only send testing emails to your own email address (ju.liangraefen@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains"}',
    );

    expect(message).toContain('ju.liangraefen@gmail.com');
    expect(message).toContain('resend.com/domains');
  });
});
