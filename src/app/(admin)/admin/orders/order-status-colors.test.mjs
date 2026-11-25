import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export const ORDER_STATUS_CONFIG = {
  pending: {
    key: 'pending',
    label: 'Placed',
    badge: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
    cardBg: 'bg-amber-50/70 border-amber-200/90 hover:border-amber-300 dark:bg-amber-950/25 dark:border-amber-900/60',
    rowBg: 'bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-950/15',
    accentColor: '#d97706',
    borderLeft: 'border-l-4 border-l-amber-500',
  },
  cooking: {
    key: 'cooking',
    label: 'Cooking',
    badge: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800',
    cardBg: 'bg-sky-50/70 border-sky-200/90 hover:border-sky-300 dark:bg-sky-950/25 dark:border-sky-900/60',
    rowBg: 'bg-sky-50/30 hover:bg-sky-50/60 dark:bg-sky-950/15',
    accentColor: '#0284c7',
    borderLeft: 'border-l-4 border-l-sky-500',
  },
  ready_to_serve: {
    key: 'ready_to_serve',
    label: 'Ready to Serve',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
    cardBg: 'bg-emerald-50/70 border-emerald-200/90 hover:border-emerald-300 dark:bg-emerald-950/25 dark:border-emerald-900/60',
    rowBg: 'bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-950/15',
    accentColor: '#059669',
    borderLeft: 'border-l-4 border-l-emerald-500',
  },
  served: {
    key: 'served',
    label: 'Served',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800',
    cardBg: 'bg-indigo-50/70 border-indigo-200/90 hover:border-indigo-300 dark:bg-indigo-950/25 dark:border-indigo-900/60',
    rowBg: 'bg-indigo-50/30 hover:bg-indigo-50/60 dark:bg-indigo-950/15',
    accentColor: '#4f46e5',
    borderLeft: 'border-l-4 border-l-indigo-500',
  },
  packed: {
    key: 'packed',
    label: 'Packed',
    badge: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
    cardBg: 'bg-blue-50/70 border-blue-200/90 hover:border-blue-300 dark:bg-blue-950/25 dark:border-blue-900/60',
    rowBg: 'bg-blue-50/30 hover:bg-blue-50/60 dark:bg-blue-950/15',
    accentColor: '#2563eb',
    borderLeft: 'border-l-4 border-l-blue-500',
  },
  picked_up: {
    key: 'picked_up',
    label: 'Picked Up',
    badge: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800',
    cardBg: 'bg-purple-50/70 border-purple-200/90 hover:border-purple-300 dark:bg-purple-950/25 dark:border-purple-900/60',
    rowBg: 'bg-purple-50/30 hover:bg-purple-50/60 dark:bg-purple-950/15',
    accentColor: '#9333ea',
    borderLeft: 'border-l-4 border-l-purple-500',
  },
  delivered: {
    key: 'delivered',
    label: 'Delivered',
    badge: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800',
    cardBg: 'bg-teal-50/70 border-teal-200/90 hover:border-teal-300 dark:bg-teal-950/25 dark:border-teal-900/60',
    rowBg: 'bg-teal-50/30 hover:bg-teal-50/60 dark:bg-teal-950/15',
    accentColor: '#0d9488',
    borderLeft: 'border-l-4 border-l-teal-500',
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    badge: 'bg-green-100 text-green-900 border-green-300 dark:bg-green-950/60 dark:text-green-200 dark:border-green-800',
    cardBg: 'bg-green-50/70 border-green-200/90 hover:border-green-300 dark:bg-green-950/25 dark:border-green-900/60',
    rowBg: 'bg-green-50/30 hover:bg-green-50/60 dark:bg-green-950/15',
    accentColor: '#16a34a',
    borderLeft: 'border-l-4 border-l-green-500',
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    badge: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800',
    cardBg: 'bg-rose-50/70 border-rose-200/90 hover:border-rose-300 dark:bg-rose-950/25 dark:border-rose-900/60',
    rowBg: 'bg-rose-50/30 hover:bg-rose-50/60 dark:bg-rose-950/15',
    accentColor: '#e11d48',
    borderLeft: 'border-l-4 border-l-rose-500',
  },
  fallback: {
    key: 'default',
    label: 'Pending',
    badge: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200',
    cardBg: 'bg-base-100 border-base-200',
    rowBg: 'hover:bg-base-200/40',
    accentColor: '#6b7280',
    borderLeft: 'border-l-4 border-l-gray-400',
  },
};

