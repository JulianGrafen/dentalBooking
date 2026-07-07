import { describe, expect, it } from 'vitest';
import {
  buildPublicCancelUrl,
  createPublicCancelToken,
  hashPublicCancelToken,
  isPublicCancelToken,
} from '@/lib/server/public-cancel-token';

describe('public cancellation tokens', () => {
  it('creates URL-safe tokens and stable hashes', () => {
    const token = createPublicCancelToken();

    expect(isPublicCancelToken(token)).toBe(true);
    expect(hashPublicCancelToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPublicCancelToken(token)).toBe(hashPublicCancelToken(token));
  });

  it('builds public cancellation URL', () => {
    const url = buildPublicCancelUrl('https://teethal.de', 'abc123_TOKEN');

    expect(url).toBe('https://teethal.de/termin/absagen?token=abc123_TOKEN');
  });
});
