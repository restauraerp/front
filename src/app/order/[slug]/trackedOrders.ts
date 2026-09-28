/**
 * The orders this browser placed at one restaurant, kept in a cookie.
 *
 * Each entry is the order id and the tracking key the API handed back when it
 * was placed - the key is what proves the order is ours, so without it the id
 * shows nothing. A cookie rather than localStorage so it outlives a cleared
 * site cache the way a customer expects "my orders" to, and one cookie per
 * restaurant so two restaurants' links never see each other's orders.
 */

export type TrackedOrder = { id: number; key: string };

/** Enough for a regular's recent history; the API refuses more than this. */
const MAX_TRACKED = 20;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function cookieName(slug: string): string {
  return `restora_orders_${slug.replace(/[^a-z0-9_-]/gi, '')}`;
}

export function readTrackedOrders(slug: string): TrackedOrder[] {
  if (typeof document === 'undefined') return [];
  const name = cookieName(slug);
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  if (!match) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(name.length + 1)));
    return Array.isArray(parsed)
      ? parsed.filter((o): o is TrackedOrder => typeof o?.id === 'number' && typeof o?.key === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeTrackedOrders(slug: string, orders: TrackedOrder[]): void {
  if (typeof document === 'undefined') return;
  const value = encodeURIComponent(JSON.stringify(orders.slice(0, MAX_TRACKED)));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${cookieName(slug)}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/** Newest first, so the cap drops the oldest order rather than the one just placed. */
export function trackOrder(slug: string, order: TrackedOrder): TrackedOrder[] {
  const next = [order, ...readTrackedOrders(slug).filter((o) => o.id !== order.id)];
  writeTrackedOrders(slug, next);
  return next.slice(0, MAX_TRACKED);
}
