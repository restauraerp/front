import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SiteFrame, SiteSection } from '@/components/site/Sections';
import { loadSiteMenu, loadSitePage } from '@/lib/site/server';
import type { SiteContext } from '@/lib/site/types';

/**
 * A restaurant's public website, built in the site builder.
 *
 * Reached two ways, served by this one page:
 *   - /{code}/site/{page}           - the path form, handy locally
 *   - {code}.{SITE_BASE_DOMAIN}/{page} - the subdomain, which src/proxy.ts
 *     rewrites to the path form and marks with x-site-base: ''
 *
 * Rendered on the server so search engines see the content. Live sections
 * read the restaurant's data as the page renders, so a price changed in the
 * catalog is on the site straight away.
 */
type Params = { code: string; slug?: string[] };

/** Sections that draw on the menu data (products, categories, branches). */
const LIVE_TYPES = ['menu', 'branches', 'featured', 'reservations'];

async function basePath(code: string): Promise<string> {
  const base = (await headers()).get('x-site-base');
  return base ?? `/${code}/site`;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { code, slug } = await params;
  const data = await loadSitePage(code, (slug ?? []).join('/'));
  if (!data) return { title: 'Not found' };

  const title = data.page.meta_title
    || (data.page.title && data.page.title !== 'Home' ? `${data.page.title} · ${data.restaurant.name}` : data.restaurant.name);
  const description = data.page.meta_description
    || `${data.restaurant.name}${data.restaurant.address ? ` - ${data.restaurant.address}` : ''}. Menu, branches and online ordering.`;

  // Link previews need an absolute address; build it from the host the page
  // was asked for, so it is right on a subdomain and on the path form alike.
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const origin = host ? `${h.get('x-forwarded-proto') || 'https'}://${host}` : undefined;
  const image = data.page.og_image ?? data.restaurant.logo_url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: data.restaurant.name,
      type: 'website',
      ...(image && origin ? { images: [`${origin}/storage/${image}`] } : {}),
    },
  };
}

export default async function RestaurantSitePage({ params }: { params: Promise<Params> }) {
  const { code, slug } = await params;
  if ((slug?.length ?? 0) > 1) notFound();

  const data = await loadSitePage(code, (slug ?? []).join('/'));
  if (!data) notFound();

  const needsMenu = data.page.sections.some((s) => LIVE_TYPES.includes(s.type));

  const ctx: SiteContext = {
    restaurant: data.restaurant,
    menu: needsMenu ? await loadSiteMenu(code) : null,
    reviews: data.reviews ?? [],
    social: data.social ?? [],
    basePath: await basePath(code),
    orderUrl: `/order/${encodeURIComponent(code)}`,
  };

  return (
    <SiteFrame ctx={ctx} theme={data.theme} pages={data.pages.length ? data.pages : [{ slug: '', title: 'Home' }]}>
      {data.page.sections.map((section) => (
        <SiteSection key={section.id} section={section} ctx={ctx} />
      ))}
    </SiteFrame>
  );
}
