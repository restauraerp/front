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
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
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
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

/** Today's calendar date in the business timezone, as 'YYYY-MM-DD'. */
export function businessToday(now: Date = new Date()): string {
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

/** Returns 'YYYY-MM-01' for the first month of the quarter containing ymd. */
function startOfQuarter(ymd: string): string {
  const month = parseInt(ymd.slice(5, 7), 10); // 1-12
  const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1; // 1, 4, 7, or 10
  return `${ymd.slice(0, 4)}-${String(quarterStartMonth).padStart(2, '0')}-01`;
}

/** Returns Sunday of the week containing ymd, as 'YYYY-MM-DD'. */
function startOfWeek(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  // getUTCDay(): 0=Sun,1=Mon,...,6=Sat. Weeks start on Sunday.
  const dow = d.getUTCDay(); // 0=Sun=start of week
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
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
  const key = (RANGE_OPTIONS.find(o => o.value === range)?.value ?? 'this_week') as ReportRangeKey;

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

    case 'this_week': {
      const weekStart = startOfWeek(today);
      const weekEnd = addDays(weekStart, 7);
      return {
        from: startOfDay(weekStart),
        to: startOfDay(weekEnd),
        bucket: 'day',
        label: rangeLabel(weekStart, weekEnd),
      };
    }

    case 'last_week': {
      const thisWeekStart = startOfWeek(today);
      const lastWeekStart = addDays(thisWeekStart, -7);
      return {
        from: startOfDay(lastWeekStart),
        to: startOfDay(thisWeekStart),
        bucket: 'day',
        label: rangeLabel(lastWeekStart, thisWeekStart),
      };
    }

    case 'this_month': {
      const monthStart = startOfMonth(today);
      const nextMonthStart = addMonths(monthStart, 1);
      return {
        from: startOfDay(monthStart),
        to: startOfDay(nextMonthStart),
        bucket: 'day',
        label: rangeLabel(monthStart, nextMonthStart),
      };
    }

    case 'last_month': {
      const thisMonthStart = startOfMonth(today);
      const lastMonthStart = addMonths(thisMonthStart, -1);
      return {
        from: startOfDay(lastMonthStart),
        to: startOfDay(thisMonthStart),
        bucket: 'day',
        label: rangeLabel(lastMonthStart, thisMonthStart),
      };
    }

    case 'this_quarter': {
      const quarterStart = startOfQuarter(today);
      const nextQuarterStart = addMonths(quarterStart, 3);
      return {
        from: startOfDay(quarterStart),
        to: startOfDay(nextQuarterStart),
        bucket: 'month',
        label: rangeLabel(quarterStart, nextQuarterStart),
      };
    }

    case 'last_quarter': {
      const thisQuarterStart = startOfQuarter(today);
      const lastQuarterStart = addMonths(thisQuarterStart, -3);
      return {
        from: startOfDay(lastQuarterStart),
        to: startOfDay(thisQuarterStart),
        bucket: 'month',
        label: rangeLabel(lastQuarterStart, thisQuarterStart),
      };
    }

    case 'this_year': {
      const yearStart = `${today.slice(0, 4)}-01-01`;
      const nextYearStart = `${parseInt(today.slice(0, 4), 10) + 1}-01-01`;
      return {
        from: startOfDay(yearStart),
        to: startOfDay(nextYearStart),
        bucket: 'month',
        label: rangeLabel(yearStart, nextYearStart),
      };
    }

    case 'last_year': {
      const thisYear = parseInt(today.slice(0, 4), 10);
      const lastYearStart = `${thisYear - 1}-01-01`;
      const thisYearStart = `${thisYear}-01-01`;
      return {
        from: startOfDay(lastYearStart),
        to: startOfDay(thisYearStart),
        bucket: 'month',
        label: rangeLabel(lastYearStart, thisYearStart),
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
      const [start, end] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
      const endExclusive = addDays(end, 1);
      const spanDays = Math.round(
        (Date.parse(`${endExclusive}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
      );
      return {
        from: startOfDay(start),
        to: startOfDay(endExclusive),
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
