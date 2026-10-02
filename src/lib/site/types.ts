/**
 * The site builder's data, as core-api serves it.
 *
 * A page is a list of sections; each section is a component type and its
 * settings. Which types exist, and what each setting may be, is defined once
 * in core-api (App\Support\Site\SiteSections) - the editor reads that from
 * GET /site-builder/components, and these types mirror it for rendering.
 */

export type SectionProps = Record<string, string | boolean | number | number[]>;

export interface Section {
  id: string;
  type: string;
  props: SectionProps;
}

export interface FieldDefinition {
  type: 'text' | 'textarea' | 'enum' | 'bool' | 'image' | 'categories';
  label: string;
  max?: number;
  options?: string[];
  default: string | boolean | number[];
}

export interface ComponentDefinition {
  label: string;
  kind: 'live' | 'content';
  description: string;
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
  locations: { id: number; name: string; address: string | null; phone: string | null }[];
}

export interface SiteContext {
  restaurant: SiteRestaurant;
  menu: SiteMenuData | null;
  /** Where the site's own links start: '' on a subdomain, '/{code}/site' otherwise. */
  basePath: string;
  /** Online ordering, which lives outside the site pages. */
  orderUrl: string;
}

export const storageUrl = (path: string | null | undefined): string | null =>
  !path ? null : /^https?:\/\//.test(path) ? path : `/storage/${path}`;
