/**
 * Single source of truth for what each named reporting range means.
 *
 * Every boundary is computed in the restaurant's timezone, not the browser's,
 * so an admin travelling abroad sees the same figures as the branch manager in
 * Dhaka. Windows are half-open: `from` is inclusive, `to` is exclusive. That
 * removes the "23:59:59" boundary which silently dropped orders in the final
 * second of a day.
 */

export const BUSINESS_TIMEZONE = 'Asia/Dhaka';

export type ReportBucket = 'hour' | 'day' | 'month';

export type ReportRangeKey =
  | 'today'
  | 'yesterday'
  | 'past_week'
  | 'past_28_days'
  | '12_months'
  | 'all_time'
  | 'custom';

export interface ReportWindow {
  /** Inclusive lower bound, 'YYYY-MM-DD HH:mm:ss' in business time. Null = no bound. */
  from: string | null;
  /** Exclusive upper bound, same format. */
  to: string;
  bucket: ReportBucket;
  /** Human label for the period, e.g. "19 Jul - 25 Jul 2026". */
  label: string;
  /** Set when the user picked Custom but hasn't supplied both dates yet. */
  incomplete?: boolean;
}

export const RANGE_OPTIONS: { value: ReportRangeKey; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'past_week', label: 'Past Week' },
  { value: 'past_28_days', label: 'Past 28 Days' },
  { value: '12_months', label: 'Past 12 Months' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

/** Today's calendar date in the business timezone, as 'YYYY-MM-DD'. */
export function businessToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly what we want.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Date-only arithmetic. Anchored to UTC midnight so it can never be shifted by
 * the browser's own offset or a DST transition.
 */
function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(ymd: string, months: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

const startOfDay = (ymd: string) => `${ymd} 00:00:00`;

function formatDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Inclusive-end label for a half-open window, i.e. the last day actually covered. */
function rangeLabel(fromYmd: string | null, toExclusiveYmd: string): string {
  const lastDay = addDays(toExclusiveYmd, -1);
  if (!fromYmd) return `Up to ${formatDay(lastDay)}`;
  if (fromYmd === lastDay) return formatDay(fromYmd);
  return `${formatDay(fromYmd)} - ${formatDay(lastDay)}`;
}

export function resolveRange(
  range: string | null,
  customFrom?: string | null,
  customTo?: string | null,
  now: Date = new Date(),
): ReportWindow {
  const today = businessToday(now);
  const tomorrow = addDays(today, 1);
  const key = (RANGE_OPTIONS.find(o => o.value === range)?.value ?? 'past_week') as ReportRangeKey;

  switch (key) {
    case 'today':
      return {
        from: startOfDay(today),
        to: startOfDay(tomorrow),
        bucket: 'hour',
        label: rangeLabel(today, tomorrow),
      };

    case 'yesterday': {
      const yesterday = addDays(today, -1);
      return {
        from: startOfDay(yesterday),
        to: startOfDay(today),
        bucket: 'hour',
        label: rangeLabel(yesterday, today),
      };
    }

    case 'past_week': {
      // Seven days ending today, inclusive.
      const start = addDays(today, -6);
      return {
        from: startOfDay(start),
        to: startOfDay(tomorrow),
        bucket: 'day',
        label: rangeLabel(start, tomorrow),
      };
    }

    case 'past_28_days': {
      const start = addDays(today, -27);
      return {
        from: startOfDay(start),
        to: startOfDay(tomorrow),
        bucket: 'day',
        label: rangeLabel(start, tomorrow),
      };
    }

    case '12_months': {
      // Twelve whole months ending with the current one.
      const start = addMonths(startOfMonth(today), -11);
      return {
        from: startOfDay(start),
        to: startOfDay(tomorrow),
        bucket: 'month',
        label: rangeLabel(start, tomorrow),
      };
    }

    case 'all_time':
      return {
        from: null,
        to: startOfDay(tomorrow),
        bucket: 'month',
        label: rangeLabel(null, tomorrow),
      };

    case 'custom': {
      if (!customFrom || !customTo) {
        return {
          from: null,
          to: startOfDay(tomorrow),
          bucket: 'day',
          label: 'Select both dates',
          incomplete: true,
        };
      }
      // Tolerate the dates being picked in either order.
      const [start, end] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
      const endExclusive = addDays(end, 1);
      const spanDays = Math.round(
        (Date.parse(`${endExclusive}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
      );
      return {
        from: startOfDay(start),
        to: startOfDay(endExclusive),
        // Daily bars stop being readable past a few months.
        bucket: spanDays <= 1 ? 'hour' : spanDays > 92 ? 'month' : 'day',
        label: rangeLabel(start, endExclusive),
      };
    }
  }
}

/** Formats a series bucket key returned by the API for display on an axis. */
export function formatBucket(bucket: string, granularity: ReportBucket): string {
  if (granularity === 'hour') return bucket.slice(11) || bucket;
  if (granularity === 'month') {
    const d = new Date(`${bucket}-01T00:00:00Z`);
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short', year: '2-digit' }).format(d);
  }
  const d = new Date(`${bucket}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(d);
}
