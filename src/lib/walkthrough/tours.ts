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
 * - **Trial** is a flat checklist. They have already decided; what they need is a
 *   menu, a table and a way in for their staff, and a mission briefing between
 *   each one would be in the way.
 *
 * One engine draws both. A step with no mission attached simply renders without
 * the mission chrome, which is exactly what the trial tour wants.
 */

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
  cta?: 'trial';
  mission?: MissionRef;
};

/** A mission as it is written: a goal, then the beats that reach it. */
type TourMission = {
  id: string;
  title: { en: string; bn: string };
  /**
   * This mission shows where the tour lives and how to reopen it.
   *
   * Set on one mission; every beat from there to the end of the tour is marked
   * as having seen it. Written here rather than worked out by position so that
   * reordering the missions cannot quietly leave the farewell card teaching
   * something nobody has been shown yet.
   */
  teachesReturn?: boolean;
  /** The beats, without their mission chrome - `flatten` attaches that. */
  beats: Omit<TourStep, 'mission'>[];
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
function flatten(missions: TourMission[]): TourStep[] {
  const taught = missions.findIndex((mission) => mission.teachesReturn === true);

  return missions.flatMap((mission, index) =>
    mission.beats.map((beat, beatIndex) => ({
      ...beat,
      key: `${mission.id}.${beat.key}`,
      mission: {
        id: mission.id,
        index: index + 1,
        total: missions.length,
        title: mission.title,
        beat: beatIndex + 1,
        beats: mission.beats.length,
        knowsTheWayBack: taught >= 0 && index >= taught,
      },
    })),
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
    title: { en: "Last month's sales", bn: 'গত মাসের বিক্রি' },
    beats: [
      {
        key: 'intro',
        stage: 'objective',
        title: { en: 'How much did you sell last month?', bn: 'গত মাসে আপনার বিক্রি কত ছিল?' },
        body: {
          en: 'Most owners answer this by adding up a drawer of receipts. Let us do it in three clicks instead - and then read what the number is actually made of.',
          bn: 'বেশিরভাগ মালিক এই হিসাব রসিদের স্তূপ থেকে বের করেন। চলুন তিনটি ক্লিকেই করে ফেলি — আর দেখি সংখ্যাটা আসলে কী দিয়ে তৈরি।',
        },
      },
      {
        key: 'open-reporting',
        stage: 'action',
        awaitClick: true,
        target: 'nav-reporting',
        placement: 'right',
        title: { en: 'Open Reporting', bn: 'রিপোর্টিং খুলুন' },
        body: {
          en: 'On the menu down the left. Every report in the product lives behind this one item.',
          bn: 'বাঁ পাশের মেনুতে। পণ্যের সব রিপোর্ট এই একটি জায়গার পেছনেই আছে।',
        },
      },
      {
        key: 'range',
        stage: 'explain',
        href: '/admin/reporting/sales?range=last_month',
        target: 'report-range',
        placement: 'bottom',
        title: { en: 'The period, set once', bn: 'সময়সীমা, একবারই ঠিক করুন' },
        body: {
          en: 'We have set it to Last Month for you. Every tab on this page obeys it, so you pick the period once and read all thirteen reports against it.',
          bn: 'আপনার জন্য এটি "গত মাস" করা হয়েছে। এই পাতার প্রতিটি ট্যাব এটাই মানে, তাই একবার সময় বেছে নিয়ে তেরোটি রিপোর্টই পড়তে পারবেন।',
        },
      },
      {
        key: 'revenue',
        stage: 'explain',
        target: 'sales-total-revenue',
        placement: 'bottom',
        title: { en: 'That is the month', bn: 'এটাই পুরো মাস' },
        body: {
          en: 'Every order from every till, delivery app and counter, added up. Nothing was typed in to produce it.',
          bn: 'প্রতিটি কাউন্টার, ডেলিভারি অ্যাপ আর টিলের সব অর্ডার একসাথে যোগ করা। এটি বের করতে কিছুই টাইপ করতে হয়নি।',
        },
      },
      {
        key: 'collected',
        stage: 'explain',
        target: 'sales-collected',
        placement: 'bottom',
        title: { en: 'Sold is not the same as collected', bn: 'বিক্রি আর আদায় এক নয়' },
        body: {
          en: 'This is the money that actually arrived. The difference between the two tiles is what is still owed to you - the figure most restaurants never see.',
          bn: 'এটি সেই টাকা যা সত্যিই হাতে এসেছে। দুই ঘরের পার্থক্যই আপনার বকেয়া — যা বেশিরভাগ রেস্টুরেন্ট কখনো দেখতেই পায় না।',
        },
      },
      {
        key: 'trend',
        stage: 'explain',
        target: 'sales-trend',
        placement: 'top',
        title: { en: 'And which days did the work', bn: 'আর কোন দিনগুলো কাজ করেছে' },
        body: {
          en: 'The same month, day by day. This is the chart that tells you which nights to staff properly and which to close early.',
          bn: 'একই মাস, দিন ধরে ধরে। কোন রাতে বেশি লোক রাখবেন আর কোন রাতে তাড়াতাড়ি বন্ধ করবেন — এই চার্টই বলে দেয়।',
        },
      },
      {
        key: 'done',
        stage: 'complete',
        title: { en: 'You just read a month of trading', bn: 'আপনি এক মাসের ব্যবসা পড়ে ফেললেন' },
        body: {
          en: 'Sold, collected, owed, and the shape of the month. Next: whether any of it was profit.',
          bn: 'বিক্রি, আদায়, বকেয়া আর মাসের গতিপ্রকৃতি। এরপর: এর মধ্যে লাভ কতটুকু।',
        },
      },
    ],
  },
  {
    id: 'profit',
    title: { en: 'Profit or loss', bn: 'লাভ না লোকসান' },
    beats: [
      {
        key: 'intro',
        stage: 'objective',
        title: { en: 'Revenue is not profit', bn: 'বিক্রি মানেই লাভ নয়' },
        body: {
          en: 'A busy month can lose money, and it usually takes an accountant three weeks to say so. Here it is one tab away.',
          bn: 'ব্যস্ত মাসেও লোকসান হতে পারে, আর হিসাবরক্ষক তা বলতে তিন সপ্তাহ নেন। এখানে সেটা এক ট্যাব দূরে।',
        },
      },
      {
        key: 'open-tab',
        stage: 'action',
        awaitClick: true,
        target: 'report-tab-profit',
        placement: 'bottom',
        title: { en: 'Click Profit', bn: 'প্রফিট-এ ক্লিক করুন' },
        body: {
          en: 'In the row of tabs above. It keeps the period you already chose, so this is still last month.',
          bn: 'উপরের ট্যাবগুলোর সারিতে। আপনার বেছে নেওয়া সময়সীমা বহাল থাকে, তাই এটিও গত মাসেরই হিসাব।',
        },
      },
      {
        key: 'income',
        stage: 'explain',
        target: 'profit-total-income',
        placement: 'bottom',
        title: { en: 'Everything that came in', bn: 'যা কিছু এসেছে' },
        body: {
          en: 'Paid orders, plus anything you logged as income by hand - a catering job, a room hire. Both count, so the total is the real one.',
          bn: 'পরিশোধিত অর্ডার, সঙ্গে হাতে লেখা যেকোনো আয় — ক্যাটারিং, হল ভাড়া। দুটোই ধরা হয়, তাই মোটটাই আসল।',
        },
      },
      {
        key: 'expenses',
        stage: 'explain',
        target: 'profit-total-expenses',
        placement: 'bottom',
        title: { en: 'Everything that went out', bn: 'যা কিছু বেরিয়ে গেছে' },
        body: {
          en: 'Your purchase orders and your logged running costs together. Mission 5 and 6 are where these two numbers come from.',
          bn: 'আপনার ক্রয় আদেশ আর লেখা পরিচালন খরচ একসাথে। মিশন ৫ ও ৬-এই এই দুটি সংখ্যা তৈরি হয়।',
        },
      },
      {
        key: 'net',
        stage: 'explain',
        target: 'profit-net',
        placement: 'bottom',
        title: { en: 'What you actually kept', bn: 'শেষে যা থাকল' },
        body: {
          en: 'One figure, and the only one that decides whether the month was worth opening the doors for.',
          bn: 'একটাই সংখ্যা — মাসটা দরজা খোলার মতো ছিল কি না, সেটা এটাই ঠিক করে।',
        },
      },
      {
        key: 'breakdown',
        stage: 'explain',
        target: 'profit-breakdown',
        placement: 'top',
        title: { en: 'And where it went', bn: 'আর কোথায় গেল' },
        body: {
          en: 'Line by line, so a bad month names its own cause instead of leaving you guessing.',
          bn: 'লাইন ধরে ধরে, যাতে খারাপ মাসের কারণ নিজেই বলে দেয় — অনুমান করতে না হয়।',
        },
      },
      {
        key: 'done',
        stage: 'complete',
        title: { en: 'You now know if last month paid', bn: 'গত মাসে লাভ হয়েছে কি না, এখন জানেন' },
        body: {
          en: 'In and out and what is left. Next: whether your storeroom agrees with your books.',
          bn: 'আয়, ব্যয় আর অবশিষ্ট। এরপর: আপনার গুদাম হিসাবের সঙ্গে মেলে কি না।',
        },
      },
    ],
  },
  {
    id: 'stock',
    title: { en: 'Inventory health', bn: 'স্টকের অবস্থা' },
    beats: [
      {
        key: 'intro',
        stage: 'objective',
        title: { en: 'What is in the storeroom right now?', bn: 'এই মুহূর্তে গুদামে কী আছে?' },
        body: {
          en: 'Running out mid-service costs you the table and the reputation. This screen tells you the day before it happens.',
          bn: 'সার্ভিসের মাঝখানে মাল ফুরালে টেবিলও যায়, সুনামও যায়। এই স্ক্রিন ঘটার আগের দিনই জানিয়ে দেয়।',
        },
      },
      {
        key: 'open-tab',
        stage: 'action',
        awaitClick: true,
        target: 'report-tab-inventory',
        placement: 'bottom',
        title: { en: 'Click Inventory Health', bn: 'ইনভেন্টরি হেলথ-এ ক্লিক করুন' },
        body: {
          en: 'Same row of tabs. This one ignores the date filter on purpose - stock is what you have now, not what you had.',
          bn: 'একই ট্যাবের সারিতে। এটি ইচ্ছে করেই তারিখ ফিল্টার মানে না — স্টক মানে এখন কী আছে, আগে কী ছিল তা নয়।',
        },
      },
      {
        key: 'low',
        stage: 'explain',
        target: 'inventory-low-stock',
        placement: 'bottom',
        title: { en: 'The only number that needs you today', bn: 'আজ যে সংখ্যাটির দিকে তাকাতেই হবে' },
        body: {
          en: 'Items at or under the reorder level you set. If this is not zero, somebody should be on the phone to a supplier.',
          bn: 'আপনার ঠিক করা রি-অর্ডার সীমায় বা তার নিচে থাকা পণ্য। শূন্য না হলে কারও সরবরাহকারীকে ফোন করা উচিত।',
        },
      },
      {
        key: 'value',
        stage: 'explain',
        target: 'inventory-stock-value',
        placement: 'bottom',
        title: { en: 'Money sitting on the shelves', bn: 'তাকের উপর পড়ে থাকা টাকা' },
        body: {
          en: 'Stock is cash you have already spent. Knowing the figure is how you stop over-ordering the things that keep and under-ordering the things that sell.',
          bn: 'স্টক মানে আগেই খরচ করা নগদ। সংখ্যাটি জানলেই যা টেকে তা বেশি কেনা আর যা বিক্রি হয় তা কম কেনা বন্ধ হয়।',
        },
      },
      {
        key: 'table',
        stage: 'explain',
        target: 'inventory-table',
        placement: 'top',
        title: { en: 'Low stock first, always', bn: 'কম স্টক সবসময় আগে' },
        body: {
          en: 'The list sorts itself so the trouble is at the top. You can print it as an A4 sheet or a till roll and hand it to whoever does the buying.',
          bn: 'তালিকা নিজেই সাজায় যাতে সমস্যা উপরে থাকে। A4 বা টিল রোলে ছেপে যিনি কেনাকাটা করেন তাঁকে দিতে পারেন।',
        },
      },
      {
        key: 'done',
        stage: 'complete',
        title: { en: 'The storeroom, without walking to it', bn: 'গুদামে না গিয়েই গুদামের খবর' },
        body: {
          en: 'That is the reading done. Now the working - and it starts at the till.',
          bn: 'পড়ার পর্ব শেষ। এবার কাজের পর্ব — শুরু কাউন্টার থেকে।',
        },
      },
    ],
  },
  {
    id: 'sale',
    title: { en: 'Take a sale, end to end', bn: 'শুরু থেকে শেষ পর্যন্ত একটি বিক্রি' },
    beats: [
      {
        key: 'intro',
        stage: 'objective',
        title: { en: 'Ring up an order and get paid for it', bn: 'একটি অর্ডার নিন, আর তার টাকা বুঝে নিন' },
        body: {
          en: 'The whole loop: take the order at the till, watch it appear on the orders board, mark it served, and collect the money. Everything you have just been reading is made of this.',
          bn: 'পুরো চক্রটি: কাউন্টারে অর্ডার নেওয়া, অর্ডার বোর্ডে সেটি দেখা, সার্ভ করা হয়েছে বলে চিহ্নিত করা, আর টাকা আদায়। এতক্ষণ যা পড়লেন, সবই এখান থেকেই তৈরি।',
        },
      },
      {
        key: 'open-pos',
        stage: 'action',
        awaitClick: true,
        target: 'nav-pos',
        placement: 'right',
        title: { en: 'Open the POS', bn: 'পিওএস খুলুন' },
        body: {
          en: 'This is the screen your counter staff live on all day.',
          bn: 'সারাদিন আপনার কাউন্টারের কর্মীরা এই স্ক্রিনেই থাকেন।',
        },
      },
      {
        key: 'pick-item',
        stage: 'action',
        awaitClick: true,
        target: 'pos-products',
        placement: 'right',
        title: { en: 'Tap any dish', bn: 'যেকোনো খাবারে চাপ দিন' },
        body: {
          en: 'One tap adds it. Tap the same dish again for a second portion - no quantity box, because a counter at seven in the evening has no time for one.',
          bn: 'এক চাপেই যোগ হয়। আরেকটি লাগলে আবার চাপুন — আলাদা করে সংখ্যা লেখার ঘর নেই, কারণ সন্ধ্যা সাতটার কাউন্টারে সে সময় থাকে না।',
        },
      },
      {
        key: 'cart',
        stage: 'explain',
        target: 'pos-cart',
        placement: 'left',
        title: { en: 'The bill builds itself', bn: 'বিল নিজেই তৈরি হচ্ছে' },
        body: {
          en: 'Quantities, a note for the kitchen, a discount on one line or on the lot - and the tax and the total recalculated as you go.',
          bn: 'পরিমাণ, রান্নাঘরের জন্য নোট, এক লাইনে বা পুরো বিলে ছাড় — সঙ্গে সঙ্গে কর আর মোট হিসাব বসে যায়।',
        },
      },
      {
        key: 'place',
        stage: 'action',
        awaitClick: true,
        target: 'pos-place-order',
        placement: 'top',
        title: { en: 'Place the order', bn: 'অর্ডার দিন' },
        body: {
          en: 'It goes to the kitchen screen and the orders board in the same instant. This is a real order in the demo restaurant - go ahead.',
          bn: 'একই মুহূর্তে এটি রান্নাঘরের স্ক্রিন আর অর্ডার বোর্ডে চলে যায়। ডেমো রেস্টুরেন্টে এটি সত্যিকারের অর্ডার — নির্দ্বিধায় দিন।',
        },
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
        title: { en: 'And here it is, on the board', bn: 'আর এই যে, বোর্ডে চলে এসেছে' },
        body: {
          en: 'The till brought you straight here. Dine-in, takeaway and delivery all arrive in this one list, in the order they came in - and Orders, on the left, is how you get back to it.',
          bn: 'বিল দেওয়ার সঙ্গে সঙ্গেই এখানে চলে এসেছেন। ডাইন-ইন, টেকঅ্যাওয়ে আর ডেলিভারি — সব এই এক তালিকায়, আসার ক্রম অনুযায়ী। পরে ফিরে আসতে বাঁ পাশের "Orders"।',
        },
      },
      {
        key: 'badges',
        stage: 'explain',
        target: 'orders-board',
        placement: 'bottom',
        title: { en: 'Two badges, two questions', bn: 'দুটি ব্যাজ, দুটি প্রশ্ন' },
        body: {
          en: 'Every order carries where the food is up to and whether the money has arrived. They move separately, because in a real restaurant they do.',
          bn: 'প্রতিটি অর্ডার বলে খাবার কোন পর্যায়ে আর টাকা এসেছে কি না। দুটো আলাদাভাবে চলে, কারণ বাস্তব রেস্টুরেন্টেও তাই হয়।',
        },
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
        title: { en: 'Move the food along', bn: 'খাবারটি এগিয়ে দিন' },
        body: {
          en: 'Press the green button on the ringed order to push it to its next stage - cooking, ready, served. The kitchen screen follows along.',
          bn: 'চিহ্নিত অর্ডারের সবুজ বোতামে চাপ দিয়ে পরের ধাপে নিন — রান্না হচ্ছে, প্রস্তুত, সার্ভ করা হয়েছে। রান্নাঘরের স্ক্রিনও সঙ্গে সঙ্গে বদলায়।',
        },
      },
      {
        key: 'pay',
        stage: 'action',
        awaitClick: true,
        target: 'order-pay',
        placement: 'bottom',
        title: { en: 'Collect the payment', bn: 'টাকা আদায় করুন' },
        body: {
          en: 'Press Pay on that same order.',
          bn: 'ওই অর্ডারেই "Pay" বোতামে চাপ দিন।',
        },
      },
      {
        key: 'payment',
        stage: 'explain',
        target: 'order-payment-modal',
        placement: 'left',
        untilGone: true,
        title: { en: 'How the money arrived', bn: 'টাকা কীভাবে এল' },
        body: {
          en: 'Cash, card or bKash, with room for a transaction id. Or send it out on account - the order stays open as a due, and it is the due that shows up as the gap in your sales report. Take the payment or close the box; either way the tour carries on.',
          bn: 'নগদ, কার্ড বা বিকাশ, সঙ্গে ট্রানজেকশন আইডি লেখার জায়গা। কিংবা বাকিতে ছাড়ুন — অর্ডারটি বকেয়া হিসেবে খোলা থাকে, আর সেই বকেয়াই বিক্রির রিপোর্টে ফাঁক হয়ে দেখা দেয়। টাকা নিন বা বাক্সটি বন্ধ করুন — দুভাবেই গাইড এগিয়ে যাবে।',
        },
      },
      {
        key: 'done',
        stage: 'complete',
        title: { en: 'One sale, all the way through', bn: 'একটি বিক্রি, শুরু থেকে শেষ' },
        body: {
          en: 'Taken, cooked, served, paid - and it has already changed the sales and profit figures you read at the start.',
          bn: 'নেওয়া, রান্না, সার্ভ, পরিশোধ — আর শুরুতে যে বিক্রি ও লাভের হিসাব দেখেছিলেন, তা এর মধ্যেই বদলে গেছে।',
        },
      },
    ],
  },
  {
    id: 'purchase',
    title: { en: 'Order stock in', bn: 'মাল কিনে আনা' },
    beats: [
      {
        key: 'intro',
        stage: 'objective',
        title: { en: 'Buying is half of the profit line', bn: 'লাভের অর্ধেকটাই কেনাকাটা' },
        body: {
          en: 'A purchase order does three jobs at once: it tells the supplier what you want, it puts the stock on the shelf when it lands, and it puts the cost in the accounts. Let us raise one.',
          bn: 'একটি ক্রয় আদেশ একসাথে তিনটি কাজ করে: সরবরাহকারীকে চাহিদা জানায়, মাল এলে স্টকে তোলে, আর খরচটি হিসাবে বসায়। চলুন একটি তৈরি করি।',
        },
      },
      {
        key: 'open-inventory',
        stage: 'action',
        awaitClick: true,
        target: 'nav-inventory',
        placement: 'right',
        title: { en: 'Open Inventory', bn: 'ইনভেন্টরি খুলুন' },
        body: {
          en: 'Items, suppliers, recipes, waste and purchase orders all sit behind this one.',
          bn: 'পণ্য, সরবরাহকারী, রেসিপি, অপচয় আর ক্রয় আদেশ — সবই এর পেছনে।',
        },
      },
      {
        key: 'open-po',
        stage: 'action',
        awaitClick: true,
        target: 'inventory-purchase-orders',
        placement: 'top',
        title: { en: 'Go to Purchase Orders', bn: 'ক্রয় আদেশে যান' },
        body: {
          en: 'The card for purchase orders, on this page.',
          bn: 'এই পাতায় ক্রয় আদেশের কার্ডটি।',
        },
      },
      {
        key: 'create',
        stage: 'action',
        awaitClick: true,
        target: 'po-create',
        placement: 'left',
        title: { en: 'Start a new order', bn: 'নতুন একটি আদেশ শুরু করুন' },
        body: {
          en: 'Create PO, at the top right.',
          bn: 'উপরে ডানদিকে "Create PO"।',
        },
      },
      {
        key: 'supplier',
        stage: 'explain',
        target: 'po-supplier',
        placement: 'bottom',
        title: { en: 'Who you are buying from', bn: 'কার কাছ থেকে কিনছেন' },
        body: {
          en: 'Suppliers are searchable by name or contact. Every order you place against one builds a history you can hold them to.',
          bn: 'সরবরাহকারী নাম বা যোগাযোগ দিয়ে খুঁজে নেওয়া যায়। প্রতিটি আদেশ একটি ইতিহাস গড়ে, যা দিয়ে তাঁদের জবাবদিহি করাতে পারবেন।',
        },
      },
      {
        key: 'lines',
        stage: 'explain',
        target: 'po-lines',
        placement: 'top',
        title: { en: 'What you are buying', bn: 'কী কিনছেন' },
        body: {
          en: 'Pick an item, a quantity and a unit price, and add as many lines as you need. The order total adds itself up as you type - and when the delivery is received, every one of these lines goes onto the shelf.',
          bn: 'পণ্য, পরিমাণ আর একক দাম দিন, প্রয়োজনমতো লাইন যোগ করুন। টাইপ করার সঙ্গে সঙ্গেই মোট হিসাব বসে যায় — আর মাল বুঝে নেওয়ার সময় প্রতিটি লাইন স্টকে উঠে যায়।',
        },
      },
      {
        key: 'done',
        stage: 'complete',
        title: { en: 'That is your buying under control', bn: 'কেনাকাটা এখন আপনার নিয়ন্ত্রণে' },
        body: {
          en: 'Ordered, received, stocked and costed, without anybody writing it twice. Next: the costs that do not arrive on a lorry.',
          bn: 'অর্ডার, বুঝে নেওয়া, স্টকে তোলা আর খরচ বসানো — কাউকে দুবার লিখতে হয়নি। এরপর: যে খরচগুলো ট্রাকে করে আসে না।',
        },
      },
    ],
  },
  {
    id: 'books',
    title: { en: 'Money in, money out', bn: 'আয় ও ব্যয়' },
    beats: [
      {
        key: 'intro',
        stage: 'objective',
        title: { en: 'Rent, gas, wages - and the odd job', bn: 'ভাড়া, গ্যাস, বেতন — আর টুকিটাকি আয়' },
        body: {
          en: 'Not every taka moves through the till. Log the rest here and the profit figure you read in mission two becomes the truth rather than an estimate.',
          bn: 'সব টাকা কাউন্টার দিয়ে যায় না। বাকিটা এখানে লিখলে দ্বিতীয় মিশনে দেখা লাভের হিসাব আন্দাজ না থেকে সত্যি হয়ে ওঠে।',
        },
      },
      {
        key: 'open-accounting',
        stage: 'action',
        awaitClick: true,
        target: 'nav-accounting',
        placement: 'right',
        title: { en: 'Open Accounting', bn: 'অ্যাকাউন্টিং খুলুন' },
        body: {
          en: 'Ledgers, income, expenses, tax rules and headers.',
          bn: 'লেজার, আয়, ব্যয়, করের নিয়ম আর হেডার।',
        },
      },
      {
        key: 'open-expenses',
        stage: 'action',
        awaitClick: true,
        target: 'accounting-expenses',
        placement: 'top',
        title: { en: 'Go to Expenses', bn: 'ব্যয়ে যান' },
        body: {
          en: 'The expenses card on this page.',
          bn: 'এই পাতার ব্যয়ের কার্ডটি।',
        },
      },
      {
        key: 'log-expense',
        stage: 'action',
        awaitClick: true,
        target: 'crud-add',
        placement: 'left',
        title: { en: 'Log an expense', bn: 'একটি খরচ লিখুন' },
        body: {
          en: 'Log Expense, at the top right. Try it with anything - a gas bill, a repair.',
          bn: 'উপরে ডানদিকে "Log Expense"। যেকোনো কিছু দিয়ে চেষ্টা করুন — গ্যাস বিল, মেরামত।',
        },
      },
      {
        key: 'expense-form',
        stage: 'explain',
        target: 'crud-form',
        placement: 'bottom',
        title: { en: 'A header, a category, an amount', bn: 'হেডার, ধরন, পরিমাণ' },
        body: {
          en: 'The header is what your accountant will group it under; the category is what you call it. Save it and it lands in the profit report immediately.',
          bn: 'হেডার দিয়ে হিসাবরক্ষক শ্রেণিভুক্ত করেন; ধরন আপনার নিজের নাম। সংরক্ষণ করলেই সঙ্গে সঙ্গে লাভের রিপোর্টে চলে যায়।',
        },
      },
      {
        key: 'income',
        stage: 'explain',
        href: '/admin/accounting/incomes',
        target: 'crud-add',
        placement: 'left',
        title: { en: 'Income works identically', bn: 'আয়ও ঠিক একইভাবে চলে' },
        body: {
          en: 'This is the Income screen, and it is the same form. Anything you earn away from the till - a catering job, a hall booking - belongs here so it counts toward the month.',
          bn: 'এটি আয়ের স্ক্রিন, ফর্মও একই। কাউন্টারের বাইরের যেকোনো আয় — ক্যাটারিং, হল ভাড়া — এখানেই লিখুন, তাহলেই মাসের হিসাবে ধরা পড়বে।',
        },
      },
      {
        key: 'done',
        stage: 'complete',
        title: { en: 'Your books now agree with your restaurant', bn: 'আপনার হিসাব এখন রেস্টুরেন্টের সঙ্গে মেলে' },
        body: {
          en: 'Sales from the till, purchases from suppliers, and everything else by hand. One last thing, and it is the one worth remembering.',
          bn: 'কাউন্টারের বিক্রি, সরবরাহকারীর কেনাকাটা, আর বাকিটা হাতে লেখা। শেষ একটি বিষয় বাকি — আর সেটাই মনে রাখার মতো।',
        },
      },
    ],
  },
  {
    id: 'again',
    title: { en: 'Coming back to this tour', bn: 'এই গাইডে ফিরে আসা' },
    teachesReturn: true,
    beats: [
      {
        key: 'intro',
        stage: 'objective',
        title: { en: 'You can always start this again', bn: 'যেকোনো সময় আবার শুরু করতে পারবেন' },
        body: {
          en: 'Close it whenever you like and go and press things yourself - the tour keeps your place. Here is where it lives so you can find it again.',
          bn: 'যখন খুশি বন্ধ করে নিজে ঘুরে দেখুন — গাইড আপনার জায়গা মনে রাখবে। কোথায় পাবেন, সেটাই দেখাচ্ছি।',
        },
      },
      {
        key: 'open-profile',
        stage: 'action',
        awaitClick: true,
        target: 'nav-profile',
        placement: 'right',
        title: { en: 'Open My Profile', bn: 'মাই প্রোফাইল খুলুন' },
        body: {
          en: 'Right at the bottom of the menu on the left.',
          bn: 'বাঁ পাশের মেনুর একদম নিচে।',
        },
      },
      {
        key: 'card',
        stage: 'explain',
        target: 'walkthrough-card',
        placement: 'bottom',
        title: { en: 'This card, on your profile', bn: 'আপনার প্রোফাইলের এই কার্ডটি' },
        body: {
          en: 'It remembers where you got to - against you, not against this browser. Close the tour on your phone and pick it up on a laptop at the same step.',
          bn: 'আপনি কতদূর গেছেন তা এটি মনে রাখে — ব্রাউজারের নামে নয়, আপনার নামে। ফোনে বন্ধ করে ল্যাপটপে ঠিক একই ধাপ থেকে চালিয়ে যেতে পারবেন।',
        },
      },
      {
        key: 'buttons',
        stage: 'explain',
        target: 'walkthrough-actions',
        placement: 'bottom',
        title: { en: 'Continue, or start over', bn: 'চালিয়ে যান, নয়তো নতুন করে শুরু' },
        body: {
          en: 'Continue picks up at the step you left. Start over goes back to the first mission - useful when you want to show somebody else.',
          bn: '"Continue" যেখানে ছেড়েছিলেন সেখান থেকে শুরু করে। "Start over" প্রথম মিশনে ফেরায় — অন্য কাউকে দেখাতে চাইলে কাজে লাগে।',
        },
      },
      {
        key: 'done',
        stage: 'complete',
        title: { en: 'That is the whole product', bn: 'পুরো পণ্যটাই দেখা হয়ে গেল' },
        body: {
          en: 'Reports, till, orders, buying and books - and you worked every one of them yourself. The tour is on your profile whenever you want it back, and there is one last thing worth saying before you go.',
          bn: 'রিপোর্ট, কাউন্টার, অর্ডার, কেনাকাটা আর হিসাব — প্রতিটি আপনি নিজে করেছেন। গাইডটি আপনার প্রোফাইলেই থাকল, যখন খুশি ফিরে আসুন। যাওয়ার আগে শেষ একটি কথা বলার আছে।',
        },
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
    title: { en: 'Your own restaurant', bn: 'আপনার নিজের রেস্টুরেন্ট' },
    beats: [
      {
        key: 'trial',
        stage: 'offer',
        cta: 'trial',
        title: { en: 'Now do it with your own menu', bn: 'এবার নিজের মেনু দিয়ে করুন' },
        body: {
          en: 'Everything you just used belongs to a made-up restaurant. Start your own free trial and it is the same screens with your food, your stock and your prices - add a few dishes and take one real sale, and the reports from the first mission start filling with your numbers. It is free for seven days, there is no card to enter, and it opens the moment you say yes.',
          bn: 'এতক্ষণ যা ব্যবহার করলেন, তা একটি কাল্পনিক রেস্টুরেন্টের। নিজের ফ্রি ট্রায়াল শুরু করলে এই একই স্ক্রিনগুলোই পাবেন — আপনার খাবার, আপনার স্টক, আপনার দাম। কয়েকটি আইটেম যোগ করে একটি বিক্রি করুন, প্রথম মিশনের রিপোর্টগুলো আপনার নিজের হিসাবে ভরে উঠবে। সাত দিন সম্পূর্ণ ফ্রি, কোনো কার্ড লাগবে না, আর হ্যাঁ বললেই এখনই চালু।',
        },
      },
    ],
  },
];

const demoTour: TourStep[] = flatten(demoMissions);

/**
 * Quick start first, features second.
 *
 * Flat and unmissioned on purpose - see the note at the top of the file.
 */
const trialTour: TourStep[] = [
  {
    key: 'add-your-menu',
    target: 'nav-catalog',
    href: '/admin/catalog',
    title: {
      en: 'Start with your menu',
      bn: 'শুরু করুন আপনার মেনু দিয়ে',
    },
    body: {
      en: 'Add a handful of dishes you sell most. You can add the rest later - nothing else works until something is on the menu.',
      bn: 'সবচেয়ে বেশি বিক্রি হয় এমন কয়েকটি খাবার যোগ করুন। বাকিগুলো পরে দেওয়া যাবে — মেনুতে কিছু না থাকলে বাকি কিছুই চলবে না।',
    },
    placement: 'right',
  },
  {
    key: 'set-up-tables',
    target: 'nav-locations',
    href: '/admin/locations',
    title: {
      en: 'Then your tables',
      bn: 'এরপর আপনার টেবিল',
    },
    body: {
      en: 'Name your tables the way your staff already call them. Orders are tracked against these.',
      bn: 'আপনার কর্মীরা যেভাবে ডাকেন সেভাবেই টেবিলের নাম দিন। অর্ডার এগুলোর সঙ্গেই যুক্ত থাকবে।',
    },
    placement: 'right',
  },
  {
    key: 'first-sale',
    target: 'nav-pos',
    href: '/admin/pos',
    title: {
      en: 'Now take a sale',
      bn: 'এবার একটি বিক্রি করুন',
    },
    body: {
      en: 'Ring up one order, even a pretend one. It is the fastest way to see whether your menu is set up the way you want it.',
      bn: 'একটি অর্ডার নিন, পরীক্ষামূলক হলেও চলবে। মেনু ঠিকমতো সাজানো হয়েছে কি না, দেখার এটাই দ্রুততম উপায়।',
    },
    placement: 'right',
  },
  {
    key: 'add-staff',
    target: 'nav-hr',
    href: '/admin/hr',
    title: {
      en: 'Let your staff in',
      bn: 'কর্মীদের প্রবেশাধিকার দিন',
    },
    body: {
      en: 'Give each person their own login. You decide who can see the money and who only takes orders.',
      bn: 'প্রত্যেককে আলাদা লগইন দিন। কে হিসাব দেখতে পাবে আর কে শুধু অর্ডার নেবে, সেটা আপনি ঠিক করবেন।',
    },
    placement: 'right',
  },
  {
    key: 'watch-stock',
    target: 'nav-inventory',
    href: '/admin/inventory',
    title: {
      en: 'Keep an eye on stock',
      bn: 'স্টকের দিকে খেয়াল রাখুন',
    },
    body: {
      en: 'Once your recipes are in, every sale takes its ingredients out automatically.',
      bn: 'রেসিপি দেওয়া হলে প্রতিটি বিক্রিতে উপকরণ নিজে থেকেই কমে যাবে।',
    },
    placement: 'right',
  },
  {
    key: 'read-the-day',
    target: 'nav-reporting',
    href: '/admin/reporting',
    title: {
      en: 'Read the day when you close',
      bn: 'দিন শেষে হিসাব দেখুন',
    },
    body: {
      en: 'Sales, costs and what is left, without adding anything up yourself.',
      bn: 'বিক্রি, খরচ আর বাকি — নিজে যোগ করার দরকার নেই।',
    },
    placement: 'right',
  },
];

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
