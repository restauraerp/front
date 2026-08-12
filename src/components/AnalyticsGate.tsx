'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { isDevTraffic } from '@/lib/devTraffic';

/**
 * Renders its children only when this browser is allowed to be tracked.
 *
 * Wraps GTM, the Meta pixel and the demo Lead reporter, so our own visits stay
 * out of the numbers. See lib/devTraffic for why the switch is a header turned
 * into a cookie.
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
 * The cookie is written by the proxy on a document request and cannot change
 * again while this page is alive, so there is nothing to subscribe to.
 * useSyncExternalStore still requires a subscribe function.
 */
function subscribe(): () => void {
  return () => {};
}

export default function AnalyticsGate({ children }: { children: React.ReactNode }) {
  const suppressed = useSyncExternalStore(
    subscribe,
    // In the browser: whatever the cookie actually says.
    isDevTraffic,
    // On the server and during hydration: assume suppressed. See above.
    () => true,
  );

  useEffect(() => {
    // Marks the document so the exclusion is visible in DevTools at a glance,
    // matching the attribute the website sets server-side. Without a signal, a
    // working exclusion and a broken tag look exactly the same.
    if (suppressed) {
      document.documentElement.setAttribute('data-analytics', 'suppressed');
      console.info(
        '[analytics] Suppressed for this browser via the isdev cookie - no GTM, GA or Meta pixel will load. Send "isdev: false" to resume.',
      );

      return;
    }

    document.documentElement.removeAttribute('data-analytics');
  }, [suppressed]);

  if (suppressed) return null;

  return <>{children}</>;
}
