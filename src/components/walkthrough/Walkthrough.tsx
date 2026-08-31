'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isDemoSession, readLanguage, type Language } from '@/lib/demo';
import { indexOfKey, knowsTheWayBack, percentAt, tours, type TourKind, type TourStep } from '@/lib/walkthrough/tours';
import { GUIDE_AVATAR, GUIDE_INITIAL, GUIDE_NAME } from '@/lib/walkthrough/guide';
import { offerPrice, verifyUrl } from '@/lib/marketing';
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

/**
 * What to press to bring a hidden target into view.
 *
 * The admin menu is a rail on a desktop and a drawer on a phone, and every
 * step that says "open Reporting" points at the same anchor on both. On a
 * phone that anchor is parked off the left edge until somebody opens the
 * drawer, so the step used to arrive with no ring, no tap and an instruction
 * naming a menu that is not on the screen - the tour simply stopped, on the
 * device most people meet it on.
 *
 * Rather than a second set of steps for narrow screens, the layout says which
 * region a target lives in and which control reveals that region, and the tour
 * opens it on the person's behalf. What they then do is what a desktop visitor
 * does: press the item the ring is around. One tour, one set of words, one
 * click - the drawer is machinery, not a lesson.
 *
 * The opener has to be on screen itself, which is what keeps this from firing
 * on a desktop: the hamburger is `lg:hidden`, so above that width there is
 * nothing to press and nothing to reveal.
 */
function revealerFor(el: HTMLElement): HTMLElement | null {
  const region = el.closest('[data-tour-region]')?.getAttribute('data-tour-region');

  if (!region) return null;

  const opener = document.querySelector<HTMLElement>(`[data-tour-reveal="${region}"]`);

  return opener !== null && isOnScreen(opener) ? opener : null;
}

/**
 * One reading of a step's target: where it is, and whether it drops a list.
 *
 * Kept as a single object with the step key in it so a measurement can never be
 * applied to the step after the one it was taken for - the ring would jump to
 * the previous page's button for a frame, which is the sort of flicker that
 * reads as a bug rather than as a transition.
 */
type Measurement = { key: string; rect: DOMRect | null; listy: boolean };

/**
 * Whether pressing this opens a list underneath it.
 *
 * The space below a select belongs to the select. Options are drawn there the
 * moment it is pressed, they are drawn *over* everything including a fixed card
 * at z-index 9999, and the tour has no way to know how tall the list will be -
 * so the only safe answer is not to put the card there in the first place.
 *
 * Checked on the element and inside it, because a tour anchors to whatever
 * wrapper carries the data-tour attribute, and the actual control is usually a
 * field or two down from it.
 */
const DROPS_A_LIST = 'select, [role="combobox"], [role="listbox"], [aria-haspopup="listbox"], input[list], .dropdown';

function opensDownward(el: HTMLElement): boolean {
  return el.matches(DROPS_A_LIST) || el.querySelector(DROPS_A_LIST) !== null;
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
  /**
   * How to reach us, as the account itself reports it.
   *
   * Only the closing card uses it, and only for the WhatsApp number: somebody
   * who wants to ask a person before paying should not have to go and find the
   * website. Passed down rather than fetched here because the layout has
   * already asked - and left out, the card simply makes the offer without the
   * second way to answer it.
   */
  contact?: { whatsapp?: string } | null;
};

