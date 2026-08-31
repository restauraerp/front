/**
 * The two guided tours, as data.
 *
 * Steps are a list rather than markup so a tour is edited without touching the
 * component that draws it, and so the percentage reported back is simply how far
 * through the list somebody got.
 *
 * The two tours are the same mechanism aimed at different moments, and they are
 * shaped differently because the moments are:
 *
 * - **Demo** is a set of missions. Somebody in the demo is deciding whether this
 *   is worth their time, and the way to answer that is not to describe the
 *   product but to have them work it: state a goal they actually have ("how much
 *   did I make last month?"), walk them to it click by click, then explain what
 *   they are now looking at. Told, they nod; done, they remember.
 * - **Trial** is the same shape aimed at somebody who has already decided and now
 *   has an empty restaurant on the screen. Every beat asks them to put in
 *   something of their own rather than read something we prepared, because what
 *   is being learned is how to do it again next week without a card on screen.
 *
 * One engine draws both, and the mission chrome is what makes a click into a
 * lesson: a goal before it, and an explanation of the result after.
 *
 * The words are not here. Every title and body lives in
 * `walkthrough/{demo,trial}/tour.xml` (English) and `bn.xml` (Bengali), and is
 * compiled into `copy.generated.ts` by `npm run walkthrough:copy`. This file
 * keeps only what has to be read beside the product's own source - the
 * `data-tour` a beat rings, the page it lives on, whether it waits for a click
 * - so that rewording a step never means editing TypeScript, and so the two
 * languages are edited side by side rather than in a nest of object literals.
 */

import { copy } from './copy.generated';

export type TourKind = 'demo' | 'trial';

/**
 * What a step is for, which is what the card looks like.
 *
 * - `objective` - the briefing. No target, no ring: the whole screen is the
 *   subject, and the card says what they are about to achieve.
 * - `action` - their turn. A ring around one control and nothing to press on the
 *   card except an escape hatch; the tour moves when they click the thing.
 * - `explain` - the debrief, pointed at whatever they just produced. This is the
 *   part that turns a click into knowledge, so it is where the words go.
 * - `complete` - the mission is done, said out loud. A tour that never says
 *   "that worked" is a tour nobody finishes.
 * - `offer` - the one ask, at the end. Somebody who has just run a month's
 *   reports, taken a sale and logged a cost on our demo data is at the only
 *   moment they will ever be more sure this works than before they started.
 */
export type TourStage = 'objective' | 'action' | 'explain' | 'complete' | 'offer';

/** Mission chrome, filled in by `flatten` so a mission's beats never repeat it. */
export type MissionRef = {
  id: string;
  /** 1-based, for "Mission 3 of 7". */
  index: number;
  total: number;
  title: { en: string; bn: string };
  /** Which beat of this mission, 1-based, and how many there are. */
  beat: number;
  beats: number;
  /**
   * Whether the way back into the tour has been shown by this point.
   *
   * The card that appears when somebody closes the tour exists to teach exactly
   * that, so from here on it would be repeating a mission they have just
   * walked - and a tour that argues with you on the way out is the reason
   * people never open the next one.
   */
  knowsTheWayBack: boolean;
};

export type TourStep = {
  /** Stable identifier, reported with the progress. Never renamed once live. */
  key: string;
  /**
   * What the step points at, matched on a `data-tour` attribute.
   *
   * An attribute rather than a class or a DOM position: a tour pinned to a class
   * breaks the first time somebody restyles a button, and breaks silently.
   *
   * Absent on a briefing or a debrief, which are about the screen rather than
   * any one thing on it.
   */
  target?: string;
  /** Where the tour lives while this step is showing. */
  href?: string;
  title: { en: string; bn: string };
  body: { en: string; bn: string };
  placement?: 'top' | 'bottom' | 'left' | 'right';
  stage?: TourStage;
  /**
   * Wait for them to click the target themselves rather than offering Next.
   *
   * The whole difference between a tour and a demo video. It is never the only
   * way forward - the card keeps a "show me" escape hatch, because a step that
   * can trap somebody is worse than a step they skipped.
   */
  awaitClick?: boolean;
  /**
   * Ends when the target leaves the screen rather than on a press.
   *
   * For the one thing a card cannot sit on top of: a native modal dialog makes
   * everything outside it inert, so the tour's own buttons stop working while
   * one is open. Rather than pretend otherwise, the beat reads while the dialog
   * is up and moves on when it is closed.
   */
  untilGone?: boolean;
  /**
   * A way out of the tour and into the thing it has been arguing for.
   *
   * Only ever on the last beat, and only on the demo: somebody already on a
   * trial has taken the offer, and putting it in front of them again reads as
   * software that has not noticed who it is talking to.
   */
  cta?: 'trial' | 'subscribe';
  mission?: MissionRef;
};

