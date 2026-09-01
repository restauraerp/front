import { isDemoSession } from './demo';
import { clearTenant, getTenant } from './tenant';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8029/api/v1';

/**
 * The JSON the API sends with a refusal.
 *
 * `error` is a stable machine-readable code and is safe to branch on; `message`
 * is prose written for a restaurant manager and is not.
 */
export type ApiErrorBody = {
  error?: string;
  message?: string;
  // Subscription refusals (trial_expired, subscription_expired,
  // account_suspended, subscription_cancelled).
  read_only?: boolean;
  reads_allowed?: boolean;
  writes_allowed?: boolean;
  expired_at?: string | null;
  // Plan refusals (module_not_in_plan, outlet_limit_reached).
  module?: string;
  plan?: string;
  plan_name?: string;
  upgrade_to?: string | null;
  outlet_limit?: number | null;
  outlets_used?: number;
  contact?: { email?: string; phone?: string; whatsapp?: string; url?: string };
  // Laravel validation.
  errors?: Record<string, string[]>;
};

/**
 * Thrown by fetchApi for any non-2xx, carrying the parsed body so callers can
 * show the API's own explanation rather than a status code.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody | null,
  ) {
    super(body?.message || `API Request Failed: ${status}`);
    this.name = 'ApiError';
  }

  /** The API refused this because of the tenant's subscription. */
  get isBillingBlock(): boolean {
    return [
      'trial_expired',
      'subscription_expired',
      'account_suspended',
      'subscription_cancelled',
    ].includes(this.body?.error ?? '');
  }

  /** The API refused this because the tenant's plan does not include it. */
  get isPlanBlock(): boolean {
    return ['module_not_in_plan', 'outlet_limit_reached'].includes(this.body?.error ?? '');
  }

  /** Reads still work; only writing is refused. */
  get isReadOnly(): boolean {
    return this.body?.read_only === true;
  }
}

/**
 * A message worth showing a user, for any thrown error.
 *
 * Prefers the API's own prose - it already explains that existing data is safe
 * and how to get writing again - and falls back to something honest rather than
 * a stack trace.
 */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    if (error.status === 422 && error.body?.errors) {
      return Object.values(error.body.errors).flat().join(' ');
    }

    if (error.body?.message) return error.body.message;
    if (error.status === 401) return 'Your session has expired. Please log in again.';
  }

  return fallback;
}

/** Contact details the API attaches to a billing or plan refusal. */
export function apiErrorContact(error: unknown): ApiErrorBody['contact'] | undefined {
  return error instanceof ApiError ? error.body?.contact : undefined;
}

/**
 * For data a screen can live without.
 *
 * Returns the fallback whenever the API refuses the read - the tenant's plan
 * does not include that module, or the signed-in role lacks the permission -
 * and rethrows anything else.
 *
 * This exists because a core screen must not die over an optional one. POS
 * loads its products, settings and customers together; customers are CRM, which
 * Starter does not include, and a single 403 inside Promise.all rejected the
 * whole batch - so the till showed no products at all because the tenant had
 * not bought the customer directory. A missing module should cost you that
 * feature, not the page.
 *
 * Every refusal is treated the same way, not just the plan-shaped ones. A
 * permission added in a later release is not granted to roles that were
 * stamped before it existed, so gating an endpoint quietly turns its callers
 * into 403s - and narrowing this to plan blocks let exactly that blank the
 * till again. Whoever cannot read it gets the fallback.
 */
export async function fetchOptional<T>(
  endpoint: string,
  fallback: T,
  options: RequestInit = {},
): Promise<T> {
  try {
    return (await fetchApi(endpoint, options)) ?? fallback;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.isBillingBlock)) {
      return fallback;
    }

    throw error;
  }
}

/**
 * Set once a dead session has been noticed.
 *
 * A dashboard fires a dozen requests at once, and every one of them comes back
 * 401 together. Without this the first sets the redirect going and the rest keep
 * re-triggering it.
 */
let abandoning = false;

/**
 * Throws away credentials the API has stopped recognising, and starts again.
 *
 * The case this exists for: the demo restaurant gets rebuilt. Its data is
 * dropped and reseeded and its password is rotated, but the browser still holds
 * the token and restaurant code from before. Every request then 401s while the
 * app carries on as though signed in - which rendered a dashboard with an empty
 * sidebar, zeroes in every card and a spinner that never stopped. Nothing said
 * "log in again", because nothing was watching for it.
 *
 * Demo visitors are sent back with `?demo=true` on purpose. That makes the login
 * page re-fetch the credentials from the API, so they arrive with the *current*
 * password rather than the one that was rotated away - which is the difference
 * between this being self-healing and being a dead end.
 */
function abandonDeadSession(): void {
  if (typeof window === 'undefined' || abandoning) return;

  // Already at the door. Redirecting again would be a loop, and the login page
  // legitimately calls the API before anybody is signed in.
  if (window.location.pathname.startsWith('/login')) return;

  abandoning = true;

  document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
  clearTenant();

  const demo = isDemoSession();

  // `replace`, not `assign`: Back should not return to a page that cannot load.
  window.location.replace(demo ? '/login?demo=true&expired=1' : '/login?expired=1');
}

/**
 * Downloads a file from the API, carrying the same auth the JSON calls use.
 *
 * fetchApi cannot do this: it parses every response as JSON and would choke on
 * a CSV. A plain <a href> cannot either - the download would go out without the
 * bearer token and the tenant header, and come back 401. So the bytes are
 * fetched like any other call and handed to the browser as a blob.
 */
export async function downloadApi(endpoint: string, filename: string): Promise<void> {
  let token: string | undefined;

  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
    if (match) token = match[2];
  }

  const headers: Record<string, string> = { Accept: 'text/csv' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const tenant = getTenant();
  if (tenant) headers['X-Tenant-ID'] = tenant;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { cache: 'no-store', headers });

  if (!response.ok) {
    if (response.status === 401) abandonDeadSession();
    throw new ApiError(response.status, null);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Released on the next tick rather than immediately: revoking while the
  // click is still being handled cancels the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function fetchApi(
  endpoint: string,
  options: RequestInit = {},
  serverToken?: string,
  serverTenant?: string,
) {
  let token = serverToken;

  if (!token && typeof document !== 'undefined') {
    // In Client Components, extract token from document.cookie
    const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
    if (match) token = match[2];
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Identifies the restaurant. Required on unauthenticated storefront calls,
  // where there is no token for the API to derive the tenant from; on
  // authenticated calls the API takes the tenant from the token and only checks
  // this against it, so a wrong value is a 403 rather than a way in.
  const tenant = getTenant(serverTenant);
  if (tenant && !headers['X-Tenant-ID']) {
    headers['X-Tenant-ID'] = tenant;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await response.json();
    } catch {
      // Non-JSON error (a proxy timeout, an HTML error page). Leave body null;
      // the message below still says what happened.
    }

    // A session the API no longer recognises is not an error a screen can
    // recover from, so it is handled here rather than left to every caller.
    if (response.status === 401) abandonDeadSession();

    // The body used to be logged and thrown away, so a caller only ever saw
    // "API Request Failed: 403 Forbidden". The API answers a refused write with
    // the reason, whether reads still work and who to contact about paying -
    // none of which could reach the UI. Carry it on the error instead.
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) return null;
  return response.json();
}
