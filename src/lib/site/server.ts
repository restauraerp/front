import type { Section, SiteMenuData, SiteRestaurant, SiteReview, SiteSocialLink } from './types';
import type { SiteTheme } from './themes';

/**
 * Server-side reads for the public site.
 *
 * Not fetchApi: that builds on NEXT_PUBLIC_API_URL, which is the browser's
 * relative /api/v1 and means nothing to a server request. API_INTERNAL_URL is
 * the address the Next server reaches core-api on - the same one next.config
 * rewrites /api/v1 to.
 */
const API = `${(process.env.API_INTERNAL_URL || 'http://127.0.0.1:8029').replace(/\/$/, '')}/api/v1`;

export interface SitePageData {
  restaurant: SiteRestaurant;
  theme: SiteTheme;
  pages: { slug: string; title: string }[];
  page: {
    title: string;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
    sections: Section[];
  };
  reviews: SiteReview[];
  social: SiteSocialLink[];
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** A published page of a restaurant's site, or null when there is none. */
export function loadSitePage(code: string, slug: string): Promise<SitePageData | null> {
  return get<SitePageData>(`/site/${encodeURIComponent(code)}${slug ? `/${encodeURIComponent(slug)}` : ''}`);
}

/** What live sections draw from - the same data as the online order page. */
export function loadSiteMenu(code: string): Promise<SiteMenuData | null> {
  return get<SiteMenuData>(`/order/${encodeURIComponent(code)}`);
}