export default function Walkthrough({ kind, lang, contact }: Props) {
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
  const [found, setFound] = useState<Measurement>({ key: '', rect: null, listy: false });

  // The step whose wait has gone on long enough to offer a way past. Held as a
  // key rather than a flag so moving on clears it by no longer matching, rather
  // than by an effect resetting it.
  const [stuckAt, setStuckAt] = useState<string | null>(null);

  const [avatarBroken, setAvatarBroken] = useState(false);

  // Waiting on the checkout link at the very end of the trial tour. Only the
  // closing card can set it, and it exists so that card's button can go quiet
  // rather than look unpressed while the server issues a URL.
  const [upgrading, setUpgrading] = useState(false);

  /*
   * The screen, and the card on it, as they actually are.
   *
   * Both were constants until a phone got hold of the tour. The card's height
   * was a guess of 300, which is close enough on a desktop and nowhere near it
   * when the same paragraph wraps to nine lines in a 343px column; the screen
   * was read straight off `window` during layout, which is right until it turns
   * sideways. Measuring both is what lets the placement arithmetic below be
   * about the card being drawn rather than a card of average size.
   */
  const [cardHeight, setCardHeight] = useState(CARD_HEIGHT);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }));

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
  // The step whose hidden target the tour has already opened a drawer for. The
  // control that reveals a region is the control that hides it again, so this
  // is what keeps a reveal from becoming a toggle.
  const revealedRef = useRef<string | null>(null);

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
  // Whether the thing being pointed at drops a list out of itself when opened.
  // Read the same guarded way, for the same reason.
  const listy = step !== undefined && found.key === step.key && found.listy;
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

  /**
   * Taking the offer at the end of the trial tour, which is a different ask.
   *
   * Not a link, because there is nowhere to link to: the checkout URL is issued
   * per account and has to be asked for. So the button waits on the server, and
   * says so while it does - a button that looks unpressed for two seconds gets
   * pressed twice, and the second press is a second checkout.
   *
   * The tour is marked finished only once there is somewhere to go. Marking it
   * on the click would lose the last card to a failed request, and the last
   * card is the only place the offer is made.
   */
  const subscribe = useCallback(async () => {
    if (upgrading || !resolvedKind) return;

    setUpgrading(true);

    try {
      const { fetchApi } = await import('@/lib/api');
      const res = await fetchApi('/billing/upgrade-link', { method: 'POST' });

      if (res?.url) {
        writeState(resolvedKind, { completed: true, index });
        announceTourEnd(resolvedKind);
        window.location.href = res.url;

        return;
      }

      throw new Error('No upgrade URL returned');
    } catch (error) {
      console.error('Could not start the subscription', error);
      setUpgrading(false);
    }
  }, [upgrading, resolvedKind, index]);

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
        setFound({ key: step.key, rect: el.getBoundingClientRect(), listy: opensDownward(el) });

        return;
      }

      if (present && el) {
        /*
         * There, but off-canvas: the menu drawer on a phone, almost always.
         *
         * Opened once per step rather than every hundred milliseconds, because
         * the control that opens a drawer is the same control that closes it -
         * polling it would hold the menu in a fight with itself. Once is also
         * enough to respect somebody who shuts it again on purpose: the card
         * still says what to do, and the way past appears as it does anywhere
         * else the tour is waiting.
         */
        if (revealedRef.current !== step.key) {
          const opener = revealerFor(el);

          if (opener) {
            revealedRef.current = step.key;
            opener.click();
            window.setTimeout(find, 120);

            return;
          }
        }

        /*
         * Nothing could reveal it. The step still has something to say and the
         * page it wanted is already open, so it is shown without a ring rather
         * than skipped - but a step that waits for a click on something nobody
         * can reach would wait for ever, so keep looking while it waits: a
         * drawer the person opens themselves is the target arriving.
         */
        setFound({ key: step.key, rect: null, listy: false });

        if (step.awaitClick || step.untilGone) window.setTimeout(find, 300);

        return;
      }

      if (Date.now() - startedAt > TARGET_TIMEOUT_MS) {
        // Gone. Skip rather than block - a tour with a gap still works, a tour
        // stuck on a missing button does not.
        setFound({ key: step.key, rect: null, listy: false });
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
        held.key === step.key && sameBox(held.rect, next)
          ? held
          : { key: step.key, rect: next, listy: el !== null && opensDownward(el) },
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

  // Rotating a phone changes which side of a target has room on it.
  useEffect(() => {
    const measure = () => setViewport({ width: window.innerWidth, height: window.innerHeight });

    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  /*
   * Watches the card's own height.
   *
   * Re-observed per step because the card is a different element in the leaving
   * branch, and because the height that matters is this step's - the objective
   * card and the one-line "press this" card differ by two hundred pixels, which
   * is the difference between a card above the target and a card on it.
   */
  useEffect(() => {
    const el = cardRef.current;

    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      const height = el.getBoundingClientRect().height;

      setCardHeight((held) => (Math.abs(held - height) < 1 ? held : height));
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, [open, index, leaving]);

  if (!open || !resolvedKind || !step) return null;

  const words = SPEECH[language];
  // Null when this deployment has no marketing site to send them to, which is
  // the one case the closing offer quietly turns back into an ordinary Finish.
  const trialLink = verifyUrl('trial');
  // Without somewhere to send them the offer is just a card with no answer on
  // it, so it falls back to the ordinary footer and its Finish button.
  const offering = step.cta === 'trial' && trialLink !== null;
  // The trial tour's closing card. Unlike the demo's, this one always has an
  // answer to give - the checkout is asked for rather than linked to - so it
  // never falls back to an ordinary Finish.
  const subscribing = step.cta === 'subscribe';
  // Both optional, and the card reads sensibly without either: no figure means
  // the offer without a price on it, no number means no second way to ask.
  const price = subscribing ? offerPrice() : null;
  const whatsapp = subscribing && contact?.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`
    : null;
  /*
   * The width the card will actually take, not the one it asked for.
   *
   * The element is capped at `calc(100vw - 32px)`, and on a phone that cap is
   * what wins - a briefing asks for 420 and gets 343. Placement worked from the
   * asked-for number, so every calculation about whether the card fits beside
   * something was answered for a card 77px wider than the one being drawn.
   */
  const asked = centred || leaving ? BRIEFING_WIDTH : CARD_WIDTH;
  const width = Math.min(asked, viewport.width - EDGE * 2);
  const ringed = rect !== null && !centred && !leaving;
  const card = leaving || centred ? MIDDLE : cardPosition(rect, step.placement, width, listy, cardHeight);

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
        <Scrim hole={null} />

        <div ref={cardRef} tabIndex={-1} style={{ ...CARD_BASE, ...card, width, maxWidth: 'calc(100vw - 32px)' }}>
          {avatar}

          <h2 id="walkthrough-title" style={TITLE}>{words.leaveTitle}</h2>
          {/* The demo is somewhere to press things; a trial is somewhere to
              build something. Same promise either way - your place is kept -
              but told about the restaurant they are actually in. */}
          <p id="walkthrough-body" style={BODY}>
            {resolvedKind === 'trial' ? words.leaveBodySetup : words.leaveBody}
          </p>

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
      {/* Everything but the target, dimmed - and the whole screen when there is
          no target, which is what a briefing, a debrief, the closing offer and
          the are-you-sure card all are. Those used to arrive on a fully lit
          screen, and read as a different kind of thing rather than as the same
          tour with nothing to point at. */}
      <Scrim hole={ringed ? rect : null} strong={waiting} />

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
            // A short glow, not the old page-wide one. Softens the square
            // corners of the scrim's hole and gives the ring some weight.
            boxShadow: '0 0 0 4px rgba(15, 110, 92, 0.16)',
            transition: 'all 150ms ease',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* "Press this", drawn rather than written.

          The ring alone says *where*; it does not say what to do there, and on a
          step that is waiting for a click that is the whole instruction. The
          ripple reads as a tap at a glance and in any language, which the card's
          sentence does not - somebody scanning the screen for what to press is
          not reading the paragraph.

          Anchored to the bottom-right of the target rather than its centre: the
          middle of a button is where its label is, and a pointer sitting on the
          word is a pointer covering the word. */}
      {ringed && rect && waiting && (
        <div
          aria-hidden
          className="walkthrough-tap"
          style={{
            position: 'fixed',
            left: rect.right - Math.min(26, rect.width / 2),
            top: rect.bottom - Math.min(14, rect.height / 3),
            width: 0,
            height: 0,
            pointerEvents: 'none',
          }}
        >
          <span className="walkthrough-tap__ripple" />
          <span className="walkthrough-tap__ripple walkthrough-tap__ripple--late" />
          <svg
            className="walkthrough-tap__pointer"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M5 3.5 L5 17.2 L8.6 14 L11 19.8 L13.9 18.6 L11.5 13 L16.2 12.6 Z"
              fill={TAP}
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </div>
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

        {/* The figure, said plainly and once.

            Set apart from the paragraph rather than written into it because a
            price buried in a sentence reads as a hedge, and because the copy
            has to survive the number changing. The struck-through list price
            is the one nobody is charged; the one beside it is the one on the
            invoice. */}
        {price && (
          <div
            style={{
              display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 8,
              marginTop: 4, marginBottom: 2,
            }}
          >
            {price.was !== null && (
              <span style={{ fontSize: 15, color: '#9AA3A1', textDecoration: 'line-through' }}>
                ৳{price.was.toLocaleString('en-US')}
              </span>
            )}
            <span style={{ fontSize: 26, fontWeight: 700, color: BRAND, lineHeight: 1.1 }}>
              ৳{price.now.toLocaleString('en-US')}
            </span>
            <span style={{ fontSize: 13, color: '#78807F' }}>{words.perMonth}</span>
            <span style={{ fontSize: 13, color: '#78807F' }}>·</span>
            <span style={{ fontSize: 13, color: '#78807F' }}>{words.noSetupFee}</span>
          </div>
        )}

        {/* Nothing to press. Every control out here is inert while the dialog
            is up, so a row of dead buttons would only be something to blame
            oneself for. The line below says what does move the tour on. */}
        {subscribing ? (
          /* Two answers on the card, in the order they are wanted: the button
             for somebody ready, WhatsApp for somebody who wants to ask a person
             first, and a way past for somebody who wants neither. */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            <button
              type="button"
              onClick={subscribe}
              disabled={upgrading}
              style={{
                ...BUTTON,
                background: BRAND,
                color: '#fff',
                display: 'block',
                width: '100%',
                textAlign: 'center',
                padding: '11px 18px',
                opacity: upgrading ? 0.7 : 1,
                cursor: upgrading ? 'default' : 'pointer',
              }}
            >
              {upgrading ? words.opening : words.subscribeNow}
            </button>

            {whatsapp !== null && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...BUTTON,
                  background: 'transparent',
                  color: BRAND,
                  border: `1px solid ${BRAND}`,
                  textDecoration: 'none',
                  display: 'block',
                  textAlign: 'center',
                  padding: '10px 18px',
                }}
              >
                {words.whatsappUs}
              </a>
            )}

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
        ) : offering ? (
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

/**
 * The colour of "press this".
 *
 * Deliberately not the brand green. The tap sits on top of a dark green scrim
 * and next to a green ring, and a green hand inside all that is a shape you
 * have to look for rather than one that arrives on its own. Amber is the one
 * hue in the palette that is loud against both the dimmed page and the lit
 * target, and it is not used anywhere else in the tour, so it never has to be
 * told apart from something.
 */
const TAP = '#FF7A18';
const TAP_WASH = 'rgba(255, 122, 24, 0.18)';

/**
 * What the tour dims the rest of the screen with.
 *
 * The same value the ring throws out through its enormous box-shadow, kept in
 * one place so a card with nothing to point at and a card with something to
 * point at cannot end up sitting on two different shades of the same product.
 */
const SCRIM = 'rgba(10, 78, 66, 0.55)';
/**
 * Darker again while a step is waiting to be pressed.
 *
 * Both of these are heavier than they were, because the old pair were not
 * actually doing the job on a light page: over white, a 0.35 wash of this green
 * reads as a faint tint rather than as a screen with one live thing on it, and
 * "the Create PO button is not indicated" was somebody looking straight at a
 * ringed button and not seeing an indication.
 */
const SCRIM_WAITING = 'rgba(10, 78, 66, 0.68)';

/**
 * Dims the page, leaving a hole where the tour is pointing.
 *
 * Four bands rather than the obvious one-element trick - a small box with an
 * enormous `box-shadow` spread, which is what this used to be. That trick works
 * until it does not: on a long page Chrome silently declines to paint a
 * 9999px-spread shadow on a fixed element, and the result is a ring around the
 * button with the entire screen still lit behind it. It looked like the step
 * had failed to fire. The purchase orders list is one of the pages it happens
 * on, which is why the Create PO step read as un-indicated.
 *
 * Four ordinary rectangles cannot fail that way, cost nothing, and dim every
 * card identically whether or not it has something to point at.
 *
 * The hole has square corners where the ring is rounded. Nobody sees it: the
 * ring's own two-pixel border is drawn over that exact edge.
 */
function Scrim({ hole, strong = false }: { hole: DOMRect | null; strong?: boolean }) {
  const tint = strong ? SCRIM_WAITING : SCRIM;
  const band: React.CSSProperties = { position: 'fixed', background: tint, pointerEvents: 'none' };

  if (!hole) return <div aria-hidden style={{ ...band, inset: 0 }} />;

  // Matched to the ring, so the lit patch is the ring's interior rather than the
  // element's - a button whose glow sits on a dimmed background looks bruised.
  const top = hole.top - 6;
  const left = hole.left - 6;
  const right = hole.right + 6;
  const bottom = hole.bottom + 6;

  return (
    <div aria-hidden>
      <div style={{ ...band, top: 0, left: 0, right: 0, height: Math.max(0, top) }} />
      <div style={{ ...band, top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div style={{ ...band, top, left: 0, width: Math.max(0, left), height: Math.max(0, bottom - top) }} />
      <div style={{ ...band, top, left: right, right: 0, height: Math.max(0, bottom - top) }} />
    </div>
  );
}

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

        @keyframes walkthrough-ripple {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.85; }
          70% { opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes walkthrough-tap {
          0%, 62%, 100% { transform: scale(1); }
          72% { transform: scale(0.78); }
          84% { transform: scale(1.04); }
        }
        .walkthrough-tap__ripple {
          position: absolute;
          left: 0;
          top: 0;
          width: 104px;
          height: 104px;
          margin: 0;
          border-radius: 50%;
          border: 3px solid ${TAP};
          background: ${TAP_WASH};
          transform: translate(-50%, -50%) scale(0.35);
          animation: walkthrough-ripple 1.8s ease-out infinite;
        }
        .walkthrough-tap__ripple--late { animation-delay: 0.9s; }
        .walkthrough-tap__pointer {
          position: absolute;
          left: -4px;
          top: -4px;
          transform-origin: 20% 15%;
          filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45));
          animation: walkthrough-tap 1.8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .walkthrough-ring--waiting { animation: none; }
          /* The pointer stays - it is the instruction, not the decoration - and
             only stops moving. The ripples are pure motion, so they go. */
          .walkthrough-tap__ripple { display: none; }
          .walkthrough-tap__pointer { animation: none; }
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
    subscribeNow: 'Subscribe now',
    opening: 'Opening…',
    whatsappUs: 'Ask us on WhatsApp',
    perMonth: 'per month',
    noSetupFee: 'no set-up cost',
    later: 'Maybe later',
    closeToGoOn: 'Take the payment, or close this box - the tour picks up either way.',
    leaveTitle: 'Your place is saved',
    leaveBody:
      'Go and press things - that is what the demo is for. When you want the tour back, open My Profile at the bottom of the menu on the left and press Continue on the walkthrough card. It reopens at this exact step.',
    leaveBodySetup:
      'Go and set the rest up yourself - that is what the trial is for. When you want the tour back, open My Profile at the bottom of the menu on the left and press Continue on the walkthrough card. It reopens at this exact step.',
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
    subscribeNow: 'এখনই সাবস্ক্রাইব করুন',
    opening: 'খোলা হচ্ছে…',
    whatsappUs: 'হোয়াটসঅ্যাপে জিজ্ঞাসা করুন',
    perMonth: 'প্রতি মাসে',
    noSetupFee: 'কোনো সেটআপ খরচ নেই',
    later: 'পরে দেখব',
    closeToGoOn: 'টাকা নিন, কিংবা বাক্সটি বন্ধ করুন — দুভাবেই গাইড এগিয়ে যাবে।',
    leaveTitle: 'আপনার জায়গা সংরক্ষিত আছে',
    leaveBody:
      'ঘুরে দেখুন, নিজে চাপ দিন — ডেমো তো এজন্যই। গাইড আবার চাইলে বাঁ পাশের মেনুর নিচে "My Profile" খুলে ওয়াকথ্রু কার্ডের "Continue"-তে চাপ দিন। ঠিক এই ধাপ থেকেই আবার শুরু হবে।',
    leaveBodySetup:
      'বাকিটা নিজেই সাজিয়ে নিন — ট্রায়াল তো এজন্যই। গাইড আবার চাইলে বাঁ পাশের মেনুর নিচে "My Profile" খুলে ওয়াকথ্রু কার্ডের "Continue"-তে চাপ দিন। ঠিক এই ধাপ থেকেই আবার শুরু হবে।',
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
  listy = false,
  height = CARD_HEIGHT,
): React.CSSProperties {
  if (!rect) return MIDDLE;

  const gap = 14;

  /** Whether a card of this width fits between the target and that edge. */
  const roomRight = rect.right + gap + width + EDGE <= window.innerWidth;
  const roomLeft = rect.left - gap - width >= EDGE;

  /*
   * A step whose target drops a list keeps its card out of the drop.
   *
   * The author asked for 'bottom' - or said nothing and got it - without
   * knowing the field would be a select, and the card lands exactly where the
   * options will. Moved to whichever side has room for it, and above the field
   * when neither side does, all of which leave the list clear.
   *
   * Only 'bottom' is overridden. 'left', 'right' and 'top' were chosen against
   * this particular screen, and second-guessing a placement somebody picked on
   * purpose is how a card ends up somewhere worse than where it was put.
   */
  if (listy && placement === 'bottom') {
    if (roomRight) return { top: clampTop(rect.top, height), left: clampLeft(rect.right + gap, width) };
    if (roomLeft) return { top: clampTop(rect.top, height), left: clampLeft(rect.left - width - gap, width) };

    return { top: stacked(rect, 'above', height), left: clampLeft(rect.left, width) };
  }

  /*
   * A side placement only survives while there is a side to put it on.
   *
   * On a desktop there always is, which is why 'left' and 'right' were written
   * against one. A phone is 375 across and the card is 340 of it, so the clamp
   * that keeps a card on screen used to drop it straight on top of the thing it
   * was pointing at - the menu item the step is asking somebody to press, with
   * the ring around it, underneath the card telling them to press it.
   *
   * So a side that has no room is not clamped, it is given up: the other side
   * if that has room, and otherwise above or below, which any screen has room
   * for. The placement in the step stays a preference about a wide screen
   * rather than an instruction that goes wrong on a narrow one.
   */
  switch (placement) {
    case 'right':
      if (roomRight) return { top: clampTop(rect.top, height), left: clampLeft(rect.right + gap, width) };
      if (roomLeft) return { top: clampTop(rect.top, height), left: clampLeft(rect.left - width - gap, width) };

      return { top: stacked(rect, 'below', height), left: clampLeft(rect.left, width) };
    case 'left':
      if (roomLeft) return { top: clampTop(rect.top, height), left: clampLeft(rect.left - width - gap, width) };
      if (roomRight) return { top: clampTop(rect.top, height), left: clampLeft(rect.right + gap, width) };

      return { top: stacked(rect, 'below', height), left: clampLeft(rect.left, width) };
    case 'top':
      return { top: stacked(rect, 'above', height), left: clampLeft(rect.left, width) };
    default:
      return { top: stacked(rect, 'below', height), left: clampLeft(rect.left, width) };
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
function stacked(rect: DOMRect, prefer: 'above' | 'below', height = CARD_HEIGHT): number {
  const gap = 14;
  const above = rect.top - height - gap;
  const below = rect.bottom + gap;
  const fitsAbove = above >= EDGE;
  const fitsBelow = below + height <= window.innerHeight - EDGE;

  if (prefer === 'above') return fitsAbove || !fitsBelow ? clampTop(above, height) : below;

  return fitsBelow || !fitsAbove ? clampTop(below, height) : above;
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
function clampTop(top: number, height = CARD_HEIGHT): number {
  const floor = Math.max(EDGE, window.innerHeight - height - EDGE);

  return Math.min(Math.max(EDGE, top), floor);
}