/**
 * A mission as it is written: a goal, then the beats that reach it.
 *
 * No words. The title of a mission and the title and body of every one of its
 * beats live in walkthrough/{demo,trial}/tour.xml and bn.xml, matched to what
 * is here by `id` and `key`. What stays in this file is what only makes sense
 * next to the product's own source: which `data-tour` a beat rings, which page
 * it lives on, whether it waits for a click.
 */
type TourMission = {
  id: string;
  /**
   * This mission shows where the tour lives and how to reopen it.
   *
   * Set on one mission; every beat from there to the end of the tour is marked
   * as having seen it. Written here rather than worked out by position so that
   * reordering the missions cannot quietly leave the farewell card teaching
   * something nobody has been shown yet.
   */
  teachesReturn?: boolean;
  /** The beats, without their mission chrome or their words - `flatten` fetches both. */
  beats: Omit<TourStep, 'mission' | 'title' | 'body'>[];
};

/**
 * Missions to steps.
 *
 * The engine, the progress table and the resume logic all work on a flat list,
 * and there is no reason for any of them to learn about missions: a mission is
 * how the tour is *written*, and the chrome each beat needs to draw itself is
 * copied onto the beat here, once.
 *
 * Keys are namespaced by mission so two missions may both have an `intro`
 * without colliding in the progress record.
 */
function flatten(kind: TourKind, missions: TourMission[]): TourStep[] {
  const taught = missions.findIndex((mission) => mission.teachesReturn === true);
  const words = copy[kind];

  return missions.flatMap((mission, index) =>
    mission.beats.map((beat, beatIndex) => {
      const key = `${mission.id}.${beat.key}`;
      const said = words.steps[key];
      const title = words.missions[mission.id];

      /*
       * A beat with no copy is a bug in the pairing, not a beat to draw empty.
       *
       * Thrown at module load, which is as early as it can be: the alternative
       * is a card that renders with no words in it, and a blank card looks like
       * a rendering fault rather than like a step somebody forgot to write.
       * The compiler already refuses to write a file with a step missing from
       * one language, so reaching this means the key here and the key in the
       * XML have drifted apart.
       */
      if (said === undefined || title === undefined) {
        throw new Error(
          `The ${kind} tour has no copy for "${key}". Add it to walkthrough/${kind}/tour.xml and bn.xml, `
            + 'then run `npm run walkthrough:copy`.',
        );
      }

      return {
        ...beat,
        key,
        title: said.title,
        body: said.body,
        mission: {
          id: mission.id,
          index: index + 1,
          total: missions.length,
          title,
          beat: beatIndex + 1,
          beats: mission.beats.length,
          knowsTheWayBack: taught >= 0 && index >= taught,
        },
      };
    }),
  );
}

/**
 * Seven things a restaurant owner actually does, in the order they matter.
 *
 * Reading first, then working. The reports answer the question that brought them
 * here - is this making me money - and they answer it before being asked to
 * learn anything. Only then does the tour ask them to ring up a sale, order
 * stock and log a cost, which are the things they would be doing all day.
 *
 * The last mission teaches the way back in. It is deliberately last and
 * deliberately a mission of its own: somebody who closes the tour halfway has to
 * already know how to reopen it, so the card that appears when they close says
 * the same thing this mission demonstrates.
 */
