/**
 * Single source of truth for what each named reporting range means.
 *
 * Windows are half-open: `from` is inclusive, `to` is exclusive. That removes
 * the "23:59:59" boundary which silently dropped orders in the final second of
 * a day.
 *
 * Three things are the restaurant's to configure (see BusinessTime on the API
 * and the Business Day settings card):
 *
 *  - **Timezone.** Boundaries are computed in the restaurant's own timezone, so
 *    an admin travelling abroad sees the same figures as the branch in Dhaka.
 *  - **Day start.** A business day need not begin at midnight; a kitchen open
 *    past 1am can roll the day over at, say, 04:00.
 *  - **Week start.** Which weekday a week begins on. Sunday by default.
 *
 * Data is stored in the deployment timezone (STORAGE_TIMEZONE), so each computed
 * boundary is converted back into it for the `from`/`to` the API compares
 * against `created_at`. When the restaurant's timezone equals the deployment's -
 * the common single-region case - that conversion is a no-op and only the day
 * start and week start change anything.
 */

/** The timezone the API stores timestamps in (APP_TIMEZONE on core-api). */
export const STORAGE_TIMEZONE = 'Asia/Dhaka';

/** Back-compat default; boundaries fall back to the storage timezone. */
export const BUSINESS_TIMEZONE = STORAGE_TIMEZONE;

export type ReportBucket = 'hour' | 'day' | 'month';

/** The restaurant's business-day settings that shape a reporting window. */
export interface ReportRangeSettings {
  /** IANA timezone, e.g. 'Asia/Dhaka'. Defaults to the storage timezone. */
  timezone?: string;
  /** Minutes past midnight the business day starts. Defaults to 0 (midnight). */
  dayStartMinutes?: number;
  /** Weekday a week starts on: 0 (Sunday) .. 6 (Saturday). Defaults to 0. */
  weekStartDay?: number;
}

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
  /** Inclusive lower bound, 'YYYY-MM-DD HH:mm:ss' in storage time. Null = no bound. */
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

const pad = (n: number) => String(n).padStart(2, '0');

/** The wall-clock parts of an instant, read in a given timezone. */
function partsInTz(date: Date, tz: string): { y: number; mo: number; d: number; h: number; mi: number; s: number } {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((a, x) => { a[x.type] = x.value; return a; }, {});
  // 'en-US' hour12:false can emit '24' at midnight; fold it back to 0.
  return { y: +p.year, mo: +p.month, d: +p.day, h: (+p.hour) % 24, mi: +p.minute, s: +p.second };
}

/** A timezone's offset from UTC, in milliseconds, at a given instant. */
function tzOffsetMs(date: Date, tz: string): number {
  const p = partsInTz(date, tz);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return asUtc - date.getTime();
}

/** The UTC instant of a wall-clock (ymd + minutes-past-midnight) read in `tz`. */
function wallClockToUtc(ymd: string, minutes: number, tz: string): Date {
  const [y, mo, d] = ymd.split('-').map(Number);
  const h = Math.floor(minutes / 60);
  const mi = minutes % 60;
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  // Correct the guess by the zone's offset at that moment (good enough across a
  // DST edge for a day boundary - the boundary is never at the transition).
  const offset = tzOffsetMs(new Date(guess), tz);
  return new Date(guess - offset);
}

/** Formats an instant as 'YYYY-MM-DD HH:mm:ss' in a given timezone. */
function formatInTz(date: Date, tz: string): string {
  const p = partsInTz(date, tz);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
}

/**
 * The business date containing `now`, as 'YYYY-MM-DD' in the restaurant's
 * timezone, shifted back by the day-start so a moment before the cutoff counts
 * as the previous day.
 */
