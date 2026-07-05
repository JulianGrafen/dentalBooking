/** Canonical site URL — override per environment via NEXT_PUBLIC_SITE_URL. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://teeth.al';

export function getBookingUrl(slug: string): string {
  return `${SITE_URL}/book/${slug}`;
}
