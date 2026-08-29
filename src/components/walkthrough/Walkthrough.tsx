'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isDemoSession, readLanguage, type Language } from '@/lib/demo';
import { indexOfKey, knowsTheWayBack, percentAt, tours, type TourKind, type TourStep } from '@/lib/walkthrough/tours';
import { GUIDE_AVATAR, GUIDE_INITIAL, GUIDE_NAME } from '@/lib/walkthrough/guide';
import { verifyUrl } from '@/lib/marketing';
import {
  TOUR_COMMAND,
  announceTourEnd,
  clearState,
  fetchState,
  readState,
  reportProgress,
  writeState,
  type TourCommand,
} from '@/lib/walkthrough/progress';

/**
 * The guided tour, for both the demo and a new trial.
 *
 * One engine, two lists of steps. What differs between the tours is their order
 * and their words, both of which live in `lib/walkthrough/tours.ts` - so changing
 * what a tour says never means touching this file.
 *
 * The demo tour is played rather than watched: each mission states a goal, hands
 * the controls over for the clicks that reach it, then explains what is now on
 * the screen. That shape lives in the data; what lives here is the one behaviour
 * it needs from the engine - an `action` step does not offer a Next button, it
 * waits for the person to click the thing it is pointing at.
 *
 * Rules that shape the rest of the behaviour, each because the opposite is worse
 * than having no tour at all:
 *
 * - **A missing target is skipped, never blocking.** Screens change, and a tour
 *   that stops dead because one button moved would break silently for everybody.
 *   The same goes for a step waiting on a click: there is always a way past it.
 * - **It can always be closed, and stays closed.** A tour you cannot dismiss is an
 *   obstacle rather than an introduction. Closing it says how to get it back,
 *   because a tour somebody cannot reopen is one they will not risk closing.
 * - **It never waits on the network.** Progress is reported fire-and-forget; the
 *   person is using the product, not waiting on telemetry. Where somebody left
 *   off is *asked* for, but the tour opens without waiting for the answer and
 *   moves itself if one arrives.
 * - **It can be restarted from outside.** The tour is mounted once, in the admin
 *   layout, so anything wanting to start it - the button on the profile screen -
 *   reaches it through a window event rather than down the tree.
 */

const SELECTOR = (target: string) => `[data-tour="${target}"]`;

/** The card's width, and the margin kept between it and the edge of the screen. */
const CARD_WIDTH = 340;
const EDGE = 16;
/** Roughly the tallest a card gets. Only used to keep one on screen. */
const CARD_HEIGHT = 300;

/** Wider when the card is the whole point rather than a label on something else. */
const BRIEFING_WIDTH = 420;

type Located = { el: HTMLElement | null; present: boolean; visible?: boolean };

/**
 * Whether an element is somewhere a person can actually see.
 *
 * `querySelector` finding something is not enough: the admin sidebar stays in the
 * DOM when it slides off-canvas on a narrow screen, and a ring drawn around it
 * lands off the edge of the screen, pointing at nothing.
 *
 * Nor is a measurement enough on its own. A closed daisyUI dialog is still laid
 * out at full size and merely turned invisible, so the payment box goes on
 * measuring 380 by 500 long after somebody has shut it. `checkVisibility` is
 * what answers the question actually being asked - can this be seen - and it is
 * guarded because it is recent enough to be missing in older browsers, where a
 * measured box is the best available answer.
 */
function isOnScreen(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) return false;

  if (typeof el.checkVisibility === 'function') {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
  }

  return rect.right > 0 && rect.left < window.innerWidth;
}

/** Keeps the card on screen whatever it was asked to sit beside. */
function clampLeft(left: number, width: number): number {
  return Math.max(EDGE, Math.min(left, window.innerWidth - width - EDGE));
}

/** How long to wait for a step's target after navigating to its page. */
const TARGET_TIMEOUT_MS = 1500;

/**
 * How long a step will wait for a click before it offers to move on by itself.
 *
 * Long enough not to nag somebody who is reading, short enough that a person who
 * clicked the wrong thing - or whose click did not land - is not left staring at
 * a card with no button on it.
 */
const STUCK_AFTER_MS = 12000;

