/**
 * Which restaurant (tenant) this browser session is talking to.
 *
 * The API resolves the tenant from the auth token for anything authenticated,
 * so the header below is advisory there - it is validated against the token and
 * a mismatch is rejected with a 403. It is load-bearing for two cases:
 *
 *   1. Login. Email addresses are unique per tenant, not globally, so
 *      "manager@..." alone does not identify a user. The restaurant code has to
 *      travel with the credentials.
 *
 *   2. The public storefront (menu, booking, orders), which has no token at all
 *      and gets its tenant from NEXT_PUBLIC_TENANT_ID at build time.
 */

export const TENANT_COOKIE = 'tenant';

/** Storefront fallback: one deployment serves one restaurant's public site. */
export const DEFAULT_TENANT =
  (process.env.NEXT_PUBLIC_TENANT_ID || '').replace(/^"|"$/g, '') || '';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * The tenant to send with the next request. The cookie (set at login) wins so
 * that a staff member signed into one restaurant is never silently talking to
 * the storefront default configured for another.
 */
export function getTenant(serverTenant?: string): string | null {
  return serverTenant || readCookie(TENANT_COOKIE) || DEFAULT_TENANT || null;
}

/**
 * The restaurant this browser last signed into, if any.
 *
 * Deliberately does NOT fall back to DEFAULT_TENANT the way getTenant() does.
 * This is for prefilling the login form, where the storefront's build-time
 * tenant is the wrong answer: it would show every visitor a restaurant code
 * they have no account with (and, on the demo box, hand out the demo
 * restaurant's code to people who never asked for the demo).
 */
export function getSavedTenant(): string | null {
  return readCookie(TENANT_COOKIE);
}

export function setTenant(slug: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TENANT_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearTenant(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TENANT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Namespaces a browser-storage key to the active tenant.
 *
 * Keys like `restora_active_location_id` hold an id that only means anything
 * inside one restaurant. Shared across tenants, signing into a second
 * restaurant on the same browser restores a branch id that belongs to the
 * first - which the API then rejects, or worse, silently treats as "no branch".
 */
export function tenantKey(key: string): string {
  const tenant = getTenant() || 'unknown';
  return `${key}::${tenant}`;
}
