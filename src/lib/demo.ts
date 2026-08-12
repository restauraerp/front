/**
 * Demo mode is requested per visit, with ?demo=true, and answered by the API:
 * GET /api/v1/demo-config returns the demo restaurant's code and credentials,
 * or 404s when the API is not a demo deployment. Nothing about the demo is
 * baked into this build, so enabling or rotating it never needs a rebuild here.
 */

/** The query parameter that asks for a demo login. */
export const DEMO_PARAM = 'demo';

/**
 * Set by the middleware when a visit arrives with ?demo=true. The query string
 * is gone by the time login redirects to /admin, so analytics needs something
 * that survives the hop.
 */
export const DEMO_COOKIE = 'demo_session';

/**
 * Facebook's identifiers, handed over by the marketing site in the demo link.
 *
 * `_fbp` and `_fbc` are per-domain cookies, so the ones set on the marketing
 * site are invisible here. Without them a demo Lead reaches Meta with nothing
 * to match against the ad click that produced it, so they are carried across
 * in the query string and kept for the rest of the visit.
 */
export const FBP_COOKIE = 'demo_fbp';
export const FBC_COOKIE = 'demo_fbc';

/**
 * Identifies the verification session that produced this demo visit, when the
 * visitor arrived through the marketing site's verification workflow rather
 * than a bare link.
 *
 * Opaque to this app: it is issued and read by the website, and only carried
 * here so the 60-second Lead can be attributed to a real person. Travels the
 * same road as the Facebook identifiers, and for the same reason.
 */
export const LEAD_COOKIE = 'demo_lead_ref';

/** Reads a cookie by name. Client-side only. */
export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** Whether this browser is in a demo session. Client-side only. */
export function isDemoSession(): boolean {
  if (typeof document === 'undefined') return false;

  return document.cookie
    .split('; ')
    .some((entry) => entry.startsWith(`${DEMO_COOKIE}=`));
}

/**
 * Drops every trace of a demo visit.
 *
 * Called once the API confirms this is not the demo restaurant. Without it the
 * cookie lingers for a day after someone leaves the demo and signs up, which
 * both nags a paying customer to "get your own" and reports them to Facebook as
 * a fresh demo Lead.
 */
export function clearDemoSession(): void {
  if (typeof document === 'undefined') return;

  // `demo_lead_reported` goes with them. It is the guard that says this visit
  // has already been counted, and it is scoped to the visit - leaving it behind
  // after the visit has been declared not-a-demo would suppress the next
  // genuine demo visit from this browser.
  for (const name of [DEMO_COOKIE, FBP_COOKIE, FBC_COOKIE, LEAD_COOKIE, 'demo_lead_reported']) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }
}