type Props = {
  /**
   * Which tour to run. Passed in rather than guessed here, so the decision - a
   * demo visit, or a trial in its first days - lives with whatever knows it.
   */
  kind?: TourKind;
  /**
   * Overrides the language. Left unset, the tour reads whatever the marketing
   * site carried over - which is the language they were actually reading, not a
   * guess from a browser setting.
   */
  lang?: Language;
};

export default function Walkthrough({ kind, lang }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Demo visits are recognised here so nothing else has to pass it in; a trial
  // tour is opt-in from whatever decides somebody is new enough to want it.
  const resolvedKind: TourKind | null = useMemo(() => {
    if (kind) return kind;

    return typeof document !== 'undefined' && isDemoSession() ? 'demo' : null;
  }, [kind]);

  const steps = useMemo(() => (resolvedKind ? tours[resolvedKind] : []), [resolvedKind]);

  const language = useMemo(() => lang ?? readLanguage(), [lang]);

  // Read straight from storage rather than in a mount effect. The component is
  // loaded client-only (see the dynamic import where it is mounted), so there is
  // no server render to disagree with - and no cascade of renders on arrival.
  const [index, setIndex] = useState(() => {
    if (!resolvedKind) return 0;

    const stored = readState(resolvedKind);

    return Math.min(stored.index, Math.max(0, tours[resolvedKind].length - 1));
  });

  const [open, setOpen] = useState(() => {
    if (!resolvedKind) return false;

    const stored = readState(resolvedKind);

    return !stored.dismissed && !stored.completed;
  });

  // Closing asks before it closes, so the answer to "how do I get this back" is
  // given at the only moment somebody needs it. See `leave`.
  const [leaving, setLeaving] = useState(false);

  /*
   * Where the ring goes, paired with the step it was measured for.
   *
   * Paired because a step that points at nothing has no measurement to make,
   * and clearing the last one from inside an effect is both a cascading render
   * and a rule React's linter is right about. Holding the key instead lets the
   * briefing simply not match, which is the same "no ring" with no second pass
   * - and it also disowns a rect measured for the previous step, which would
   * otherwise survive a render into the next one and draw the ring in the wrong
   * place.
   */
  const [found, setFound] = useState<{ key: string; rect: DOMRect | null }>({ key: '', rect: null });

  // The step whose wait has gone on long enough to offer a way past. Held as a
  // key rather than a flag so moving on clears it by no longer matching, rather
  // than by an effect resetting it.
  const [stuckAt, setStuckAt] = useState<string | null>(null);

  const [avatarBroken, setAvatarBroken] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null);
  // The furthest step reported, so a tour reopened from the start does not report
  // progress going backwards.
  const reportedRef = useRef(-1);
  // The step this last took somebody to, and how many times it has tried.
  const navigatedRef = useRef<{ key: string; tries: number }>({ key: '', tries: 0 });
  // Whether they have moved the tour themselves. Once they have, a late answer
  // from the server must not pull them somewhere else mid-sentence.
  const touchedRef = useRef(false);
  // The `untilGone` step whose target has actually been seen. Without it, a beat
  // that opens looking for a dialog that has not rendered yet would count that
  // as the dialog having been closed and move straight past itself.
  const arrivedRef = useRef<string | null>(null);

  const step: TourStep | undefined = steps[index];
  const stage = step?.stage ?? 'explain';
  // A briefing, a debrief and the closing offer are about the whole screen, so
  // they sit in the middle of it whether or not the step names a target.
  const centred = stage === 'objective' || stage === 'complete' || stage === 'offer';
  const waiting = stage === 'action' && step?.awaitClick === true;
  // A beat that ends when its target does. See `untilGone` in tours.ts: while a
  // modal dialog is open every control outside it is inert, this card's own
  // included, so there is nothing to offer but the reading.
  const untilGone = step?.untilGone === true;
  // Both read through the step they were recorded against, so neither can carry
  // over into a step it was not meant for.
  const rect = step !== undefined && found.key === step.key ? found.rect : null;
  const stuck = step !== undefined && stuckAt === step.key;

  /* ---------------------------------------------------------------- controls */

  // Both of these only move the index. Where the tour *goes* is decided by the
  // effect below, from whichever step is now current - routing from inside a state
  // update means updating the router while this component is still rendering.
  const advance = useCallback(() => {
    touchedRef.current = true;

    const next = index + 1;

    if (next >= steps.length) {
      if (resolvedKind) {
        writeState(resolvedKind, { completed: true, index });
        announceTourEnd(resolvedKind);
      }

      setOpen(false);

      return;
    }

    setIndex(next);
  }, [index, steps.length, resolvedKind]);

  const back = useCallback(() => {
    touchedRef.current = true;

    setIndex((current) => {
      // Stepping back over a beat that ends when a dialog closes, because the
      // dialog is closed - that is how they got past it. Landing on it would
      // show a card with nothing to press until it skipped itself forward
      // again, which from the outside is a Back button that does nothing.
      const previous = current - 1;
      const skip = steps[previous]?.untilGone === true ? 1 : 0;

      return Math.max(0, previous - skip);
    });
  }, [steps]);

  const close = useCallback(() => {
    touchedRef.current = true;

    if (resolvedKind) {
      writeState(resolvedKind, { dismissed: true, index });
      announceTourEnd(resolvedKind);
    }

    setLeaving(false);
    setOpen(false);
  }, [resolvedKind, index]);

  /**
   * Closing, but saying how to come back first.
   *
   * The last mission is the one that teaches this, so somebody who has reached
   * it is spared being told twice - and a tour that argues with you on the way
   * out is the reason people never open the next one.
   */
  const leave = useCallback(() => {
    if (knowsTheWayBack(step)) {
      close();

      return;
    }

    setLeaving(true);
  }, [step, close]);

  /**
   * Taking the offer on the last card.
   *
   * The tour is marked finished before the browser leaves, not after: they are
   * navigating to the marketing site and this component is about to be torn
   * down, so anything left until "when they come back" is never written. The
   * link does the navigating itself - this only has to make sure the tour does
   * not reopen behind them when they return to the demo.
   */
  const takeTrial = useCallback(() => {
    if (!resolvedKind) return;

    writeState(resolvedKind, { completed: true, index });
    announceTourEnd(resolvedKind);
  }, [resolvedKind, index]);

  /* ------------------------------------------------------- picking it back up */

  /**
   * Asks the server where this person got to, once, on arrival.
   *
   * The demo runs on one shared restaurant, so this browser is not a reliable
   * record of who anybody is - somebody who walked half the tour on their phone
   * and came back on a laptop has a position, and it is not here. The server
   * files it against the person who verified.
   *
   * Applied only while they have not touched anything. A late answer that moved
   * somebody who is already reading step two would be worse than not asking.
   */
  useEffect(() => {
    if (!resolvedKind) return;

    let cancelled = false;

    void fetchState(resolvedKind).then((remote) => {
      if (cancelled || touchedRef.current || !remote.found) return;

      // Walked all the way through elsewhere. Not a position to resume - a
      // reason not to open. Measured on the percentage rather than on the
      // server's completed flag, which is awarded at half way: somebody who
      // stopped at mission four on their phone is coming back for the other
      // three, not to be told they are done.
      if (remote.percent >= 100) {
        writeState(resolvedKind, { completed: true });
        setOpen(false);

        return;
      }

      const at = indexOfKey(resolvedKind, remote.lastKey);

      // Only ever forward. The local copy may be ahead of what has been reported
      // - reporting is fire-and-forget, and the last one may not have landed.
      setIndex((current) => (at > current ? at : current));
    });

    return () => {
      cancelled = true;
    };
  }, [resolvedKind]);

  /**
   * Starting the tour again from elsewhere in the app.
   *
   * `restart` forgets this browser's position and goes back to step one; `resume`
   * opens wherever they had got to. Neither clears what the server holds: how far
   * somebody got is a fact about them, and walking the tour twice does not unmake
   * it.
   */
  useEffect(() => {
    if (!resolvedKind) return;

    const onCommand = (event: Event) => {
      const command = (event as CustomEvent<TourCommand>).detail;

      if (!command || command.kind !== resolvedKind) return;

      touchedRef.current = true;
      // Both refs are positions this run has already passed. Left alone, a
      // restarted tour would neither route to its first step nor report it.
      navigatedRef.current = { key: '', tries: 0 };
      reportedRef.current = -1;
      setLeaving(false);

      if (command.action === 'restart') {
        clearState(resolvedKind);
        writeState(resolvedKind, { index: 0, dismissed: false, completed: false });
        setIndex(0);
        setOpen(true);

        return;
      }

      const stored = readState(resolvedKind);

      writeState(resolvedKind, { dismissed: false, completed: false });
      setIndex(Math.min(stored.index, Math.max(0, tours[resolvedKind].length - 1)));
      setOpen(true);
    };

    window.addEventListener(TOUR_COMMAND, onCommand);

    return () => window.removeEventListener(TOUR_COMMAND, onCommand);
  }, [resolvedKind]);

  /* ------------------------------------------------------- waiting for a click */

  /**
   * An `action` step advances when they click the thing, and only then.
   *
   * Listened for on the document during the capture phase rather than bound to
   * the element itself. The target is React's to own: it re-renders, it is
   * replaced, and a handler attached to the node we happened to find a moment ago
   * would quietly stop working. Capture also means the click is noticed even if
   * the app's own handler navigates away in response to it.
   *
   * `closest` rather than an equality check, because the anchor is usually a
   * container - the product grid, the row of order buttons - and the thing
   * actually clicked is a tile inside it.
   */
  useEffect(() => {
    if (!open || leaving || !waiting || !step?.target) return;

    const onClick = (event: MouseEvent) => {
      const hit = (event.target as HTMLElement | null)?.closest(SELECTOR(step.target as string));

      if (hit) advance();
    };

    document.addEventListener('click', onClick, true);

    return () => document.removeEventListener('click', onClick, true);
  }, [open, leaving, waiting, step, advance]);

  // Offers a way past a step that is waiting for a click, but only once it has
  // been waiting a while. Shown immediately it would read as "or just skip this",
  // which is the opposite of asking somebody to try it.
  useEffect(() => {
    if (!open || !waiting || !step) return;

    const key = step.key;
    const timer = window.setTimeout(() => setStuckAt(key), STUCK_AFTER_MS);

    return () => window.clearTimeout(timer);
  }, [open, waiting, step]);

  /* ---------------------------------------------------------------- navigation */

  // Keeps the tour and the address bar agreed: a step that names a page takes the
  // person there, whichever direction they arrived from.
  //
  // Twice per step at the most. Somebody who clicks something of their own while
  // a step is showing is exploring the product, which is the entire point -
  // pulling them back for ever would turn a tour into a cage.
  //
  // Twice rather than once because the step before this one usually asked them to
  // click a link. The tour advances from a capture-phase listener, so it pushes
  // its own destination *before* the app pushes the one the link named, and the
  // app's push lands second and wins. The retry runs when the address bar next
  // changes, which is exactly when that has happened.
  useEffect(() => {
    if (!open || !step?.href) return;

    const been = navigatedRef.current;

    if (been.key === step.key && been.tries >= 2) return;

    // Compared including the query string: the reporting steps differ from where
    // somebody already is only by `?range=last_month`, and a step whose whole job
    // is setting the period would otherwise decide it had already arrived.
    const here = `${pathname}${window.location.search}`;

    if (step.href === here || step.href === pathname) return;

    navigatedRef.current = { key: step.key, tries: been.key === step.key ? been.tries + 1 : 1 };
    router.push(step.href);
  }, [open, step, pathname, router]);

  /* ------------------------------------------------------- finding the target */

  const locate = useCallback((): Located => {
    if (!step?.target) return { el: null, present: false };

    const el = document.querySelector<HTMLElement>(SELECTOR(step.target));

    if (!el) return { el: null, present: false };

    return { el, present: true, visible: isOnScreen(el) };
  }, [step]);

  useEffect(() => {
    if (!open || !step) return;

    // Nothing to point at, and nothing wrong with that: a briefing is about the
    // screen rather than any one thing on it. No measurement is taken, so the
    // held one keeps the previous step's key and is disowned by the derivation.
    if (!step.target) return;

    let cancelled = false;
    const startedAt = Date.now();

    // Polls rather than assuming the element is there: the step may have just
    // navigated to another page, and the target only exists once it renders.
    const find = () => {
      if (cancelled) return;

      const { el, present, visible } = locate();

      if (el && visible) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setFound({ key: step.key, rect: el.getBoundingClientRect() });

        return;
      }

      if (present) {
        // There, but off-canvas: the sidebar on a narrow screen, most often. The
        // step still has something to say and the page it wanted is already open,
        // so it is shown without a ring rather than skipped.
        setFound({ key: step.key, rect: null });

        return;
      }

      if (Date.now() - startedAt > TARGET_TIMEOUT_MS) {
        // Gone. Skip rather than block - a tour with a gap still works, a tour
        // stuck on a missing button does not.
        setFound({ key: step.key, rect: null });
        advance();

        return;
      }

      window.setTimeout(find, 100);
    };

    find();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, pathname]);

  /*
   * Keeps the highlight on the element while the page moves under it.
   *
   * Scrolling and resizing are the obvious ways it moves, and the ticker
   * catches the rest. Pressing a button on the orders board relabels it - Ready
   * to Serve becomes Serve - and everything after it on the row slides left,
   * which left the ring drawn around empty space beside the button it was
   * pointing at. Nothing fires an event for that, so it is measured again on a
   * timer; the state is only written when the numbers actually differ, so a
   * still page costs a `getBoundingClientRect` twice a second and no renders.
   */
  useEffect(() => {
    if (!open || !step) return;

    const reposition = () => {
      const { el, visible } = locate();
      const next = el && visible ? el.getBoundingClientRect() : null;

      setFound((held) =>
        held.key === step.key && sameBox(held.rect, next) ? held : { key: step.key, rect: next },
      );

      if (!step.untilGone) return;

      // Measured, not merely present. A closed <dialog> stays in the document
      // with `display: none`, so asking whether the element exists would answer
      // yes for ever and the beat would never end; asking whether it occupies
      // any space answers what was actually meant - is it still up.
      if (next !== null) arrivedRef.current = step.key;
      else if (arrivedRef.current === step.key) advance();
    };

    const ticker = window.setInterval(reposition, 500);

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      window.clearInterval(ticker);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, step, locate, advance]);

  /* -------------------------------------------------------------- reporting */

  useEffect(() => {
    if (!open || !resolvedKind || !step) return;

    if (index <= reportedRef.current) return;

    reportedRef.current = index;

    reportProgress({
      kind: resolvedKind,
      percent: percentAt(resolvedKind, index),
      key: step.key,
    });

    writeState(resolvedKind, { index });
  }, [open, resolvedKind, step, index]);

  // The last step somebody saw, sent as the tab closes. Without this, anybody who
  // abandons the tour is recorded one step behind where they actually stopped -
  // which is exactly the step worth knowing about.
  useEffect(() => {
    if (!open || !resolvedKind) return;

    const onLeave = () => {
      const current = steps[index];
      if (!current) return;

      reportProgress({
        kind: resolvedKind,
        percent: percentAt(resolvedKind, index),
        key: current.key,
      });
    };

    window.addEventListener('pagehide', onLeave);

    return () => window.removeEventListener('pagehide', onLeave);
  }, [open, resolvedKind, steps, index]);

  // Escape closes, as it does for every other overlay anybody has used. The arrow
  // keys stay live on a waiting step on purpose: they are a deliberate press, not
  // a way of missing the point of one.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Escape out of the farewell card closes for real; Escape anywhere else
        // brings the farewell card up, because that is where the way back is
        // explained.
        if (leaving) close();
        else leave();
      }
      if (event.key === 'ArrowRight' && !leaving) advance();
      if (event.key === 'ArrowLeft' && !leaving) back();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [open, leaving, leave, close, advance, back]);

  // Focus moves to the step, so a screen reader announces it and the keyboard
  // controls work without hunting for the card.
  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, index, leaving]);

  if (!open || !resolvedKind || !step) return null;

  const words = SPEECH[language];
  // Null when this deployment has no marketing site to send them to, which is
  // the one case the closing offer quietly turns back into an ordinary Finish.
  const trialLink = verifyUrl('trial');
  // Without somewhere to send them the offer is just a card with no answer on
  // it, so it falls back to the ordinary footer and its Finish button.
  const offering = step.cta === 'trial' && trialLink !== null;
  const width = centred || leaving ? BRIEFING_WIDTH : CARD_WIDTH;
  const ringed = rect !== null && !centred && !leaving;
  const card = leaving || centred ? MIDDLE : cardPosition(rect, step.placement, width);

  const avatar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      {avatarBroken ? (
        <div
          aria-hidden
          style={{
            width: 40, height: 40, borderRadius: '50%', background: BRAND,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 17, flexShrink: 0,
          }}
        >
          {GUIDE_INITIAL}
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={GUIDE_AVATAR}
          alt=""
          onError={() => setAvatarBroken(true)}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      )}

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1D1F' }}>{GUIDE_NAME[language]}</div>
        {step.mission && !leaving && (
          <div style={{ fontSize: 11, color: '#78807F', letterSpacing: '0.02em' }}>
            {words.mission(step.mission.index, step.mission.total)} · {step.mission.title[language]}
          </div>
        )}
      </div>
    </div>
  );

  /* ---------------------------------------------------------- leaving the tour */

  if (leaving) {
    return (
      <Shell>
        <div ref={cardRef} tabIndex={-1} style={{ ...CARD_BASE, ...card, width, maxWidth: 'calc(100vw - 32px)' }}>
          {avatar}

          <h2 id="walkthrough-title" style={TITLE}>{words.leaveTitle}</h2>
          <p id="walkthrough-body" style={BODY}>{words.leaveBody}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
            <button type="button" onClick={close} style={{ ...BUTTON, background: '#F2F5F4', color: '#1A1D1F' }}>
              {words.leaveConfirm}
            </button>

            <span style={{ flex: 1 }} />

            <button type="button" onClick={() => setLeaving(false)} style={{ ...BUTTON, background: BRAND, color: '#fff' }}>
              {words.leaveCancel}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- the step */

  return (
    <Shell>
      {/* The cut-out. A ring around the target rather than a dimmed overlay with a
          hole in it: the product stays readable and clickable, which matters when
          the step is asking somebody to look at live numbers - and doubly when it
          is asking them to press the thing inside the ring. */}
      {ringed && rect && (
        <div
          aria-hidden
          className={waiting ? 'walkthrough-ring walkthrough-ring--waiting' : 'walkthrough-ring'}
          style={{
            position: 'fixed',
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            border: `2px solid ${BRAND}`,
            borderRadius: 10,
            boxShadow: `0 0 0 9999px ${waiting ? 'rgba(10, 78, 66, 0.45)' : 'rgba(10, 78, 66, 0.35)'}`,
            transition: 'all 150ms ease',
            pointerEvents: 'none',
          }}
        />
      )}

      <div ref={cardRef} tabIndex={-1} style={{ ...CARD_BASE, ...card, width, maxWidth: 'calc(100vw - 32px)' }}>
        {avatar}

        {/* How far through the mission, drawn rather than counted out. A tour that
            says "step 22 of 47" tells somebody how much is left to endure; a bar
            that fills over five beats tells them the end is in sight. */}
        {step.mission && (
          <div aria-hidden style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {Array.from({ length: step.mission.beats }, (_, i) => (
              <span
                key={i}
                style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: i < (step.mission?.beat ?? 0) ? BRAND : '#E4E9E8',
                }}
              />
            ))}
          </div>
        )}

        {stage === 'action' && (
          <p style={{ ...EYEBROW, color: BRAND }}>{words.yourTurn}</p>
        )}
        {stage === 'complete' && (
          <p style={{ ...EYEBROW, color: BRAND }}>{words.missionDone}</p>
        )}
        {stage === 'objective' && (
          <p style={EYEBROW}>{words.objective}</p>
        )}
        {stage === 'offer' && (
          <p style={{ ...EYEBROW, color: BRAND }}>{words.offer}</p>
        )}

        <h2 id="walkthrough-title" style={TITLE}>{step.title[language]}</h2>

        <p id="walkthrough-body" style={BODY}>{step.body[language]}</p>

        {/* Nothing to press. Every control out here is inert while the dialog
            is up, so a row of dead buttons would only be something to blame
            oneself for. The line below says what does move the tour on. */}
        {offering ? (
          /* The offer gets its own footer rather than a fourth button in the
             ordinary row: four controls on a 380px card wrap, and the one that
             matters ends up sharing a line with the one that declines it. The
             ask goes full width, and the two ways past it sit quietly under. */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            <a
              href={trialLink ?? undefined}
              onClick={takeTrial}
              style={{
                ...BUTTON,
                background: BRAND,
                color: '#fff',
                textDecoration: 'none',
                display: 'block',
                textAlign: 'center',
                padding: '11px 18px',
              }}
            >
              {words.startTrial}
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {index > 0 && (
                <button
                  type="button"
                  onClick={back}
                  style={{ ...BUTTON, background: 'transparent', color: '#78807F', paddingInline: 0 }}
                >
                  {words.back}
                </button>
              )}

              <span style={{ flex: 1 }} />

              <button
                type="button"
                onClick={advance}
                style={{ ...BUTTON, background: 'transparent', color: '#78807F', paddingInline: 0 }}
              >
                {words.later}
              </button>
            </div>
          </div>
        ) : untilGone ? (
          <p style={{ ...BODY, marginTop: 16, marginBottom: 0, fontSize: 13, color: '#78807F' }}>
            {words.closeToGoOn}
          </p>
        ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={leave}
            style={{ ...BUTTON, background: 'transparent', color: '#78807F', paddingInline: 0 }}
          >
            {words.close}
          </button>

          <span style={{ flex: 1 }} />

          {index > 0 && !waiting && (
            <button type="button" onClick={back} style={{ ...BUTTON, background: '#F2F5F4', color: '#1A1D1F' }}>
              {words.back}
            </button>
          )}

          {waiting ? (
            // No Next. The step is asking them to press something, and a button
            // that skips past it sitting right there is an invitation to.
            stuck && (
              <button
                type="button"
                onClick={advance}
                style={{ ...BUTTON, background: '#F2F5F4', color: '#5B6266' }}
              >
                {words.skip}
              </button>
            )
          ) : (
            <button type="button" onClick={advance} style={{ ...BUTTON, background: BRAND, color: '#fff' }}>
              {index + 1 === steps.length
                ? words.finish
                : stage === 'objective'
                  ? words.start
                  : stage === 'complete'
                    ? words.nextMission
                    : words.next}
            </button>
          )}
        </div>
        )}

        {waiting && !stuck && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9AA2A1' }}>{words.waiting}</p>
        )}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ chrome */

