/**
 * The site builder's data, as core-api serves it.
 *
 * A page is a list of sections; each section is a component type and its
 * settings. Which types exist, and what each setting may be, is defined once
 * in core-api (App\Support\Site\SiteSections) - the editor reads that from
 * GET /site-builder/components, and these types mirror it for rendering.
 */

export type SectionProps = Record<string, string | boolean | number | number[] | string[]>;

export interface Section {
  id: string;
  type: string;
  props: SectionProps;
}

export interface FieldDefinition {
  type: 'text' | 'textarea' | 'enum' | 'bool' | 'image' | 'images' | 'categories' | 'products' | 'locations' | 'page';
  label: string;
  max?: number;
  options?: string[];
  default: string | boolean | number[] | string[];
}

export interface ComponentDefinition {
  label: string;
  kind: 'live' | 'content';
  description: string;
  /** The module a restaurant needs for this component (Reservations: crm). */
  requires?: string;
  fields: Record<string, FieldDefinition>;
}

export interface SiteRestaurant {
  code: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
}

/** What live sections draw from: core-api's GET /order/{code}. */
export interface SiteMenuData {
  categories: { id: number; name: string }[];
  products: { id: number; name: string; description: string | null; price: number; category_id: number | null; image_url: string | null }[];
  locations: { id: number; name: string; address: string | null; phone: string | null; map_url?: string | null }[];
}

/** A page in the site's navigation. */
export interface SiteNavPage {
  slug: string;
  title: string;
  /** Which standard page it is (menu, order...), null for the owner's own. */
  kind?: string | null;
}

export interface SiteReview {
  author: string | null;
  rating: number;
  text: string | null;
  photo?: string | null;
  time?: string | null;
  source?: string;
}

/** A venue the restaurant hires out for events (Venues), as the site shows it. */
export interface SiteVenue {
  id: number;
  name: string;
  description: string | null;
  capacity: number | null;
  min_guests: number | null;
  price: number;
  rent_type: 'per_event' | 'per_hour';
  location: string | null;
}

/** A Facebook or Instagram post, as stored by core-api's hourly sync. */
export interface SitePost {
  text: string | null;
  image: string | null;
  url: string | null;
  type: string | null;
  time: string | null;
}

export interface SitePosts {
  facebook: SitePost[];
  instagram: SitePost[];
}

/** Where Follow buttons go - the connected Page and Instagram account. */
export interface SiteSocialAccounts {
  facebook: { name: string; url: string } | null;
  instagram: { name: string; url: string } | null;
}

/** The overall rating: Google's own when the profile is connected. */
export interface SiteReviewSummary {
  rating: number | null;
  total: number;
  write_review_url: string | null;
  google_url: string | null;
}

export interface SiteSocialLink {
  platform: string;
  url: string;
}

export interface SiteContext {
  restaurant: SiteRestaurant;
  menu: SiteMenuData | null;
  reviews: SiteReview[];
  reviewSummary?: SiteReviewSummary | null;
  posts?: SitePosts | null;
  venues?: SiteVenue[];
  socialAccounts?: SiteSocialAccounts | null;
  social: SiteSocialLink[];
  /** In the editor's preview: forms do not submit and links do not navigate. */
  preview?: boolean;
  /** Where the site's own links start: '' on a subdomain, '/{code}/site' otherwise. */
  basePath: string;
  /** Where Order buttons go: the site's own ordering page, or the order link. */
  orderUrl: string;
  /** Where Menu buttons go: the site's Menu page, if it has one. */
  menuUrl?: string;
}

export const storageUrl = (path: string | null | undefined): string | null =>
  !path ? null : /^https?:\/\//.test(path) ? path : `/storage/${path}`;