const demoMissions: TourMission[] = [
  {
    id: 'sales',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-reporting',
        stage: 'action',
        awaitClick: true,
        target: 'nav-reporting',
        placement: 'right',
      },
      {
        key: 'range',
        stage: 'explain',
        href: '/admin/reporting/sales?range=last_month',
        target: 'report-range',
        placement: 'bottom',
      },
      {
        key: 'revenue',
        stage: 'explain',
        target: 'sales-total-revenue',
        placement: 'bottom',
      },
      {
        key: 'collected',
        stage: 'explain',
        target: 'sales-collected',
        placement: 'bottom',
      },
      {
        key: 'trend',
        stage: 'explain',
        target: 'sales-trend',
        placement: 'top',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'profit',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-tab',
        stage: 'action',
        awaitClick: true,
        target: 'report-tab-profit',
        placement: 'bottom',
      },
      {
        key: 'income',
        stage: 'explain',
        target: 'profit-total-income',
        placement: 'bottom',
      },
      {
        key: 'expenses',
        stage: 'explain',
        target: 'profit-total-expenses',
        placement: 'bottom',
      },
      {
        key: 'net',
        stage: 'explain',
        target: 'profit-net',
        placement: 'bottom',
      },
      {
        key: 'breakdown',
        stage: 'explain',
        target: 'profit-breakdown',
        placement: 'top',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'stock',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-tab',
        stage: 'action',
        awaitClick: true,
        target: 'report-tab-inventory',
        placement: 'bottom',
      },
      {
        key: 'low',
        stage: 'explain',
        target: 'inventory-low-stock',
        placement: 'bottom',
      },
      {
        key: 'value',
        stage: 'explain',
        target: 'inventory-stock-value',
        placement: 'bottom',
      },
      {
        key: 'table',
        stage: 'explain',
        target: 'inventory-table',
        placement: 'top',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'sale',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-pos',
        stage: 'action',
        awaitClick: true,
        target: 'nav-pos',
        placement: 'right',
      },
      {
        key: 'pick-item',
        stage: 'action',
        awaitClick: true,
        target: 'pos-products',
        placement: 'right',
      },
      {
        key: 'cart',
        stage: 'explain',
        target: 'pos-cart',
        placement: 'left',
      },
      {
        key: 'place',
        stage: 'action',
        awaitClick: true,
        target: 'pos-place-order',
        placement: 'top',
      },
      {
        key: 'open-orders',
        /*
         * Not a click to make, because placing the bill has already made it.
         *
         * The till sends you to the board itself the moment an order is placed,
         * which is the right thing for it to do and leaves nothing to ask for -
         * "open Orders" while somebody is looking at Orders is the tour failing
         * to notice where it is. The link is still pointed at, because coming
         * back here tomorrow is the part that has to be learned.
         */
        stage: 'explain',
        target: 'nav-orders',
        href: '/admin/orders',
        placement: 'right',
      },
      {
        key: 'badges',
        stage: 'explain',
        target: 'orders-board',
        placement: 'bottom',
      },
      {
        key: 'serve',
        stage: 'action',
        awaitClick: true,
        // The ring lands on the first order on the board, which is the oldest
        // rather than the one just placed. So the words say "the ringed one",
        // not "yours" - any order's button satisfies the step, and pointing at
        // one while naming another is how a tour loses somebody.
        target: 'order-advance',
        placement: 'bottom',
      },
      {
        key: 'pay',
        stage: 'action',
        awaitClick: true,
        target: 'order-pay',
        placement: 'bottom',
      },
      {
        key: 'payment',
        stage: 'explain',
        target: 'order-payment-modal',
        placement: 'left',
        untilGone: true,
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'purchase',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-inventory',
        stage: 'action',
        awaitClick: true,
        target: 'nav-inventory',
        placement: 'right',
      },
      {
        key: 'open-po',
        stage: 'action',
        awaitClick: true,
        target: 'inventory-purchase-orders',
        placement: 'top',
      },
      {
        key: 'create',
        stage: 'action',
        awaitClick: true,
        target: 'po-create',
        placement: 'left',
      },
      {
        key: 'supplier',
        stage: 'explain',
        target: 'po-supplier',
        placement: 'bottom',
      },
      {
        key: 'lines',
        stage: 'explain',
        target: 'po-lines',
        placement: 'top',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'books',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-accounting',
        stage: 'action',
        awaitClick: true,
        target: 'nav-accounting',
        placement: 'right',
      },
      {
        key: 'open-expenses',
        stage: 'action',
        awaitClick: true,
        target: 'accounting-expenses',
        placement: 'top',
      },
      {
        key: 'log-expense',
        stage: 'action',
        awaitClick: true,
        target: 'crud-add',
        placement: 'left',
      },
      {
        key: 'expense-form',
        stage: 'explain',
        target: 'crud-form',
        placement: 'bottom',
      },
      {
        key: 'income',
        stage: 'explain',
        href: '/admin/accounting/incomes',
        target: 'crud-add',
        placement: 'left',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'again',
    teachesReturn: true,
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-profile',
        stage: 'action',
        awaitClick: true,
        target: 'nav-profile',
        placement: 'right',
      },
      {
        key: 'card',
        stage: 'explain',
        target: 'walkthrough-card',
        placement: 'bottom',
      },
      {
        key: 'buttons',
        stage: 'explain',
        target: 'walkthrough-actions',
        placement: 'bottom',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },

  /*
   * The ask, and the only one in the tour.
   *
   * A mission of its own rather than a line tacked onto the last card, because
   * it is a different kind of thing: everything above was about the demo
   * restaurant, and this is about theirs. Kept to the very end for the same
   * reason a waiter does not ask about dessert on the way in - the answer is
   * better after the meal.
   *
   * What it must say, and the wording is careful about all three: it costs
   * nothing, it begins immediately, and what they get is this same product with
   * their own food in it. "Free" is the objection; "right now" is the delay;
   * "your own menu" is the doubt about whether any of it applies to them.
   */
  {
    id: 'yours',
    beats: [
      {
        key: 'trial',
        stage: 'offer',
        cta: 'trial',
      },
    ],
  },
];

