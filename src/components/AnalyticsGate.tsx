'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { isDevTraffic } from '@/lib/devTraffic';
import { isDemoSession } from '@/lib/demo';

/**
 * Renders its children only when this browser is allowed to be tracked.
 *
 * Wraps GTM, the Meta pixel and the demo Lead reporter. Two conditions, and a
 * visit has to pass both:
 *
 * 1. **It must be a demo session.** This app is a restaurant's own ERP. Staff
 *    ringing up orders on the till are not an audience, their working day is
 *    not ad measurement, and a paying customer's storefront traffic is not ours
 *    to report. Only the demo is marketing, so only the demo is measured.
 * 2. **It must not be our own browsing.** See lib/devTraffic.
 *
 * Condition 1 used to be a comment rather than code. FacebookPixel's docblock
 * has always said "for the demo app only... not loaded for real restaurants",
 * while the component only ever checked that a pixel id was configured - and
 * GTM was loaded from the root layout on the sole condition that an id existed.
 * Every real restaurant was therefore reported to GA4 and Meta. The claim is
 * now enforced here, in one place, instead of being repeated as intent in three.
 *
 * ## Why this is a client component
 *
 * The obvious alternative is to read the cookie in the root layout with
 * `cookies()` from next/headers and never render the tags at all. That would be
 * a smaller change, and it is the wrong one: touching `cookies()` in the root
 * layout opts *every route in the application* into dynamic rendering, so the
 * whole storefront would lose static generation to support a developer-only
 * flag. Reading it in the browser costs nothing anybody else pays for.
 *
 * ## Why the server assumes it is suppressed
 *
 * The server has no cookie to read, so it has to guess, and the two guesses are
 * not symmetrical. Guessing "tracked" puts the GTM and pixel snippets into the
 * initial HTML, where they execute before any client code runs - by the time
 * the browser could correct the guess, the page view has already been sent, and
 * the whole feature does nothing. Guessing "suppressed" only delays the tags
 * until hydration, which they already wait for: both load with
 * `afterInteractive`, and nothing is measured in between.
 *
 * So the server snapshot below is deliberately `true`. It is not a placeholder.
 */

/**
 * Both cookies are written on a document request and neither changes again
 * while this page is alive, so there is nothing to subscribe to.
 * useSyncExternalStore still requires a subscribe function.
 *
 * (`demo_session` can be *cleared* mid-page, when the API confirms this is a
 * real restaurant. That only ever removes tracking, and DemoAnalytics re-checks
 * it before reporting, so there is nothing here that needs to react to it.)
 */
function subscribe(): () => void {
  return () => {};
}

/**
 * The layout mounts two gates - one for GTM in <head>, one for the pixel and
 * the Lead reporter in <body> - and both reach the same verdict. Announcing it
 * from each printed the line twice, which reads exactly like the double-firing
 * this component exists to prevent. Module scope, so it resets on a real page
 * load and the line appears once per page.
 */
let announced = false;

/** Tracking is allowed only for a demo visit that is not our own browsing. */
function trackingIsSuppressed(): boolean {
  return isDevTraffic() || !isDemoSession();
}

export default function AnalyticsGate({ children }: { children: React.ReactNode }) {
  const suppressed = useSyncExternalStore(
    subscribe,
    // In the browser: whatever the cookies actually say.
    trackingIsSuppressed,
    // On the server and during hydration: assume suppressed. See above.
    () => true,
  );

  useEffect(() => {
    // Marks the document so the exclusion is visible in DevTools at a glance,
    // matching the attribute the website sets server-side. Without a signal, a
    // working exclusion and a broken tag look exactly the same.
    if (suppressed) {
      // Naming the reason matters here in a way it did not when there was only
      // one: "no analytics" on a real restaurant is correct and expected, while
      // the same silence on a demo visit is a bug. Without this you cannot tell
      // the two apart from the console.
      const reason = isDevTraffic() ? 'dev-traffic' : 'not-a-demo-session';

      document.documentElement.setAttribute('data-analytics', reason);

      if (!announced) {
        announced = true;
        console.info(
          `[analytics] Suppressed (${reason}) - no GTM, GA or Meta pixel will load.`,
          reason === 'dev-traffic'
            ? 'Send "isdev: false" to resume.'
            : 'This app only reports demo visits; a real restaurant is never tracked.',
        );
      }

      return;
    }

    document.documentElement.removeAttribute('data-analytics');
  }, [suppressed]);

  if (suppressed) return null;

  return <>{children}</>;
}
