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

/**
 * What subscribing costs, for the one card that has to say so out loud.
 *
 * Two numbers and both are display copy:
 *
 * - `now` must match core-api's `config/plans.php` starter `price_monthly`,
 *   which is the side that actually charges. A customer who arrived through a
 *   landing page carries a locked rate that is *lower* than this one, so the
 *   figure quoted here is a ceiling - which is the safe direction for a price
 *   on a marketing card to be wrong in.
 * - `was` is the list price, never charged, only ever shown struck through.
 *   It matches the website's `landing.list_price_monthly`.
 *
 * Both unset means no price block at all: the card still makes the offer and
 * still opens the checkout, it simply does not quote a number it has not been
 * given. A deployment that has not filled these in should say nothing rather
 * than invent something.
 */
export type OfferPrice = { now: number; was: number | null };

export function offerPrice(): OfferPrice | null {
  const now = Number(process.env.NEXT_PUBLIC_PLAN_PRICE_MONTHLY);

  if (!Number.isFinite(now) || now <= 0) return null;

  const was = Number(process.env.NEXT_PUBLIC_PLAN_LIST_PRICE_MONTHLY);

  // A "was" that is not above the price being asked is not a saving, and
  // striking one through would be a claim rather than a discount.
  return { now, was: Number.isFinite(was) && was > now ? was : null };
}
