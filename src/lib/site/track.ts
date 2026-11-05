/**
 * Events from a restaurant's website to the restaurant's own tags - the ones
 * set in Site builder > Integrations and loaded by SiteTracking. Each call
 * goes to whichever of them is present: GTM's dataLayer, GA4's gtag, the Meta
 * pixel. Nothing is sent when none are.
 *
 * Purchase and Lead carry an event id ("order-42") that core-api also gives
 * the Conversions API, so Meta counts the browser and server halves as one.
 */

export interface SiteTags {
  gtm_id: string | null;
  ga4_id: string | null;
  meta_pixel_id: string | null;
  clarity_id: string | null;
  /** core-api sends GA4 purchases itself: the browser must not as well. */
  ga4_server: boolean;
}

type Item = { id: number | string; name: string; price: number; quantity: number };

type Win = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};

const META: Record<string, string> = { add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase', generate_lead: 'Lead' };

export function siteTrack(
  event: 'add_to_cart' | 'begin_checkout' | 'purchase' | 'generate_lead',
  data: { value?: number; currency?: string; items?: Item[]; transactionId?: string; eventId?: string; gaServer?: boolean },
): void {
  if (typeof window === 'undefined') return;
  const w = window as Win;
  const items = (data.items ?? []).map((i) => ({ item_id: String(i.id), item_name: i.name, price: i.price, quantity: i.quantity }));
  const params = { currency: data.currency, value: data.value, transaction_id: data.transactionId, items };

  try {
    w.dataLayer?.push({ ecommerce: null });
    w.dataLayer?.push({ event, event_id: data.eventId, ecommerce: params });
    // Sent server-side when set up, so not counted here a second time.
    if (!(event === 'purchase' && data.gaServer)) w.gtag?.('event', event, params);
    w.fbq?.('track', META[event], {
      value: data.value,
      currency: data.currency,
      content_type: 'product',
      contents: (data.items ?? []).map((i) => ({ id: String(i.id), quantity: i.quantity })),
    }, data.eventId ? { eventID: data.eventId } : undefined);
  } catch {
    // A broken tag must never break ordering.
  }
}

function cookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** What core-api needs to match a server-side conversion to this visitor. */
export function trackingContext(): { fbp: string | null; fbc: string | null; ga_client_id: string | null; page_url: string } {
  const ga = cookie('_ga');
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  return {
    fbp: cookie('_fbp'),
    fbc: cookie('_fbc') ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null),
    // _ga is "GA1.1.<client id>"; the Measurement Protocol wants the id.
    ga_client_id: ga && /^GA\d\.\d\.(\d+\.\d+)$/.test(ga) ? ga.replace(/^GA\d\.\d\./, '') : null,
    page_url: window.location.href.slice(0, 1000),
  };
}
