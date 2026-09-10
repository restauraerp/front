/**
 * A permanent diagnostic page for error monitoring: /sentry-test
 *
 * Why it exists
 * -------------
 * Sentry is only as trustworthy as your last check that it still reports. This
 * page is the standing way to make that check - after a deploy, a DSN change, or
 * a dependency bump - without inventing a real bug to do it. Nothing here fires
 * on its own; every error is behind a button, so the page is safe to leave in
 * production and safe to open.
 *
 * How to use it
 * -------------
 * Open /sentry-test in the browser. The banner says whether Sentry is switched
 * on for THIS build (it is baked in at build time from NEXT_PUBLIC_SENTRY_DSN,
 * so a page that says "off" means the build had no DSN - fix the env and
 * redeploy). Then press a button and look for the event in Sentry -> Issues:
 *
 *   - "Capture a handled error"  -> Sentry.captureException, the surest signal;
 *     it returns the event id right on the page.
 *   - "Throw a client error"     -> an uncaught browser error, the path a real
 *     crash in someone's browser takes.
 *   - "Trigger a server error"   -> a 500 from a route handler, the path a
 *     server-side failure takes (App Router onRequestError).
 *
 * noindex so it never turns up in search; it is a tool, not a page.
 */
import type { Metadata } from 'next';

import { SentryTestPanel } from './SentryTestPanel';

export const metadata: Metadata = {
  title: 'Sentry test',
  robots: { index: false, follow: false },
};

export default function SentryTestPage() {
  // Read at build time and inlined, exactly as the SDK reads it - so the banner
  // reflects the build the visitor is actually running, not the current env.
  const enabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

  return <SentryTestPanel enabled={enabled} />;
}
