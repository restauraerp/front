'use client';

import { useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { FBC_COOKIE, FBP_COOKIE, isDemoSession, readCookie } from '@/lib/demo';

/**
 * Marks a demo visitor as a Lead once they have stayed 60 seconds.
 *
 * Reported twice on purpose: the browser fires the pixel, and the server fires
 * the same event through core-api to the website's Conversions API. Both carry
 * the same `event_id`, so Meta collapses them into one conversion - the browser
 * half is fast and the server half survives ad blockers.
 *
 * The dataLayer push is kept so the existing GTM triggers and GA4 tags carry on
 * working untouched.
 */

/** Marks a browser as already counted, so a reload does not report twice. */
const REPORTED_KEY = 'demo_lead_reported';

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

    // One Lead per visitor, not one per page load. The old timer restarted on
    // every mount, so a demo visitor who looked at four screens was four leads.
    try {
      if (window.localStorage.getItem(REPORTED_KEY)) return;
    } catch {
      // Private browsing can refuse localStorage; better to risk a duplicate
      // than to never report at all.
    }

    const timer = setTimeout(() => {
      // Sixty seconds of a tab sitting in the background is not sixty seconds
      // of interest.
      if (document.visibilityState !== 'visible') return;

      // Re-checked here, not just at mount: the admin shell drops the demo
      // cookie as soon as the API confirms this is a real restaurant, and that
      // answer usually arrives well inside the minute.
      if (!isDemoSession()) return;

      try {
        window.localStorage.setItem(REPORTED_KEY, '1');
      } catch {
        /* see above */
      }

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
          source_url: window.location.href,
        }),
      }).catch(() => {});
    }, SIXTY_SECONDS);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
