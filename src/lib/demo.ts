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

/** Whether this browser is in a demo session. Client-side only. */
export function isDemoSession(): boolean {
  if (typeof document === 'undefined') return false;

  return document.cookie
    .split('; ')
    .some((entry) => entry.startsWith(`${DEMO_COOKIE}=`));
}
