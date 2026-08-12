/**
 * Whether this browser is ours rather than a customer's.
 *
 * Our own visits were being counted in Google Analytics and Meta alongside real
 * ones, which distorts everything downstream - a developer reloading a screen
 * fifty times in an afternoon outnumbers the day's genuine traffic, and every
 * one of those hits also trains Meta's optimisation on the wrong audience.
 *
 * The switch is a request header, `isdev`, set by a browser extension on the
 * developer's machine. Deliberately not a build flag or an IP allowlist:
 * production has to be excluded too, the machine doing the browsing is the
 * thing that knows, and an IP list goes stale the moment somebody works from a
 * different network.
 *
 * A header alone is not enough here, though. It only exists on the initial
 * document request, and this is a single-page app - every route change after
 * that is client-side, with no request for a header to ride on. So the proxy
 * turns the header into a cookie, and the cookie is what the components
 * actually read. The header is the instruction; the cookie is the memory.
 *
 * The website (Laravel) implements the same contract against the same header
 * and cookie name - see App\Support\DevTraffic there. Keep the two in step.
 */

/** The request header a developer's browser extension sets. */
export const DEV_TRAFFIC_HEADER = 'isdev';

/** The cookie the proxy writes so the decision survives client-side routing. */
export const DEV_TRAFFIC_COOKIE = 'isdev';

/**
 * A year. This marks a machine, not a session - having to re-send the header
 * after every browser restart is how an exclusion quietly stops being applied.
 */
export const DEV_TRAFFIC_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Generous about what counts as yes, strict about the rest.
 *
 * A header typed by hand into an extension's UI arrives as whatever the person
 * typed. Accepting only the exact string "true" means "True" or "1" silently
 * does nothing - and a silently ineffective exclusion is the worst outcome
 * here, because it looks like it is working while the data carries on being
 * polluted. Anything unrecognised is "no", so a typo fails towards counting a
 * real visitor rather than towards dropping one.
 */
export function isAffirmative(value: string | null | undefined): boolean {
  if (!value) return false;

  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/**
 * Whether analytics must not run in this browser. Client-side only - it reads
 * document.cookie, which does not exist while rendering on the server.
 */
export function isDevTraffic(): boolean {
  if (typeof document === 'undefined') return false;

  const match = document.cookie.match(/(?:^|;\s*)isdev=([^;]*)/);

  return isAffirmative(match ? decodeURIComponent(match[1]) : null);
}
