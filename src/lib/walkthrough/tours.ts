/**
 * The two guided tours, as data.
 *
 * Steps are a list rather than markup so a tour is edited without touching the
 * component that draws it, and so the percentage reported back is simply how far
 * through the list somebody got.
 *
 * The two tours are the same mechanism aimed at different moments, and the order
 * of their steps is the whole difference:
 *
 * - **Demo** opens on what the software *produces* - today's takings, an order
 *   arriving, the report at the end of the day. Somebody in the demo is deciding
 *   whether this is worth their time, and setup screens answer a question they
 *   have not asked yet.
 * - **Trial** opens on the shortest route to a working restaurant. They have
 *   already decided; what they need is a menu, a table and a way in for their
 *   staff, and everything else can wait until that has paid off.
 */

export type TourKind = 'demo' | 'trial';

export type TourStep = {
  /** Stable identifier, reported with the progress. Never renamed once live. */
  key: string;
  /**
   * What the step points at, matched on a `data-tour` attribute.
   *
   * An attribute rather than a class or a DOM position: a tour pinned to a class
   * breaks the first time somebody restyles a button, and breaks silently.
   */
  target: string;
  /** Where the tour lives while this step is showing. */
  href?: string;
  title: { en: string; bn: string };
  body: { en: string; bn: string };
  placement?: 'top' | 'bottom' | 'left' | 'right';
};

/**
 * Result first, detail second.
 */
const demoTour: TourStep[] = [
  {
    key: 'todays-takings',
    target: 'dashboard-summary',
    href: '/admin',
    title: {
      en: "Today's takings, live",
      bn: 'আজকের বিক্রি, সরাসরি',
    },
    body: {
      en: 'Every sale from every till and every delivery app lands here as it happens. No closing the day to find out how it went.',
      bn: 'প্রতিটি কাউন্টার আর ডেলিভারি অ্যাপের বিক্রি সঙ্গে সঙ্গে এখানে আসে। দিন শেষ না করেই হিসাব দেখতে পাবেন।',
    },
    placement: 'bottom',
  },
  {
    key: 'live-orders',
    target: 'nav-orders',
    href: '/admin/orders',
    title: {
      en: 'Orders as they arrive',
      bn: 'অর্ডার আসার সঙ্গে সঙ্গে',
    },
    body: {
      en: 'Dine-in, takeaway and delivery in one list, in the order they came in. The kitchen sees the same screen.',
      bn: 'ডাইন-ইন, টেকঅ্যাওয়ে আর ডেলিভারি এক তালিকায়, আসার ক্রম অনুযায়ী। রান্নাঘরও একই স্ক্রিন দেখে।',
    },
    placement: 'right',
  },
  {
    key: 'kitchen-screen',
    target: 'nav-kiosk',
    href: '/admin/kiosk',
    title: {
      en: 'The kitchen screen',
      bn: 'রান্নাঘরের স্ক্রিন',
    },
    body: {
      en: 'No printed tickets to lose. Each dish is marked off as it goes out, and the front of house sees it done.',
      bn: 'কাগজের টিকিট হারানোর ভয় নেই। প্রতিটি খাবার তৈরি হলে মার্ক হয়, সামনের কাউন্টারও দেখতে পায়।',
    },
    placement: 'right',
  },
  {
    key: 'stock-falling',
    target: 'nav-inventory',
    href: '/admin/inventory',
    title: {
      en: 'Stock going down as you sell',
      bn: 'বিক্রির সঙ্গে স্টক কমছে',
    },
    body: {
      en: 'Each sale takes its ingredients out of stock, so the shortage shows up before the customer does.',
      bn: 'প্রতিটি বিক্রিতে উপকরণ স্টক থেকে বাদ যায়, তাই ঘাটতি গ্রাহকের আগেই ধরা পড়ে।',
    },
    placement: 'right',
  },
  {
    key: 'day-report',
    target: 'nav-reporting',
    href: '/admin/reporting',
    title: {
      en: 'The day, in one page',
      bn: 'সারা দিনের হিসাব এক পাতায়',
    },
    body: {
      en: 'What sold, what it cost and what is left. The same numbers your accountant asks for.',
      bn: 'কী বিক্রি হলো, খরচ কত, বাকি কত। আপনার হিসাবরক্ষক যা চান, ঠিক তাই।',
    },
    placement: 'right',
  },
  {
    key: 'menu-behind-it',
    target: 'nav-catalog',
    href: '/admin/catalog',
    title: {
      en: 'And this is all it takes to set up',
      bn: 'আর সেটআপ করতে এটুকুই লাগে',
    },
    body: {
      en: 'Your menu, your prices, your recipes. Everything you have just seen runs off this one screen.',
      bn: 'আপনার মেনু, দাম আর রেসিপি। এতক্ষণ যা দেখলেন সবই এই এক স্ক্রিন থেকে চলে।',
    },
    placement: 'right',
  },
];

/**
 * Quick start first, features second.
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