const demoTour: TourStep[] = flatten('demo', demoMissions);

/**
 * Setting up a real restaurant, in the order the parts depend on each other.
 *
 * The demo tour teaches somebody deciding; this one teaches somebody who has
 * already decided and now has an empty restaurant in front of them. So it is
 * missions too - the same objective, hands-on, debrief shape - but every beat
 * asks them to put in something of their own rather than read something we
 * prepared, because the thing being learned here is how to do it again next
 * week without a card on the screen.
 *
 * The order is not arbitrary. A dish before the ingredients it is made of, both
 * before the recipe that joins them, all of them before the delivery that fills
 * the shelf, and the shelf before the sale that empties it - each mission needs
 * what the one before it made, so nothing can be done out of turn and nothing
 * has to be explained twice.
 *
 * Four items, deliberately of three different kinds: one sold exactly as it was
 * bought, two that only ever leave inside a dish, and one that leaves without
 * being sold at all. Between them they cover every way stock can move, and the
 * last three missions are simply those three ways happening.
 */
const trialMissions: TourMission[] = [
  {
    id: 'dish',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-catalog',
        stage: 'action',
        awaitClick: true,
        target: 'nav-catalog',
        placement: 'right',
      },
      {
        key: 'open-products',
        stage: 'action',
        awaitClick: true,
        target: 'catalog-products',
        placement: 'top',
      },
      {
        key: 'add',
        stage: 'action',
        awaitClick: true,
        target: 'product-add',
        placement: 'left',
      },
      {
        key: 'form',
        stage: 'explain',
        target: 'product-form',
        placement: 'bottom',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'shelf',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-inventory',
        stage: 'action',
        awaitClick: true,
        target: 'nav-inventory',
        placement: 'right',
      },
      {
        key: 'open-items',
        stage: 'action',
        awaitClick: true,
        target: 'inventory-items',
        placement: 'top',
      },
      {
        key: 'add',
        stage: 'action',
        awaitClick: true,
        target: 'item-add',
        placement: 'left',
      },
      {
        key: 'sellable',
        stage: 'explain',
        target: 'item-sellable',
        placement: 'top',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'ingredients',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'add-first',
        stage: 'action',
        awaitClick: true,
        href: '/admin/inventory/items',
        target: 'item-add',
        placement: 'left',
      },
      {
        key: 'not-sellable',
        stage: 'explain',
        target: 'item-sellable',
        placement: 'top',
      },
      {
        key: 'add-second',
        stage: 'action',
        awaitClick: true,
        target: 'item-add',
        placement: 'left',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'recipe',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-inventory',
        stage: 'action',
        awaitClick: true,
        target: 'nav-inventory',
        placement: 'right',
      },
      {
        key: 'open-recipes',
        stage: 'action',
        awaitClick: true,
        target: 'inventory-recipes',
        placement: 'top',
      },
      {
        key: 'pick-product',
        stage: 'explain',
        target: 'recipe-product',
        placement: 'bottom',
      },
      {
        key: 'rows',
        stage: 'explain',
        target: 'recipe-rows',
        placement: 'top',
      },
      {
        key: 'save',
        stage: 'action',
        awaitClick: true,
        target: 'recipe-save',
        placement: 'top',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'bulk',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'add',
        stage: 'action',
        awaitClick: true,
        href: '/admin/inventory/items',
        target: 'item-add',
        placement: 'left',
      },
      {
        key: 'form',
        stage: 'explain',
        target: 'item-form',
        placement: 'bottom',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'buy',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-inventory',
        stage: 'action',
        awaitClick: true,
        target: 'nav-inventory',
        placement: 'right',
      },
      {
        key: 'open-po',
        stage: 'action',
        awaitClick: true,
        target: 'inventory-purchase-orders',
        placement: 'top',
      },
      {
        key: 'create',
        stage: 'action',
        awaitClick: true,
        target: 'po-create',
        placement: 'left',
      },
      {
        key: 'supplier',
        stage: 'explain',
        target: 'po-supplier',
        placement: 'bottom',
      },
      {
        key: 'lines',
        stage: 'explain',
        target: 'po-lines',
        placement: 'top',
      },
      {
        key: 'status',
        stage: 'explain',
        target: 'po-status',
        placement: 'top',
      },
      {
        key: 'save',
        stage: 'action',
        awaitClick: true,
        target: 'po-save',
        placement: 'top',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'health',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-reporting',
        stage: 'action',
        awaitClick: true,
        target: 'nav-reporting',
        placement: 'right',
      },
      {
        key: 'open-tab',
        stage: 'action',
        awaitClick: true,
        target: 'report-tab-inventory',
        placement: 'bottom',
      },
      {
        key: 'low',
        stage: 'explain',
        target: 'inventory-low-stock',
        placement: 'bottom',
      },
      {
        key: 'value',
        stage: 'explain',
        target: 'inventory-stock-value',
        placement: 'bottom',
      },
      {
        key: 'table',
        stage: 'explain',
        target: 'inventory-table',
        placement: 'top',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'sell',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-pos',
        stage: 'action',
        awaitClick: true,
        target: 'nav-pos',
        placement: 'right',
      },
      {
        key: 'pick',
        stage: 'action',
        awaitClick: true,
        target: 'pos-products',
        placement: 'right',
      },
      {
        key: 'cart',
        stage: 'explain',
        target: 'pos-cart',
        placement: 'left',
      },
      {
        key: 'place',
        stage: 'action',
        awaitClick: true,
        target: 'pos-place-order',
        placement: 'top',
      },
      {
        key: 'deducted',
        stage: 'explain',
        href: '/admin/reporting/inventory',
        target: 'inventory-table',
        placement: 'top',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'used',
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-inventory',
        stage: 'action',
        awaitClick: true,
        target: 'nav-inventory',
        placement: 'right',
      },
      {
        key: 'open-consumption',
        stage: 'action',
        awaitClick: true,
        target: 'inventory-consumption',
        placement: 'top',
      },
      {
        key: 'add',
        stage: 'action',
        awaitClick: true,
        target: 'consumption-add',
        placement: 'left',
      },
      {
        key: 'form',
        stage: 'explain',
        target: 'consumption-form',
        placement: 'bottom',
      },
      {
        key: 'history',
        stage: 'explain',
        target: 'consumption-history',
        placement: 'top',
      },
      {
        key: 'stock',
        stage: 'explain',
        href: '/admin/reporting/inventory',
        target: 'inventory-table',
        placement: 'top',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },
  {
    id: 'again',
    teachesReturn: true,
    beats: [
      {
        key: 'intro',
        stage: 'objective',
      },
      {
        key: 'open-profile',
        stage: 'action',
        awaitClick: true,
        target: 'nav-profile',
        placement: 'right',
      },
      {
        key: 'card',
        stage: 'explain',
        target: 'walkthrough-card',
        placement: 'bottom',
      },
      {
        key: 'buttons',
        stage: 'explain',
        target: 'walkthrough-actions',
        placement: 'bottom',
      },
      {
        key: 'done',
        stage: 'complete',
      },
    ],
  },

  /*
   * The ask, and the only one in this tour.
   *
   * Different from the demo's in what it is asking for and in who is being
   * asked. The demo ends with somebody who has used a made-up restaurant and is
   * invited to start their own; this ends with somebody whose own restaurant is
   * now set up, whose trial has a date on it, and whose only remaining question
   * is what it costs to keep.
   *
   * So it answers that question and nothing else: the price, that setting up
   * costs nothing on top of it, one button that opens the checkout, and a way
   * to talk to a person instead - which for a restaurant owner in Bangladesh is
   * WhatsApp, not a form.
   */
  {
    id: 'keep',
    beats: [
      {
        key: 'now',
        stage: 'offer',
        cta: 'subscribe',
      },
    ],
  },
];

