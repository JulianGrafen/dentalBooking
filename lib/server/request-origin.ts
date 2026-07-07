import { headers } from 'next/headers';

/** Current request origin — server-only helper for dashboard booking links. */
export async function getRequestOrigin(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  if (!host) return 'http://localhost:3000';

  const proto =
    headerStore.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return `${proto}://${host.split(',')[0]!.trim()}`;
}
