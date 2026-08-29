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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // The demo runs on one shared restaurant, so the tenant says nothing about who
  // this is - the token from the demo link is the only thing that does.
  if (isDemoSession()) {
    const ref = readCookie(LEAD_COOKIE);
    if (ref) body.ref = ref;
  } else {
    // A trial is identified by who is signed in, and core-api reads that from
    // the bearer token rather than from a cookie. Sent by hand rather than
    // through fetchApi: that helper redirects to /login on a 401, and telemetry
    // must never be able to throw somebody out of the product they are using.
    const token = readCookie('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    void fetch(`${API_BASE_URL}/walkthrough/progress`, {
      method: 'POST',
      headers,
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
 * Two copies, and the split is deliberate. localStorage answers instantly and
 * survives a page navigation with no round trip, which is what the tour needs
 * between steps. The server holds the copy that actually belongs to the person -
 * see `fetchState` for why the local one cannot be that copy.
 */
const STATE_KEY = 'walkthrough';

type StoredState = { index: number; dismissed: boolean; completed: boolean };

/**
 * A short, opaque stand-in for whoever this is.
 *
 * The demo runs on one shared restaurant, so a key of `walkthrough:demo` is one
 * key shared by every visitor who has ever used this browser: the second person
 * to sit down at a sales laptop picks up the first person's tour, half finished,
 * on a screen they have never seen. Scoping by who they are ends that.
 *
 * Hashed rather than stored: the demo reference and the session token are both
 * credentials of a sort, and localStorage is the wrong place for either. All
 * this needs is that two people differ, which a hash gives.
 */
function fingerprint(value: string): string {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return (hash >>> 0).toString(36);
}

/**
 * Whose tour this is, as far as one browser can tell.
 *
 * A demo visitor is their demo reference - issued when they verified, and the
 * same handle the server files their progress under. Anybody else is their
 * session, which changes when they sign in again; that costs them a resume
 * position the server can hand straight back, and never mixes two people up.
 */
function identity(): string {
  if (typeof document === 'undefined') return 'anon';

  const ref = isDemoSession() ? readCookie(LEAD_COOKIE) : readCookie('token');

  return ref ? fingerprint(ref) : 'anon';
}

function storageKey(kind: TourKind): string {
  return `${STATE_KEY}:${kind}:${identity()}`;
}

export function readState(kind: TourKind): StoredState {
  const empty: StoredState = { index: 0, dismissed: false, completed: false };

  if (typeof window === 'undefined') return empty;

  try {
    const raw = window.localStorage.getItem(storageKey(kind));

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
    window.localStorage.setItem(storageKey(kind), JSON.stringify({ ...readState(kind), ...state }));
  } catch {
    /* the tour simply does not remember; it still works */
  }
}

/** Forgets this browser's copy, so the next read starts from nothing. */
export function clearState(kind: TourKind): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(storageKey(kind));
  } catch {
    /* nothing to forget, then */
  }
}

/** What the server holds for whoever is asking. */
export type RemoteState = {
  found: boolean;
  /** How far they ever got, 0-100. 100 is the only reading that means finished. */
  percent: number;
  /** The step they were last on, or null. Matches a `TourStep.key`. */
  lastKey: string | null;
  /**
   * Whether the marketing side has counted this tour as done.
   *
   * Named for what it is rather than for the field it arrives in. The website
   * awards its "walkthrough completed" rung at half way - deliberately, because
   * hardly anybody finishes a tour and the rung exists to say somebody has seen
   * enough to have an opinion. That is a sales fact, and reading it as "they
   * have seen the whole thing" would refuse to reopen the tour for somebody
   * with three missions still to walk.
   */
  passedHalf: boolean;
};

const NOTHING: RemoteState = { found: false, percent: 0, lastKey: null, passedHalf: false };

/**
 * Where the server says this person got to.
 *
 * The demo is why this exists. It runs on one shared restaurant with credentials
 * the API rotates, so nothing on this side can tell one visitor from another -
 * which means the browser is the only place a resume position could live, and the
 * browser is exactly the wrong place for it. Somebody who walked half the tour on
 * their phone and came back on a laptop would start over; two people on one
 * laptop would share a position. The marketing site files progress against the
 * person who verified, so that is where resuming has to read from.
 *
 * Answers `NOTHING` for every failure. Somebody is opening a product, not waiting
 * on a lookup, and a tour that will not start because a request timed out is
 * worse than a tour that starts at the beginning.
 */
export async function fetchState(kind: TourKind): Promise<RemoteState> {
  if (typeof window === 'undefined') return NOTHING;

  const params = new URLSearchParams({ kind });
  const headers: Record<string, string> = { Accept: 'application/json' };

  // The same identification the reporting path uses, and it has to be: asking
  // one way and answering the other would resume against somebody else.
  if (isDemoSession()) {
    const ref = readCookie(LEAD_COOKIE);
    if (ref) params.set('ref', ref);
  } else {
    // By hand rather than through fetchApi, which redirects to /login on a 401.
    // Failing to find a resume position must never throw somebody out.
    const token = readCookie('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/walkthrough/progress?${params.toString()}`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) return NOTHING;

    const body = (await response.json()) as {
      found?: boolean;
      percent?: number;
      last_key?: string | null;
      completed?: boolean;
    };

    return {
      found: body.found === true,
      percent: typeof body.percent === 'number' ? body.percent : 0,
      lastKey: body.last_key ?? null,
      passedHalf: body.completed === true,
    };
  } catch {
    return NOTHING;
  }
}

/**
 * Starting or restarting a tour from somewhere else in the app.
 *
 * An event rather than a shared store or a prop: the tour is mounted once, in the
 * admin layout, because it walks between pages - so the profile screen has no way
 * to reach it down the tree, and giving it one would mean lifting the tour's whole
 * state up into a layout that has no other use for it.
 */
export const TOUR_COMMAND = 'restora:walkthrough';

export type TourCommand = {
  /** `restart` goes back to step one; `resume` picks up where they left off. */
  action: 'restart' | 'resume';
  kind: TourKind;
};

export function commandTour(command: TourCommand): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent<TourCommand>(TOUR_COMMAND, { detail: command }));
}

/**
 * The tour saying it has closed, in the direction the command event does not go.
 *
 * The profile card reads its position once, on mount, and it is rendered behind
 * the tour the whole time - so the last mission, which walks somebody over that
 * very card, would leave it still reading "Mission 7 / 7" after they pressed
 * Finish on top of it. Anything showing progress listens for this and asks
 * again.
 */
export const TOUR_ENDED = 'restora:walkthrough-ended';

export function announceTourEnd(kind: TourKind): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent<TourKind>(TOUR_ENDED, { detail: kind }));
}
