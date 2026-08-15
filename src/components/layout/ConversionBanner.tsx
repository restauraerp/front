'use client';

import React from 'react';
import { ArrowRight, Clock, Sparkles } from 'lucide-react';
import type { SubscriptionStatus } from './SubscriptionBanner';

/**
 * The standing prompt to buy, shown to demo visitors and trial owners.
 *
 * Deliberately NOT `position: fixed`. The admin shell puts its scrolling in
 * `<main>`, and POS is locked to the viewport height, so anything floating over
 * the page would sit on top of the till. Rendered as a flex sibling above
 * `<main>` instead: it stays put while the page scrolls beneath it, and it can
 * never cover a control on any screen size.
 *
 * Two audiences, one component:
 *   - demo visitors, who should start a trial
 *   - trial owners, who should upgrade before the trial runs out
 */

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || '';

export default function ConversionBanner({ status }: { status: SubscriptionStatus | null }) {
  const [upgrading, setUpgrading] = React.useState(false);

  // Both answers come from the API, never from the browser. The `demo_session`
  // cookie lasts a day and follows a visitor out of the demo and into their own
  // account, so trusting it told paying customers they were "looking at a demo
  // restaurant" and pushed them to buy a second time.
  const isDemo = status?.is_demo === true;
  const isTrial = status?.tenant_status === 'trialing';
  const daysLeft = status?.trial_days_remaining ?? null;

  // The actual end date, so "soon" is never left vague. Rendered in the
  // viewer's own locale rather than a fixed format.
  const endsAt = status?.trial_ends_at ? new Date(status.trial_ends_at) : null;
  const endsOn = endsAt && !Number.isNaN(endsAt.getTime())
    ? endsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : null;

  const trialMessage =
    daysLeft !== null && daysLeft <= 0
      ? 'Your free trial ends today.'
      : daysLeft === 1
        ? 'Your free trial ends tomorrow.'
        : endsOn
          ? `Your free trial ends on ${endsOn}.`
          : 'You are on a free trial.';

  // A subscribed account is neither, and gets nothing at all.
  const audience = isTrial ? 'trial' : isDemo ? 'demo' : null;

  if (!audience || !WEBSITE_URL) return null;

  const verifyUrl = (action: 'subscription' | 'trial') =>
    `${WEBSITE_URL.replace(/\/$/, '')}/verify?action=${action}`;

  /**
   * Upgrading has to prove which restaurant is asking, so the API mints a
   * single-use token and we follow where it points. A tenant code in a URL
   * would let anyone raise an order against someone else's restaurant.
   */
  const startUpgrade = async () => {
    if (upgrading) return;
    setUpgrading(true);

    try {
      const { fetchApi } = await import('@/lib/api');
      const res = await fetchApi('/billing/upgrade-link', { method: 'POST' });

      if (res?.url) {
        window.location.href = res.url;
        return;
      }

      throw new Error('No upgrade URL returned');
    } catch (error) {
      console.error('Could not start upgrade', error);
      setUpgrading(false);
    }
  };

  return (
    <div
      className="bg-primary text-primary-content px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm"
      role="status"
    >
      {audience === 'demo' ? (
        <>
          <span className="flex items-center gap-2 font-medium">
            <Sparkles size={16} className="shrink-0" />
            You are looking at a demo restaurant.
          </span>

          <a
            href={verifyUrl('trial')}
            className="btn btn-xs sm:btn-sm btn-secondary text-secondary-content border-none font-bold rounded-full"
          >
            Start your 7-day free trial
            <ArrowRight size={14} />
          </a>
        </>
      ) : (
        <>
          <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
            <span className="flex items-center gap-2 font-medium">
              <Clock size={16} className="shrink-0" />
              {trialMessage}
            </span>

            {/* Deliberately not "keep your data" - expiry sets the account to
                read-only and nothing is ever deleted, so that would be a threat
                we do not carry out. Losing the ability to take orders is both
                true and, for a restaurant, the more alarming half. */}
            <span className="opacity-90">Upgrade to keep taking orders.</span>
          </span>

          <button
            type="button"
            onClick={startUpgrade}
            disabled={upgrading}
            className="btn btn-xs sm:btn-sm btn-secondary text-secondary-content border-none font-bold rounded-full"
          >
            {upgrading ? 'Opening…' : 'Upgrade now'}
            {!upgrading && <ArrowRight size={14} />}
          </button>
        </>
      )}
    </div>
  );
}
