'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Compass, Play, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { SubscriptionStatus } from '@/components/layout/SubscriptionBanner';
import { readLanguage, type Language } from '@/lib/demo';
import {
  TOUR_ENDED,
  commandTour,
  fetchState,
  readState,
  type RemoteState,
} from '@/lib/walkthrough/progress';
import { indexOfKey, positionAt, tours, type TourKind } from '@/lib/walkthrough/tours';

/**
 * Starting the guided tour again, from the profile screen.
 *
 * Two buttons rather than one, because they answer different questions.
 * "Continue" is for somebody who was interrupted - a phone call in the middle of
 * the demo is the ordinary case, not the exceptional one. "Start over" is for
 * somebody showing it to a colleague, or who has simply forgotten.
 *
 * Where they left off is read from the server, not from this browser. The demo
 * runs on one shared restaurant, so this browser cannot tell one visitor from
 * another - two people on the same laptop would share a position, and the same
 * person on a second device would have none. The marketing site files progress
 * against whoever verified for the demo link, which is the only per-person
 * identity a demo visit has.
 */

type Props = {
  /** Billing state from /auth/me. Decides which tour, or whether there is one. */
  status: SubscriptionStatus | null;
  lang?: Language;
};

/** Which tour this account gets, mirroring the layout's decision. */
function tourFor(status: SubscriptionStatus | null): TourKind | null {
  if (status?.is_demo === true) return 'demo';

  // A trial gets its own tour. A paying restaurant gets none - there is nothing
  // here worth offering somebody who has been running the product for months.
  if (status?.is_demo === false) return status.tenant_status === 'trialing' ? 'trial' : null;

  return null;
}

const copy = {
  demo: {
    title: { en: 'Demo walkthrough', bn: 'ডেমো ওয়াকথ্রু' },
    blurb: {
      en: 'A short guided tour of what the software does, one screen at a time.',
      bn: 'সফটওয়্যারটি কী করে, এক স্ক্রিন করে দেখানো একটি সংক্ষিপ্ত গাইড।',
    },
  },
  trial: {
    title: { en: 'Setup walkthrough', bn: 'সেটআপ ওয়াকথ্রু' },
    blurb: {
      en: 'The shortest route to a working restaurant - menu, tables, first sale.',
      bn: 'রেস্টুরেন্ট চালু করার দ্রুততম পথ — মেনু, টেবিল, প্রথম বিক্রি।',
    },
  },
} as const;

const words = {
  continue: { en: 'Continue', bn: 'চালিয়ে যান' },
  startOver: { en: 'Start over', bn: 'শুরু থেকে' },
  start: { en: 'Start the tour', bn: 'ট্যুর শুরু করুন' },
  done: { en: 'You have finished this tour.', bn: 'আপনি এই ট্যুরটি শেষ করেছেন।' },
  loading: { en: 'Checking where you got to…', bn: 'কতদূর এগিয়েছেন দেখা হচ্ছে…' },
  mission: { en: 'Mission', bn: 'মিশন' },
} as const;

export default function WalkthroughCard({ status, lang }: Props) {
  const kind = tourFor(status);
  const language = lang ?? readLanguage();

  const [remote, setRemote] = useState<RemoteState | null>(null);
  // Where this browser thinks they are. Used only when the server has nothing:
  // somebody who never verified has no record there and still has a position.
  const [local, setLocal] = useState({ index: 0, completed: false });

  useEffect(() => {
    if (!kind) return;

    let cancelled = false;

    const load = () => {
      void fetchState(kind).then((state) => {
        if (cancelled) return;

        // Read here rather than on mount: localStorage is unavailable during
        // the server render, so seeding state from it directly would have the
        // server and the client disagree about what this card says.
        const stored = readState(kind);

        setLocal({ index: stored.index, completed: stored.completed });
        setRemote(state);
      });
    };

    load();

    // The last mission walks somebody over this very card, so it is on screen
    // and already loaded when they finish. Without this it would go on saying
    // "Mission 7 / 7" to somebody who has just pressed Finish on top of it.
    window.addEventListener(TOUR_ENDED, load);

    return () => {
      cancelled = true;
      window.removeEventListener(TOUR_ENDED, load);
    };
  }, [kind]);

  const restart = useCallback(() => {
    if (!kind) return;

    commandTour({ action: 'restart', kind });

    // Said here rather than waited for. Restarting clears both copies of the
    // position, and this card is sitting behind the tour that just reopened -
    // leaving it reading "You have finished this tour" over a tour in progress.
    setLocal({ index: 0, completed: false });
    setRemote({ found: false, percent: 0, lastKey: null, passedHalf: false });
  }, [kind]);

  const resume = useCallback(() => {
    if (kind) commandTour({ action: 'resume', kind });
  }, [kind]);

  if (!kind) return null;

  const steps = tours[kind];
  const remoteIndex = remote ? indexOfKey(kind, remote.lastKey) : -1;
  // The furthest of the two, and never past the end of a tour whose steps have
  // changed since. A stale key resolves to -1 above rather than to a position.
  const at = Math.min(Math.max(remoteIndex, local.index, 0), steps.length - 1);

  // Either copy is enough to say it is done. The server's is the one that
  // belongs to the person, but it is written by a fire-and-forget report that
  // has not necessarily landed by the time the tour closes - and this card is
  // read immediately afterwards.
  //
  // The server's own "completed" is not consulted: it is awarded at half way,
  // and offering somebody nothing but "Start over" halfway through a tour they
  // are in the middle of would take away the button they came here for.
  const finished = (remote?.percent ?? 0) >= 100 || local.completed;
  const started = finished || remoteIndex >= 0 || local.index > 0;
  const { step, mission } = positionAt(kind, at);

  return (
    <Card title={copy[kind].title[language]} tour="walkthrough-card">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-base-200">
          <Compass className="text-primary shrink-0 mt-0.5" size={20} />
          <div className="min-w-0">
            <p className="text-sm">{copy[kind].blurb[language]}</p>

            {remote === null ? (
              <p className="text-xs text-base-content/50 mt-1">{words.loading[language]}</p>
            ) : finished ? (
              <p className="text-xs text-base-content/50 mt-1">{words.done[language]}</p>
            ) : started ? (
              <p className="text-xs text-base-content/50 mt-1">
                {/* Counted in missions where there are missions. The demo
                    flattens to something like forty-five beats, and "beat 19 of
                    45" tells nobody anything - "Mission 4 of 7 - Take a sale"
                    says both how far in they are and what they are in the
                    middle of. Tours without missions keep the step title, which
                    is the same reasoning at a different grain. */}
                {mission
                  ? `${words.mission[language]} ${mission.index} / ${mission.total} — ${mission.title[language]}`
                  : `${at + 1} / ${steps.length} — ${step?.title[language] ?? ''}`}
              </p>
            ) : null}
          </div>
        </div>

        <div data-tour="walkthrough-actions" className="flex flex-wrap gap-2">
          {/* Offered first, and only when there is somewhere to go back to. A
              "Continue" that starts at step one is a lie about what it does. */}
          {started && !finished && (
            <button className="btn btn-primary flex-1 gap-2" onClick={resume}>
              <Play size={16} />
              {words.continue[language]}
            </button>
          )}

          <button
            className={`btn gap-2 flex-1 ${started && !finished ? 'btn-outline' : 'btn-primary'}`}
            onClick={restart}
          >
            <RotateCcw size={16} />
            {started ? words.startOver[language] : words.start[language]}
          </button>
        </div>
      </div>
    </Card>
  );
}
