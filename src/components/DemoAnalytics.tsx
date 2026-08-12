'use client';

import { useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { FBC_COOKIE, FBP_COOKIE, LEAD_COOKIE, isDemoSession, readCookie } from '@/lib/demo';

/**
 * Marks a demo visitor as a Lead once they have stayed 60 seconds.
 *
 * Reported twice on purpose: the browser fires the pixel, and the server fires
 * the same event through core-api to the website's Conversions API. Both carry
 * the same `event_id`, so Meta collapses them into one conversion - the browser
 * half is fast and the server half survives ad blockers.
 *
 * The dataLayer push is kept so the existing GTM triggers and GA4 tags carry on
 * working untouched. GTM's side is a Custom Event trigger matching
 * `demo_checked_over_60_seconds` exactly, firing one GA4 Event tag - it reports
 * once per push and multiplies nothing, so anything arriving in GA4 more than
 * once was pushed more than once from here.
 */

/**
 * Marks this demo visit as already counted.
 *
 * A cookie rather than localStorage, and that is the fix rather than a detail:
 *
 * - **Shared across tabs.** localStorage is too, but see the race below; what
 *   matters more is that a cookie can expire.
 * - **Scoped to the demo visit.** It expires with `demo_session` (24 hours), so
 *   the event means "once per demo visit". The old localStorage key never
 *   expired, so once a browser had reported it could never report again - a
 *   genuine second demo visit months later went uncounted. That version managed
 *   to both over-report and under-report at the same time.
 */
const REPORTED_COOKIE = 'demo_lead_reported';

/** Same 24 hours as DEMO_COOKIE, so the guard cannot outlive the visit. */
const REPORTED_MAX_AGE = 86400;

const SIXTY_SECONDS = 60_000;

declare global {
  interface Window {
    // `dataLayer` is already declared globally by @next/third-parties, so it is
    // deliberately not redeclared here - a second declaration with a different
    // element type is a compile error.
    fbq?: (...args: unknown[]) => void;
  }
}

export default function DemoAnalytics() {
  useEffect(() => {
    // Gating on the demo-session cookie rather than a build-time env flag keeps
    // this event tied to actual demo visitors, on any deployment, with no
    // rebuild to toggle.
    if (!isDemoSession()) return;

    // Cheap early exit: this visit has already been counted, so do not even
    // start a timer. Not a guarantee on its own - see the re-check below.
    if (readCookie(REPORTED_COOKIE)) return;

    const timer = setTimeout(() => {
      // Sixty seconds of a tab sitting in the background is not sixty seconds
      // of interest.
      if (document.visibilityState !== 'visible') return;

      // Re-checked here, not just at mount: the admin shell drops the demo
      // cookie as soon as the API confirms this is a real restaurant, and that
      // answer usually arrives well inside the minute.
      if (!isDemoSession()) return;

      // THE duplicate fix. The guard used to be tested only at mount and set
      // only here, leaving sixty seconds in which it was not yet set - so a
      // second tab opened inside that window passed the mount check too, and
      // both timers reported. Every other condition in this callback was
      // re-evaluated; the one the guard depended on was not.
      if (readCookie(REPORTED_COOKIE)) return;

      // Claimed before any of the reporting below, so two timers that somehow
      // arrive together cannot both get past the line above. Everything after
      // this point runs at most once per demo visit.
      document.cookie = `${REPORTED_COOKIE}=1; path=/; max-age=${REPORTED_MAX_AGE}; SameSite=Lax`;

      // Shared by both halves. crypto.randomUUID needs a secure context, which
      // a local http:// deployment is not.
      const eventId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'demo_checked_over_60_seconds' });

      // Browser half.
      window.fbq?.('track', 'Lead', { content_name: 'demo_60_seconds' }, { eventID: eventId });

      // Server half, via core-api. Failure here is a reporting gap, never
      // something the visitor should see, so it is swallowed.
      fetch(`${API_BASE_URL}/demo/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          event_id: eventId,
          fbp: readCookie(FBP_COOKIE),
          fbc: readCookie(FBC_COOKIE),
          // Who verified to get in here, when they did. Opaque to this app -
          // the website issued it and the website reads it.
          lead_ref: readCookie(LEAD_COOKIE),
          source_url: window.location.href,
        }),
      }).catch(() => {});
    }, SIXTY_SECONDS);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
