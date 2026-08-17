'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isDemoSession } from '@/lib/demo';
import { percentAt, tours, type TourKind, type TourStep } from '@/lib/walkthrough/tours';
import { readState, reportProgress, writeState } from '@/lib/walkthrough/progress';

/**
 * The guided tour, for both the demo and a new trial.
 *
 * One engine, two lists of steps. What differs between the tours is their order
 * and their words, both of which live in `lib/walkthrough/tours.ts` - so changing
 * what a tour says never means touching this file.
 *
 * Three rules shape the behaviour, and each exists because the opposite is worse
 * than having no tour:
 *
 * - **A missing target is skipped, never blocking.** Screens change, and a tour
 *   that stops dead because one button moved would break silently for everybody.
 * - **It can always be closed, and stays closed.** A tour you cannot dismiss is an
 *   obstacle rather than an introduction.
 * - **It never waits on the network.** Progress is reported fire-and-forget; the
 *   person is using the product, not waiting on telemetry.
 */

const SELECTOR = (target: string) => `[data-tour="${target}"]`;

/** The card's width, and the margin kept between it and the edge of the screen. */
const CARD_WIDTH = 320;
const EDGE = 16;

type Located = { el: HTMLElement | null; present: boolean; visible?: boolean };

/**
 * Whether an element is somewhere a person can actually see.
 *
 * `querySelector` finding something is not enough: the admin sidebar stays in the
 * DOM when it slides off-canvas on a narrow screen, and a ring drawn around it
 * lands off the edge of the screen, pointing at nothing.
 */
function isOnScreen(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) return false;

  return rect.right > 0 && rect.left < window.innerWidth;
}

/** Keeps the card on screen whatever it was asked to sit beside. */
function clampLeft(left: number): number {
  return Math.max(EDGE, Math.min(left, window.innerWidth - CARD_WIDTH - EDGE));
}

/** How long to wait for a step's target after navigating to its page. */
const TARGET_TIMEOUT_MS = 1500;

type Props = {
  /**
   * Which tour to run. Passed in rather than guessed here, so the decision - a
   * demo visit, or a trial in its first days - lives with whatever knows it.
   */
  kind?: TourKind;
  lang?: 'en' | 'bn';
};

