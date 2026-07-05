import { describe, expect, it } from 'vitest';
import { needsMfaVerification, normalizeTotpCode } from './mfa';

describe('needsMfaVerification', () => {
  it('returns true when AAL2 is required but not yet reached', () => {
    expect(
      needsMfaVerification({ currentLevel: 'aal1', nextLevel: 'aal2' }),
    ).toBe(true);
  });

  it('returns false when already at AAL2', () => {
    expect(
      needsMfaVerification({ currentLevel: 'aal2', nextLevel: 'aal2' }),
    ).toBe(false);
  });

  it('returns false when MFA is not enrolled', () => {
    expect(
      needsMfaVerification({ currentLevel: 'aal1', nextLevel: 'aal1' }),
    ).toBe(false);
  });
});

describe('normalizeTotpCode', () => {
  it('strips whitespace and limits to 6 digits', () => {
    expect(normalizeTotpCode('123 456')).toBe('123456');
    expect(normalizeTotpCode('1234567890')).toBe('123456');
  });
});
