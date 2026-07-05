import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Only marketing pages are crawlable. App surfaces (dashboard, auth flows)
 * and per-practice booking links carry no SEO value and stay out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/unlock',
          '/team',
          '/book',
          '/api',
          '/login/mfa',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
