/**
 * Links back out to the marketing site.
 *
 * One place, because the two ends of the same journey ask for it: the standing
 * banner across the top of a demo, and the last card of the guided tour. A
 * second copy of this string is a second place for the trailing slash to be
 * handled differently.
 */

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || '';

/**
 * Where somebody goes to start a trial or to subscribe.
 *
 * Null when this deployment has no marketing site configured - a demo pointed
 * at nothing should show no button at all, rather than one that leads to a
 * broken address.
 *
 * `/verify` rather than a signup form: the site already knows how to identify
 * somebody by their phone number or email, and the trial is created against
 * whoever that turns out to be. It is also what files the opt-in against the
 * person who has just walked the tour, which is the whole point of asking here.
 */
export function verifyUrl(action: 'trial' | 'subscription'): string | null {
  if (!WEBSITE_URL) return null;

  return `${WEBSITE_URL.replace(/\/$/, '')}/verify?action=${action}`;
}