export default function Walkthrough({ kind, lang = 'en' }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Demo visits are recognised here so nothing else has to pass it in; a trial
  // tour is opt-in from whatever decides somebody is new enough to want it.
  const resolvedKind: TourKind | null = useMemo(() => {
    if (kind) return kind;

    return typeof document !== 'undefined' && isDemoSession() ? 'demo' : null;
  }, [kind]);

  const steps = useMemo(() => (resolvedKind ? tours[resolvedKind] : []), [resolvedKind]);

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

  const [rect, setRect] = useState<DOMRect | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);
  // The furthest step reported, so a tour reopened from the start does not report
  // progress going backwards.
  const reportedRef = useRef(-1);
  // The step this last took somebody to, so it does so only once.
  const navigatedRef = useRef<string | null>(null);

  const step: TourStep | undefined = steps[index];

  /* ---------------------------------------------------------------- controls */

  // Both of these only move the index. Where the tour *goes* is decided by the
  // effect below, from whichever step is now current - routing from inside a state
  // update means updating the router while this component is still rendering.
  const advance = useCallback(() => {
    const next = index + 1;

    if (next >= steps.length) {
      if (resolvedKind) writeState(resolvedKind, { completed: true, index });
      setOpen(false);

      return;
    }

    setIndex(next);
  }, [index, steps.length, resolvedKind]);

  const back = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);

  const dismiss = useCallback(() => {
    if (resolvedKind) writeState(resolvedKind, { dismissed: true, index });
    setOpen(false);
  }, [resolvedKind, index]);

  /* ---------------------------------------------------------------- navigation */

  // Keeps the tour and the address bar agreed: a step that names a page takes the
  // person there, whichever direction they arrived from.
  //
  // Once per step, and no more. Somebody who clicks something of their own while a
  // step is showing is exploring the product, which is the entire point - pulling
  // them back would turn a tour into a cage.
  useEffect(() => {
    if (!open || !step?.href || navigatedRef.current === step.key) return;

    navigatedRef.current = step.key;

    if (step.href !== pathname) router.push(step.href);
  }, [open, step, pathname, router]);

  /* ------------------------------------------------------- finding the target */

  const locate = useCallback((): Located => {
    if (!step) return { el: null, present: false };

    const el = document.querySelector<HTMLElement>(SELECTOR(step.target));

    if (!el) return { el: null, present: false };

    return { el, present: true, visible: isOnScreen(el) };
  }, [step]);

  useEffect(() => {
    if (!open || !step) return;

    let cancelled = false;
    const startedAt = Date.now();

    // Polls rather than assuming the element is there: the step may have just
    // navigated to another page, and the target only exists once it renders.
    const find = () => {
      if (cancelled) return;

      const { el, present, visible } = locate();

      if (el && visible) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setRect(el.getBoundingClientRect());

        return;
      }

      if (present) {
        // There, but off-canvas: the sidebar on a narrow screen, most often. The
        // step still has something to say and the page it wanted is already open,
        // so it is shown without a ring rather than skipped.
        setRect(null);

        return;
      }

      if (Date.now() - startedAt > TARGET_TIMEOUT_MS) {
        // Gone. Skip rather than block - a tour with a gap still works, a tour
        // stuck on a missing button does not.
        setRect(null);
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

  // Keeps the highlight on the element while the page moves under it.
  useEffect(() => {
    if (!open) return;

    const reposition = () => {
      const { el, visible } = locate();

      setRect(el && visible ? el.getBoundingClientRect() : null);
    };

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, locate]);

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

  // Escape closes, as it does for every other overlay anybody has used.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
      if (event.key === 'ArrowRight') advance();
      if (event.key === 'ArrowLeft') back();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss, advance, back]);

  // Focus moves to the step, so a screen reader announces it and the keyboard
  // controls work without hunting for the card.
  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, index]);

  if (!open || !resolvedKind || !step) return null;

  const total = steps.length;
  const card = cardPosition(rect, step.placement);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="walkthrough-title"
      aria-describedby="walkthrough-body"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}
    >
      {/* The cut-out. A ring around the target rather than a dimmed overlay with a
          hole in it: the product stays readable and clickable, which matters when
          the step is asking somebody to look at live numbers. */}
      {rect && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            border: '2px solid #0F6E5C',
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(10, 78, 66, 0.35)',
            transition: 'all 150ms ease',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        style={{
          position: 'fixed',
          ...card,
          width: CARD_WIDTH,
          maxWidth: 'calc(100vw - 32px)',
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
          pointerEvents: 'auto',
          outline: 'none',
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: '#5B6266', letterSpacing: '0.04em' }}>
          {index + 1} / {total}
        </p>

        <h2 id="walkthrough-title" style={{ margin: '6px 0 8px', fontSize: 17, fontWeight: 700, color: '#1A1D1F' }}>
          {step.title[lang]}
        </h2>

        <p id="walkthrough-body" style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.55, color: '#5B6266' }}>
          {step.body[lang]}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={dismiss}
            style={{ ...buttonStyle, background: 'transparent', color: '#5B6266', paddingInline: 0 }}
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>

          <span style={{ flex: 1 }} />

          {index > 0 && (
            <button type="button" onClick={back} style={{ ...buttonStyle, background: '#F2F5F4', color: '#1A1D1F' }}>
              {lang === 'bn' ? 'আগের' : 'Back'}
            </button>
          )}

          <button type="button" onClick={advance} style={{ ...buttonStyle, background: '#0F6E5C', color: '#fff' }}>
            {index + 1 === total
              ? lang === 'bn'
                ? 'শেষ'
                : 'Done'
              : lang === 'bn'
                ? 'পরবর্তী'
                : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

/**
 * Where the card sits relative to the highlighted element.
 *
 * Falls back to the middle of the screen when there is nothing to point at, which
 * is what a step whose target vanished looks like for the moment before it is
 * skipped.
 */
function cardPosition(rect: DOMRect | null, placement: TourStep['placement'] = 'bottom'): React.CSSProperties {
  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  const gap = 14;

  switch (placement) {
    case 'right':
      return { top: Math.max(16, rect.top), left: clampLeft(rect.right + gap) };
    case 'left':
      return { top: Math.max(16, rect.top), left: clampLeft(rect.left - 320 - gap) };
    case 'top':
      return { top: Math.max(16, rect.top - 190), left: clampLeft(rect.left) };
    default:
      return {
        top: Math.min(rect.bottom + gap, window.innerHeight - 220),
        left: clampLeft(rect.left),
      };
  }
}
