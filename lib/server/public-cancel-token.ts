import { createHash, randomBytes } from 'node:crypto';

export const PUBLIC_CANCEL_TOKEN_BYTES = 32;

export function createPublicCancelToken(): string {
  return randomBytes(PUBLIC_CANCEL_TOKEN_BYTES).toString('base64url');
}

export function hashPublicCancelToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isPublicCancelToken(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

export function buildPublicCancelUrl(origin: string, token: string): string {
  const url = new URL('/termin/absagen', origin);
  url.searchParams.set('token', token);
  return url.toString();
}
