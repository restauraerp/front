import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').toLowerCase();
  const isAppHost = host.startsWith('app.') || host.startsWith('admin.');

  if (isAppHost) {
    return {
      rules: {
        userAgent: '*',
        // Allow crawling so search engines can read the noindex directive
        // and de-index the demo site from Google search results.
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/'],
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/_next/'],
    },
  };
}