export function getOrderStatusTheme(status) {
  if (!status) return ORDER_STATUS_CONFIG.fallback;
  const normalized = String(status).toLowerCase().trim();
  return ORDER_STATUS_CONFIG[normalized] || {
    ...ORDER_STATUS_CONFIG.fallback,
    label: normalized.charAt(0).toUpperCase() + normalized.slice(1).replace('_', ' '),
  };
}

describe('Universal Order Status Color Coding Logic', () => {
  test('returns amber theme with light background for placed/pending orders', () => {
    const theme = getOrderStatusTheme('pending');
    assert.strictEqual(theme.key, 'pending');
    assert.strictEqual(theme.label, 'Placed');
    assert.ok(theme.cardBg.includes('bg-amber-50/70'));
    assert.ok(theme.badge.includes('bg-amber-100'));
    assert.ok(theme.borderLeft.includes('border-l-amber-500'));
  });

  test('returns sky blue theme with light background for cooking orders', () => {
    const theme = getOrderStatusTheme('cooking');
    assert.strictEqual(theme.key, 'cooking');
    assert.strictEqual(theme.label, 'Cooking');
    assert.ok(theme.cardBg.includes('bg-sky-50/70'));
    assert.ok(theme.badge.includes('bg-sky-100'));
    assert.ok(theme.borderLeft.includes('border-l-sky-500'));
  });

  test('returns emerald green theme with light background for ready_to_serve orders', () => {
    const theme = getOrderStatusTheme('ready_to_serve');
    assert.strictEqual(theme.key, 'ready_to_serve');
    assert.strictEqual(theme.label, 'Ready to Serve');
    assert.ok(theme.cardBg.includes('bg-emerald-50/70'));
    assert.ok(theme.badge.includes('bg-emerald-100'));
    assert.ok(theme.borderLeft.includes('border-l-emerald-500'));
  });

  test('returns indigo theme with light background for served orders', () => {
    const theme = getOrderStatusTheme('served');
    assert.strictEqual(theme.key, 'served');
    assert.strictEqual(theme.label, 'Served');
    assert.ok(theme.cardBg.includes('bg-indigo-50/70'));
    assert.ok(theme.badge.includes('bg-indigo-100'));
    assert.ok(theme.borderLeft.includes('border-l-indigo-500'));
  });

  test('returns purple theme with light background for picked_up orders', () => {
    const theme = getOrderStatusTheme('picked_up');
    assert.strictEqual(theme.key, 'picked_up');
    assert.strictEqual(theme.label, 'Picked Up');
    assert.ok(theme.cardBg.includes('bg-purple-50/70'));
    assert.ok(theme.badge.includes('bg-purple-100'));
  });

  test('returns teal theme with light background for delivered orders', () => {
    const theme = getOrderStatusTheme('delivered');
    assert.strictEqual(theme.key, 'delivered');
    assert.strictEqual(theme.label, 'Delivered');
    assert.ok(theme.cardBg.includes('bg-teal-50/70'));
    assert.ok(theme.badge.includes('bg-teal-100'));
  });

  test('returns rose theme with light background for cancelled orders', () => {
    const theme = getOrderStatusTheme('cancelled');
    assert.strictEqual(theme.key, 'cancelled');
    assert.strictEqual(theme.label, 'Cancelled');
    assert.ok(theme.cardBg.includes('bg-rose-50/70'));
    assert.ok(theme.badge.includes('bg-rose-100'));
  });

  test('handles unknown or missing statuses with safe fallback and capitalized label', () => {
    const fallbackTheme = getOrderStatusTheme(null);
    assert.strictEqual(fallbackTheme.key, 'default');
    assert.strictEqual(fallbackTheme.label, 'Pending');

    const customTheme = getOrderStatusTheme('dispatched_express');
    assert.strictEqual(customTheme.label, 'Dispatched express');
    assert.ok(customTheme.cardBg.includes('bg-base-100'));
  });
});