const BRAND = '#0F6E5C';

/** The fixed, click-through layer both the ring and the card live in. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="walkthrough-title"
      aria-describedby="walkthrough-body"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}
    >
      {/* Scoped to the ring's own class, and off entirely for anybody who has
          asked their system for less movement. */}
      <style>{`
        @keyframes walkthrough-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .walkthrough-ring--waiting { animation: walkthrough-pulse 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .walkthrough-ring--waiting { animation: none; }
        }
      `}</style>
      {children}
    </div>
  );
}

const CARD_BASE: React.CSSProperties = {
  position: 'fixed',
  background: '#fff',
  borderRadius: 14,
  padding: 20,
  boxShadow: '0 14px 40px rgba(0,0,0,0.24)',
  pointerEvents: 'auto',
  outline: 'none',
};

const MIDDLE: React.CSSProperties = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

const EYEBROW: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#9AA2A1',
};

const TITLE: React.CSSProperties = { margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1A1D1F', lineHeight: 1.3 };

const BODY: React.CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#5B6266' };

const BUTTON: React.CSSProperties = {
  border: 0,
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

/**
 * Everything the engine says on its own behalf.
 *
 * Separate from the tours, because these are not about any restaurant: they are
 * the words on the buttons, and a tour author changing what a step says should
 * not be able to change what Next is called.
 */
const SPEECH = {
  en: {
    mission: (index: number, total: number) => `Mission ${index} of ${total}`,
    objective: 'Your objective',
    yourTurn: 'Your turn',
    missionDone: 'Mission complete',
    waiting: 'Go ahead - the tour waits for you.',
    start: "Let's go",
    next: 'Next',
    nextMission: 'Next mission',
    finish: 'Finish',
    back: 'Back',
    skip: 'Show me instead',
    close: 'Close',
    offer: 'One last thing',
    startTrial: 'Start my free trial',
    later: 'Maybe later',
    closeToGoOn: 'Take the payment, or close this box - the tour picks up either way.',
    leaveTitle: 'Your place is saved',
    leaveBody:
      'Go and press things - that is what the demo is for. When you want the tour back, open My Profile at the bottom of the menu on the left and press Continue on the walkthrough card. It reopens at this exact step.',
    leaveConfirm: 'Close the tour',
    leaveCancel: 'Keep going',
  },
  bn: {
    mission: (index: number, total: number) => `মিশন ${index} / ${total}`,
    objective: 'আপনার লক্ষ্য',
    yourTurn: 'এবার আপনার পালা',
    missionDone: 'মিশন সম্পন্ন',
    waiting: 'নির্দ্বিধায় করুন — গাইড আপনার জন্য অপেক্ষা করছে।',
    start: 'চলুন শুরু করি',
    next: 'পরবর্তী',
    nextMission: 'পরের মিশন',
    finish: 'শেষ',
    back: 'আগের',
    skip: 'আমাকে দেখিয়ে দিন',
    close: 'বন্ধ করুন',
    offer: 'শেষ একটি কথা',
    startTrial: 'আমার ফ্রি ট্রায়াল শুরু করুন',
    later: 'পরে দেখব',
    closeToGoOn: 'টাকা নিন, কিংবা বাক্সটি বন্ধ করুন — দুভাবেই গাইড এগিয়ে যাবে।',
    leaveTitle: 'আপনার জায়গা সংরক্ষিত আছে',
    leaveBody:
      'ঘুরে দেখুন, নিজে চাপ দিন — ডেমো তো এজন্যই। গাইড আবার চাইলে বাঁ পাশের মেনুর নিচে "My Profile" খুলে ওয়াকথ্রু কার্ডের "Continue"-তে চাপ দিন। ঠিক এই ধাপ থেকেই আবার শুরু হবে।',
    leaveConfirm: 'গাইড বন্ধ করুন',
    leaveCancel: 'চালিয়ে যান',
  },
} as const;

/** Whether two measurements would draw the same ring, nulls included. */
function sameBox(a: DOMRect | null, b: DOMRect | null): boolean {
  if (a === null || b === null) return a === b;

  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/**
 * Where the card sits relative to the highlighted element.
 *
 * Falls back to the middle of the screen when there is nothing to point at, which
 * is what a step whose target vanished looks like for the moment before it is
 * skipped.
 */
function cardPosition(
  rect: DOMRect | null,
  placement: TourStep['placement'] = 'bottom',
  width: number,
): React.CSSProperties {
  if (!rect) return MIDDLE;

  const gap = 14;

  switch (placement) {
    case 'right':
      return { top: clampTop(rect.top), left: clampLeft(rect.right + gap, width) };
    case 'left':
      return { top: clampTop(rect.top), left: clampLeft(rect.left - width - gap, width) };
    case 'top':
      return { top: stacked(rect, 'above'), left: clampLeft(rect.left, width) };
    default:
      return { top: stacked(rect, 'below'), left: clampLeft(rect.left, width) };
  }
}

/**
 * A card above or below the ring, on whichever side it actually fits.
 *
 * Preferred side first, and the other one when the preferred side has run out
 * of room - a card clamped back onto the screen sits *on top of* the thing it
 * is pointing at, which for a step that says "press this" means covering the
 * button being asked for. The POS checkout button, at the bottom right of the
 * screen, is exactly that case.
 */
function stacked(rect: DOMRect, prefer: 'above' | 'below'): number {
  const gap = 14;
  const above = rect.top - CARD_HEIGHT - gap;
  const below = rect.bottom + gap;
  const fitsAbove = above >= EDGE;
  const fitsBelow = below + CARD_HEIGHT <= window.innerHeight - EDGE;

  if (prefer === 'above') return fitsAbove || !fitsBelow ? clampTop(above) : below;

  return fitsBelow || !fitsAbove ? clampTop(below) : above;
}

/**
 * Keeps the card on screen from top to bottom.
 *
 * Every branch above goes through this, because every one of them can run out
 * of room: the menu items the tour points at run right down the left edge, and
 * lining the card up with the last of them put its buttons below the fold.
 *
 * The height is estimated rather than measured - the position is computed while
 * rendering the very card that would be measured - and estimated generously on
 * purpose. A card sitting slightly higher than it had to is not something
 * anybody notices; one with its "Next" off the bottom of the screen is.
 */
function clampTop(top: number): number {
  const floor = Math.max(EDGE, window.innerHeight - CARD_HEIGHT - EDGE);

  return Math.min(Math.max(EDGE, top), floor);
}
