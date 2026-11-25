/**
 * Universal Order Status Color Coding
 *
 * Provides a consistent semantic color palette across the entire application
 * for order statuses (placed, cooking, ready to serve, served, etc.).
 *
 * Each status defines:
 * - A primary accent color
 * - A light-tone background for cards and containers (`cardBg`)
 * - A subtle light-tone background for table rows (`rowBg`)
 * - A styled badge pill (`badge`)
 * - An accent left-border indicator (`borderLeft`)
 */

export interface OrderStatusTheme {
  key: string;
  label: string;
  badge: string;
  cardBg: string;
  rowBg: string;
  borderLeft: string;
  accentColor: string;
  indicatorDot: string;
}

export const ORDER_STATUS_THEMES: Record<string, OrderStatusTheme> = {
  pending: {
    key: 'pending',
    label: 'Placed',
    badge: 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
    cardBg: 'bg-amber-50/70 border-amber-200/90 hover:border-amber-300 dark:bg-amber-950/25 dark:border-amber-900/60',
    rowBg: 'bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-950/15',
    borderLeft: 'border-l-4 border-l-amber-500',
    accentColor: '#d97706',
    indicatorDot: 'bg-amber-500',
  },
  cooking: {
    key: 'cooking',
    label: 'Cooking',
    badge: 'bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800',
    cardBg: 'bg-sky-50/70 border-sky-200/90 hover:border-sky-300 dark:bg-sky-950/25 dark:border-sky-900/60',
    rowBg: 'bg-sky-50/30 hover:bg-sky-50/60 dark:bg-sky-950/15',
    borderLeft: 'border-l-4 border-l-sky-500',
    accentColor: '#0284c7',
    indicatorDot: 'bg-sky-500',
  },
  ready_to_serve: {
    key: 'ready_to_serve',
    label: 'Ready to Serve',
    badge: 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
    cardBg: 'bg-emerald-50/70 border-emerald-200/90 hover:border-emerald-300 dark:bg-emerald-950/25 dark:border-emerald-900/60',
    rowBg: 'bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-950/15',
    borderLeft: 'border-l-4 border-l-emerald-500',
    accentColor: '#059669',
    indicatorDot: 'bg-emerald-500',
  },
  served: {
    key: 'served',
    label: 'Served',
    badge: 'bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800',
    cardBg: 'bg-indigo-50/70 border-indigo-200/90 hover:border-indigo-300 dark:bg-indigo-950/25 dark:border-indigo-900/60',
    rowBg: 'bg-indigo-50/30 hover:bg-indigo-50/60 dark:bg-indigo-950/15',
    borderLeft: 'border-l-4 border-l-indigo-500',
    accentColor: '#4f46e5',
    indicatorDot: 'bg-indigo-500',
  },
  packed: {
    key: 'packed',
    label: 'Packed',
    badge: 'bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
    cardBg: 'bg-blue-50/70 border-blue-200/90 hover:border-blue-300 dark:bg-blue-950/25 dark:border-blue-900/60',
    rowBg: 'bg-blue-50/30 hover:bg-blue-50/60 dark:bg-blue-950/15',
    borderLeft: 'border-l-4 border-l-blue-500',
    accentColor: '#2563eb',
    indicatorDot: 'bg-blue-500',
  },
  picked_up: {
    key: 'picked_up',
    label: 'Picked Up',
    badge: 'bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800',
    cardBg: 'bg-purple-50/70 border-purple-200/90 hover:border-purple-300 dark:bg-purple-950/25 dark:border-purple-900/60',
    rowBg: 'bg-purple-50/30 hover:bg-purple-50/60 dark:bg-purple-950/15',
    borderLeft: 'border-l-4 border-l-purple-500',
    accentColor: '#9333ea',
    indicatorDot: 'bg-purple-500',
  },
  delivered: {
    key: 'delivered',
    label: 'Delivered',
    badge: 'bg-teal-100 text-teal-900 border border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800',
    cardBg: 'bg-teal-50/70 border-teal-200/90 hover:border-teal-300 dark:bg-teal-950/25 dark:border-teal-900/60',
    rowBg: 'bg-teal-50/30 hover:bg-teal-50/60 dark:bg-teal-950/15',
    borderLeft: 'border-l-4 border-l-teal-500',
    accentColor: '#0d9488',
    indicatorDot: 'bg-teal-500',
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    badge: 'bg-green-100 text-green-900 border border-green-300 dark:bg-green-950/60 dark:text-green-200 dark:border-green-800',
    cardBg: 'bg-green-50/70 border-green-200/90 hover:border-green-300 dark:bg-green-950/25 dark:border-green-900/60',
    rowBg: 'bg-green-50/30 hover:bg-green-50/60 dark:bg-green-950/15',
    borderLeft: 'border-l-4 border-l-green-500',
    accentColor: '#16a34a',
    indicatorDot: 'bg-green-500',
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    badge: 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800',
    cardBg: 'bg-rose-50/70 border-rose-200/90 hover:border-rose-300 dark:bg-rose-950/25 dark:border-rose-900/60',
    rowBg: 'bg-rose-50/30 hover:bg-rose-50/60 dark:bg-rose-950/15',
    borderLeft: 'border-l-4 border-l-rose-500',
    accentColor: '#e11d48',
    indicatorDot: 'bg-rose-500',
  },
  paid: {
    key: 'paid',
    label: 'Paid',
    badge: 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
    cardBg: 'bg-emerald-50/70 border-emerald-200/90 hover:border-emerald-300 dark:bg-emerald-950/25 dark:border-emerald-900/60',
    rowBg: 'bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-950/15',
    borderLeft: 'border-l-4 border-l-emerald-500',
    accentColor: '#059669',
    indicatorDot: 'bg-emerald-500',
  },
};

export const FALLBACK_ORDER_STATUS_THEME: OrderStatusTheme = {
  key: 'default',
  label: 'Pending',
  badge: 'bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
  cardBg: 'bg-base-100 border-base-200',
  rowBg: 'hover:bg-base-200/40',
  borderLeft: 'border-l-4 border-l-gray-400',
  accentColor: '#6b7280',
  indicatorDot: 'bg-gray-400',
};

/**
 * Returns the universal color coding theme for any order status.
 * Safely defaults to a readable neutral fallback with capitalized status label.
 */
export function getOrderStatusTheme(status?: string | null): OrderStatusTheme {
  if (!status) return FALLBACK_ORDER_STATUS_THEME;
  const normalized = String(status).toLowerCase().trim();
  const theme = ORDER_STATUS_THEMES[normalized];
  if (theme) return theme;

  const prettyLabel = normalized
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    ...FALLBACK_ORDER_STATUS_THEME,
    key: normalized,
    label: prettyLabel,
  };
}
