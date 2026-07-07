import type { MetadataRoute } from 'next';
import { CITY_LANDING_PAGES, cityLandingPath } from '@/lib/seo/city-landing-pages';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const cityPages: MetadataRoute.Sitemap = CITY_LANDING_PAGES.map((page) => ({
    url: `${SITE_URL}${cityLandingPath(page.slug)}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/impressum`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    ...cityPages,
  ];
}
