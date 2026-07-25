/**
 * Shared number formatting. en-IN gives the lakh/crore digit grouping used in
 * Bangladesh (৳7,79,821.00 rather than ৳779,821.00).
 */

const NUMBER_LOCALE = 'en-IN';

export function formatCurrency(value: number | string | null | undefined): string {
  return Number(value || 0).toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** With the taka sign, for display. */
export function formatTaka(value: number | string | null | undefined): string {
  return `৳${formatCurrency(value)}`;
}

/** Compact form for chart axes, where full precision just clutters. */
export function formatTakaCompact(value: number | string | null | undefined): string {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  if (abs >= 10_000_000) return `৳${(n / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `৳${(n / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `৳${(n / 1_000).toFixed(1)}K`;
  return `৳${n.toFixed(0)}`;
}

export function formatQuantity(value: number | string | null | undefined): string {
  const n = Number(value || 0);
  return Number.isInteger(n)
    ? n.toLocaleString(NUMBER_LOCALE)
    : n.toLocaleString(NUMBER_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCount(value: number | string | null | undefined): string {
  return Number(value || 0).toLocaleString(NUMBER_LOCALE);
}
