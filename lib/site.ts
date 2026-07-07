/** Canonical site URL for SEO/metadata — set via NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://teeth.al';

/** Resolves the public app origin for shareable links (booking URLs). Safe for client + server. */
export function resolveSiteUrl(requestOrigin?: string | null): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (requestOrigin) {
    return requestOrigin.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

export function getBookingUrl(slug: string, requestOrigin?: string | null): string {
  return `${resolveSiteUrl(requestOrigin)}/book/${slug}`;
}