const trialTour: TourStep[] = flatten('trial', trialMissions);

export const tours: Record<TourKind, TourStep[]> = {
  demo: demoTour,
  trial: trialTour,
};

/** How far through a tour a step is, as the percentage reported back. */
export function percentAt(kind: TourKind, index: number): number {
  const total = tours[kind].length;

  if (total === 0) return 0;

  // Completing the last step is 100; being on the first is not 0, because
  // starting a tour is itself progress worth seeing in a report.
  return Math.round(((index + 1) / total) * 100);
}

/**
 * Which step a reported key belongs to, or -1 when the tour no longer has one.
 *
 * The -1 matters. Step keys are never renamed once live, but they are removed,
 * and somebody whose last step no longer exists should start the tour rather than
 * land on whatever happens to sit at that position now.
 */
export function indexOfKey(kind: TourKind, key: string | null): number {
  if (!key) return -1;

  return tours[kind].findIndex((step) => step.key === key);
}

/**
 * How a position reads to somebody who is not looking at the tour.
 *
 * Used by the card on the profile screen. A mission and its title, because
 * "Mission 4 of 7 - take a sale" is something a person recognises as the place
 * they stopped; "step 22 of 47" is not.
 */
export function positionAt(kind: TourKind, index: number): {
  step: TourStep | undefined;
  mission: MissionRef | undefined;
} {
  const step = tours[kind][index];

  return { step, mission: step?.mission };
}

/**
 * Whether this step has already been shown how to reopen the tour.
 *
 * Asked on the way out: the farewell card says where the tour lives, and there
 * is no point saying it to somebody who has just been walked through it.
 */
export function knowsTheWayBack(step: TourStep | undefined): boolean {
  return step?.mission?.knowsTheWayBack === true;
}