export function businessToday(now: Date = new Date(), tz: string = STORAGE_TIMEZONE, dayStartMinutes = 0): string {
  const shifted = new Date(now.getTime() - dayStartMinutes * 60_000);
  const p = partsInTz(shifted, tz);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
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

/** Returns the start of the week containing ymd, honouring weekStartDay (0=Sun). */
function startOfWeek(ymd: string, weekStartDay = 0): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const back = (dow - weekStartDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

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
  settings: ReportRangeSettings = {},
): ReportWindow {
  const tz = settings.timezone || STORAGE_TIMEZONE;
  const dayStartMinutes = settings.dayStartMinutes ?? 0;
  const weekStartDay = settings.weekStartDay ?? 0;

  // A calendar-date boundary (the restaurant's day-start on `ymd`, in its own
  // timezone) expressed in the deployment timezone the API queries against.
  const boundary = (ymd: string): string => {
    if (tz === STORAGE_TIMEZONE) {
      return `${ymd} ${pad(Math.floor(dayStartMinutes / 60))}:${pad(dayStartMinutes % 60)}:00`;
    }
    return formatInTz(wallClockToUtc(ymd, dayStartMinutes, tz), STORAGE_TIMEZONE);
  };

  const today = businessToday(now, tz, dayStartMinutes);
  const tomorrow = addDays(today, 1);
  const key = (RANGE_OPTIONS.find(o => o.value === range)?.value ?? 'this_week') as ReportRangeKey;

  switch (key) {
    case 'today':
      return { from: boundary(today), to: boundary(tomorrow), bucket: 'hour', label: rangeLabel(today, tomorrow) };

    case 'yesterday': {
      const yesterday = addDays(today, -1);
      return { from: boundary(yesterday), to: boundary(today), bucket: 'hour', label: rangeLabel(yesterday, today) };
    }

    case 'this_week': {
      const weekStart = startOfWeek(today, weekStartDay);
      const weekEnd = addDays(weekStart, 7);
      return { from: boundary(weekStart), to: boundary(weekEnd), bucket: 'day', label: rangeLabel(weekStart, weekEnd) };
    }

    case 'last_week': {
      const thisWeekStart = startOfWeek(today, weekStartDay);
      const lastWeekStart = addDays(thisWeekStart, -7);
      return { from: boundary(lastWeekStart), to: boundary(thisWeekStart), bucket: 'day', label: rangeLabel(lastWeekStart, thisWeekStart) };
    }

    case 'this_month': {
      const monthStart = startOfMonth(today);
      const nextMonthStart = addMonths(monthStart, 1);
      return { from: boundary(monthStart), to: boundary(nextMonthStart), bucket: 'day', label: rangeLabel(monthStart, nextMonthStart) };
    }

    case 'last_month': {
      const thisMonthStart = startOfMonth(today);
      const lastMonthStart = addMonths(thisMonthStart, -1);
      return { from: boundary(lastMonthStart), to: boundary(thisMonthStart), bucket: 'day', label: rangeLabel(lastMonthStart, thisMonthStart) };
    }

    case 'this_quarter': {
      const quarterStart = startOfQuarter(today);
      const nextQuarterStart = addMonths(quarterStart, 3);
      return { from: boundary(quarterStart), to: boundary(nextQuarterStart), bucket: 'month', label: rangeLabel(quarterStart, nextQuarterStart) };
    }

    case 'last_quarter': {
      const thisQuarterStart = startOfQuarter(today);
      const lastQuarterStart = addMonths(thisQuarterStart, -3);
      return { from: boundary(lastQuarterStart), to: boundary(thisQuarterStart), bucket: 'month', label: rangeLabel(lastQuarterStart, thisQuarterStart) };
    }

    case 'this_year': {
      const yearStart = `${today.slice(0, 4)}-01-01`;
      const nextYearStart = `${parseInt(today.slice(0, 4), 10) + 1}-01-01`;
      return { from: boundary(yearStart), to: boundary(nextYearStart), bucket: 'month', label: rangeLabel(yearStart, nextYearStart) };
    }

    case 'last_year': {
      const thisYear = parseInt(today.slice(0, 4), 10);
      const lastYearStart = `${thisYear - 1}-01-01`;
      const thisYearStart = `${thisYear}-01-01`;
      return { from: boundary(lastYearStart), to: boundary(thisYearStart), bucket: 'month', label: rangeLabel(lastYearStart, thisYearStart) };
    }

    case 'all_time':
      return { from: null, to: boundary(tomorrow), bucket: 'month', label: rangeLabel(null, tomorrow) };

    case 'custom': {
      if (!customFrom || !customTo) {
        return { from: null, to: boundary(tomorrow), bucket: 'day', label: 'Select both dates', incomplete: true };
      }
      const [start, end] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
      const endExclusive = addDays(end, 1);
      const spanDays = Math.round(
        (Date.parse(`${endExclusive}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
      );
      return {
        from: boundary(start),
        to: boundary(endExclusive),
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
