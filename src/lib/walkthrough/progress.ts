/**
 * Telling the marketing site how far somebody got.
 *
 * Reports to core-api, which relays to the website - the same hop the 60-second
 * demo Lead takes, and for the same reason: the website owns the customer records
 * and the lifecycle ladder, and this app should not hold a second copy of either.
 *
 * Nothing here is allowed to matter to the person using the product. Every call is
 * fire-and-forget, every failure is swallowed, and no part of the UI waits on a
 * response. A tour that stalls because telemetry is slow is worse than a tour with
 * no telemetry at all.
 */

import { API_BASE_URL } from '@/lib/api';
import { LEAD_COOKIE, isDemoSession, readCookie } from '@/lib/demo';
import type { TourKind } from './tours';

export type ProgressReport = {
  kind: TourKind | 'video';
  percent: number;
  key?: string;
  /** Seconds in the demo, when the caller knows. Ignored for other kinds. */
  seconds?: number;
};

/**
 * Reports one reading.
 *
 * `keepalive` so a report fired as the tab closes still leaves the browser -
 * without it, somebody who abandons the tour mid-step is recorded one step behind
 * where they actually stopped, which is exactly the step worth knowing about.
 */
export function reportProgress({ kind, percent, key, seconds }: ProgressReport): void {
  if (typeof window === 'undefined') return;

  const body: Record<string, unknown> = {
    kind,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
  };

  if (key) body.key = key;
  if (seconds !== undefined) body.seconds = seconds;

  // The demo runs on one shared restaurant, so the tenant says nothing about who
  // this is - the token from the demo link is the only thing that does. A trial
  // sends nothing, because core-api reads the restaurant from the session.
  if (isDemoSession()) {
    const ref = readCookie(LEAD_COOKIE);
    if (ref) body.ref = ref;
  }

  try {
    void fetch(`${API_BASE_URL}/walkthrough/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify(body),
    }).catch(() => {
      // Deliberately silent. A telemetry gap is a hole in a report; a visible
      // error here is a hole in somebody's evening service.
    });
  } catch {
    /* as above */
  }
}

/**
 * Where somebody had got to, so closing the tab does not mean starting over.
 *
 * Kept in localStorage rather than on the server: it is a UI preference about one
 * browser, it must survive a page navigation with no round trip, and the server
 * already has the part that matters - how far they got.
 */
const STATE_KEY = 'walkthrough';

type StoredState = { index: number; dismissed: boolean; completed: boolean };

export function readState(kind: TourKind): StoredState {
  const empty: StoredState = { index: 0, dismissed: false, completed: false };

  if (typeof window === 'undefined') return empty;

  try {
    const raw = window.localStorage.getItem(`${STATE_KEY}:${kind}`);

    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<StoredState>) } : empty;
  } catch {
    // Private mode, or somebody else's key in the way. Starting the tour again is
    // a far better failure than throwing on mount.
    return empty;
  }
}

export function writeState(kind: TourKind, state: Partial<StoredState>): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      `${STATE_KEY}:${kind}`,
      JSON.stringify({ ...readState(kind), ...state }),
    );
  } catch {
    /* the tour simply does not remember; it still works */
  }
}
