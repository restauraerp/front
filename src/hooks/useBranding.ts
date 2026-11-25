'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { normaliseFacebookUrl } from '@/lib/facebook';
import { DEFAULT_DAY_START } from '@/lib/reportRange';

/**
 * What this restaurant is called, for anything it hands a customer.
 *
 * The keys match core-api's App\Support\Branding\RestaurantBranding and the
 * Flutter POS's VenueDetails, so a restaurant that sets its name once has set
 * it on the printed slip, the web receipt and the shared invoice alike. Three
 * clients reading three different key names was how the web receipt ended up
 * printing "RESTORA ERP", "123 Restaurant Street" and a placeholder phone
 * number onto real customers' receipts while the till printed the truth.
 */
/**
 * Settings that are not branding but live in the same key/value table.
 *
 * Read through the same cache, so asking for one costs no extra request.
 */
export const SETTING_KEYS = {
  /** Starting commission for a new delivery partner. */
  partnerDefaultCommission: 'partner_default_commission_rate',
} as const;

/**
 * Which slips this restaurant prints. Stored as '1'/'0' strings in the same
 * key/value table, and read through the shared cache below.
 *
 * Kitchen and customer default on - every restaurant needs them from day one.
 * Delivery defaults off: it only matters to restaurants that deliver, and its
 * slip carries a customer's address and phone, so it is opt-in rather than
 * something we start printing on their behalf.
 */
export const SLIP_KEYS = {
  kitchen: 'slip_kitchen_enabled',
  customer: 'slip_customer_enabled',
  delivery: 'slip_delivery_enabled',
} as const;

export const SLIP_DEFAULTS: Record<keyof typeof SLIP_KEYS, boolean> = {
  kitchen: true,
  customer: true,
  delivery: false,
};

export interface SlipSettings {
  kitchen: boolean;
  customer: boolean;
  delivery: boolean;
  loaded: boolean;
}

/**
 * Customer receipt formatting & font scaling keys.
 * Stored in website_settings to allow restaurants to toggle between detailed
 * and minimal paper-saving layouts and adjust font sizing for thermal printer rolls.
 */
export const RECEIPT_KEYS = {
  format: 'receipt_format',
  fontScale: 'receipt_font_scale',
} as const;

export type ReceiptFormat = 'detailed' | 'minimal';
export type ReceiptFontScale = '80%' | '90%' | '100%' | '110%' | '120%';

export const RECEIPT_DEFAULTS = {
  format: 'detailed' as ReceiptFormat,
  fontScale: '100%' as ReceiptFontScale,
};

export interface ReceiptSettings {
  format: ReceiptFormat;
  fontScale: ReceiptFontScale;
  isMinimal: boolean;
  scaleFactor: number;
  loaded: boolean;
}

/**
 * Business-day settings - the timezone reports are read in, the time of day the
 * business day rolls over, and which weekday a week starts on. Stored in the
 * same key/value table; the names match core-api's App\Support\Time\BusinessTime.
 */
export const BUSINESS_TIME_KEYS = {
  timezone: 'business_timezone',
  dayStart: 'business_day_start_time',
  weekStart: 'week_start_day',
} as const;

export interface BusinessTimeSettings {
  /** IANA timezone, or '' when unset (falls back to the deployment timezone). */
  timezone: string;
  /** Business-day start as 'HH:MM'. */
  dayStart: string;
  /** Minutes past midnight the business day starts. */
  dayStartMinutes: number;
  /** Weekday a week starts on: 0 (Sunday) .. 6 (Saturday). */
  weekStartDay: number;
  loaded: boolean;
}

function parseHm(value: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return 0;
  return Math.max(0, Math.min(24 * 60 - 1, (+m[1]) * 60 + (+m[2])));
}

export const BRANDING_KEYS = {
  name: 'site_name',
  address: 'address',
  phone: 'contact_phone',
  email: 'contact_email',
  currency: 'currency_symbol',
  logo: 'logo_url',
  receiptFooter: 'receipt_footer',
  // Settings > Facebook Page. The QR switch is '1'/'0', off until turned on.
  facebookPage: 'facebook_page_url',
  facebookQr: 'receipt_facebook_qr',
} as const;

export interface Branding {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  logo: string | null;
  receiptFooter: string | null;
  /** The restaurant's Facebook page, cleaned up - null when unset or not Facebook. */
  facebookPage: string | null;
  /** Print the page as a QR code on the customer receipt: switched on AND a valid page. */
  facebookQr: boolean;
  /** Customer receipt layout: 'detailed' (standard) or 'minimal' (paper-saving). */
  receiptFormat: ReceiptFormat;
  /** Font scale for customer receipt (e.g. '80%', '100%', '120%'). */
  receiptFontScale: ReceiptFontScale;
  /** Convenient flag for conditional styling: receiptFormat === 'minimal'. */
  isMinimalReceipt: boolean;
  /** Numeric font scaling factor (e.g. 0.8, 1.0, 1.2). */
  receiptScaleFactor: number;
  /** False until the settings arrive - a receipt must not print a fallback. */
  loaded: boolean;
}

const FALLBACK: Omit<Branding, 'loaded'> = {
  // Generic on purpose. A receipt that cannot name the restaurant should say
  // nothing rather than name a different one.
  name: '',
  address: null,
  phone: null,
  email: null,
  currency: '৳',
  logo: null,
  receiptFooter: null,
  facebookPage: null,
  facebookQr: false,
  receiptFormat: RECEIPT_DEFAULTS.format,
  receiptFontScale: RECEIPT_DEFAULTS.fontScale,
  isMinimalReceipt: false,
  receiptScaleFactor: 1.0,
};

let cached: Promise<Record<string, string>> | null = null;

/**
 * Components currently reading these settings.
 *
 * Emptying the cache is not enough on its own: a hook that has already
 * resolved will not look again, so a restaurant that renamed itself kept
 * printing the old name until the tab was reloaded - exactly what clearing the
 * cache was supposed to prevent. Clearing now tells everyone reading to look
 * again.
 */
const listeners = new Set<() => void>();

function loadSettings(): Promise<Record<string, string>> {
  cached ??= fetchApi('/website-settings?nopaginate=1')
    .then((res) => {
      const rows = (res?.data ?? res ?? []) as { key: string; value: string }[];
      return Object.fromEntries(rows.map((row) => [row.key, row.value]));
    })
    .catch(() => {
      cached = null;
      return {};
    });

  return cached;
}

/** Forget the cached settings and re-read them wherever they are on screen. */
export function clearBrandingCache(): void {
  cached = null;
  listeners.forEach((notify) => notify());
}

export function useBranding(): Branding {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const notify = () => setVersion((n) => n + 1);
    listeners.add(notify);

    return () => {
      listeners.delete(notify);
    };
  }, []);

  useEffect(() => {
    let active = true;

    loadSettings().then((value) => {
      if (active) setSettings(value);
    });

    return () => {
      active = false;
    };
  }, [version]);

  if (settings === null) {
    return { ...FALLBACK, loaded: false };
  }

  const read = (key: string): string | null => {
    const value = (settings[key] ?? '').trim();
    return value === '' ? null : value;
  };

  const rawFormat = (read(RECEIPT_KEYS.format) ?? '').toLowerCase();
  const receiptFormat: ReceiptFormat = rawFormat === 'minimal' ? 'minimal' : 'detailed';

  let rawScale = read(RECEIPT_KEYS.fontScale) ?? '';
  if (rawScale && !rawScale.endsWith('%')) {
    rawScale = `${rawScale}%`;
  }
  const validScales: ReceiptFontScale[] = ['80%', '90%', '100%', '110%', '120%'];
  const receiptFontScale: ReceiptFontScale = validScales.includes(rawScale as ReceiptFontScale)
    ? (rawScale as ReceiptFontScale)
    : RECEIPT_DEFAULTS.fontScale;

  const receiptScaleFactor = parseInt(receiptFontScale, 10) / 100;

  return {
    name: read(BRANDING_KEYS.name) ?? FALLBACK.name,
    address: read(BRANDING_KEYS.address),
    phone: read(BRANDING_KEYS.phone),
    email: read(BRANDING_KEYS.email),
    currency: read(BRANDING_KEYS.currency) ?? FALLBACK.currency,
    logo: read(BRANDING_KEYS.logo),
    receiptFooter: read(BRANDING_KEYS.receiptFooter),
    facebookPage: normaliseFacebookUrl(read(BRANDING_KEYS.facebookPage)),
    facebookQr: read(BRANDING_KEYS.facebookQr) === '1' && normaliseFacebookUrl(read(BRANDING_KEYS.facebookPage)) !== null,
    receiptFormat,
    receiptFontScale,
    isMinimalReceipt: receiptFormat === 'minimal',
    receiptScaleFactor,
    loaded: true,
  };
}

/**
 * One arbitrary setting, with a fallback for when it has never been set.
 *
 * Shares the cache `useBranding` fills, so a screen reading both makes one
 * request rather than two.
 */
export function useSetting(key: string, fallback: string): { value: string; loaded: boolean } {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const notify = () => setVersion((n) => n + 1);
    listeners.add(notify);

    return () => {
      listeners.delete(notify);
    };
  }, []);

  useEffect(() => {
    let active = true;

    loadSettings().then((value) => {
      if (active) setSettings(value);
    });

    return () => {
      active = false;
    };
  }, [version]);

  if (settings === null) {
    return { value: fallback, loaded: false };
  }

  const stored = (settings[key] ?? '').trim();

  return { value: stored === '' ? fallback : stored, loaded: true };
}

/**
 * The three slip toggles, read from the shared settings cache.
 *
 * A missing key means the restaurant has never touched it, so each falls back
 * to SLIP_DEFAULTS rather than to "off" - a fresh restaurant must still get its
 * kitchen and customer slips without visiting settings first.
 */
export function useSlipSettings(): SlipSettings {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const notify = () => setVersion((n) => n + 1);
    listeners.add(notify);

    return () => {
      listeners.delete(notify);
    };
  }, []);

  useEffect(() => {
    let active = true;

    loadSettings().then((value) => {
      if (active) setSettings(value);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const read = (key: string, fallback: boolean): boolean => {
    if (settings === null) return fallback;
    const stored = (settings[key] ?? '').trim();
    return stored === '' ? fallback : stored === '1';
  };

  return {
    kitchen: read(SLIP_KEYS.kitchen, SLIP_DEFAULTS.kitchen),
    customer: read(SLIP_KEYS.customer, SLIP_DEFAULTS.customer),
    delivery: read(SLIP_KEYS.delivery, SLIP_DEFAULTS.delivery),
    loaded: settings !== null,
  };
}

/**
 * The business-day settings (timezone, day start, week start), read from the
 * shared settings cache. Unset values fall back so a restaurant that never
 * touched them behaves exactly as before: no timezone override, midnight day
 * start, week starting Sunday.
 */
export function useBusinessTime(): BusinessTimeSettings {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const notify = () => setVersion((n) => n + 1);
    listeners.add(notify);

    return () => {
      listeners.delete(notify);
    };
  }, []);

  useEffect(() => {
    let active = true;

    loadSettings().then((value) => {
      if (active) setSettings(value);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const read = (key: string): string => (settings?.[key] ?? '').trim();

  const dayStart = read(BUSINESS_TIME_KEYS.dayStart) || DEFAULT_DAY_START;
  const weekRaw = read(BUSINESS_TIME_KEYS.weekStart);

  return {
    timezone: read(BUSINESS_TIME_KEYS.timezone),
    dayStart,
    dayStartMinutes: parseHm(dayStart),
    weekStartDay: /^[0-6]$/.test(weekRaw) ? Number(weekRaw) : 0,
    loaded: settings !== null,
  };
}

/**
 * Customer receipt formatting & font scaling settings.
 * Lets the receipt view adapt between a full detailed receipt and a minimal
 * paper-saving layout, with font scaling between 80% and 120%.
 */
export function useReceiptSettings(): ReceiptSettings {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const notify = () => setVersion((n) => n + 1);
    listeners.add(notify);

    return () => {
      listeners.delete(notify);
    };
  }, []);

  useEffect(() => {
    let active = true;

    loadSettings().then((value) => {
      if (active) setSettings(value);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const rawFormat = (settings?.[RECEIPT_KEYS.format] ?? '').trim().toLowerCase();
  const format: ReceiptFormat = rawFormat === 'minimal' ? 'minimal' : 'detailed';

  let rawScale = (settings?.[RECEIPT_KEYS.fontScale] ?? '').trim();
  if (rawScale && !rawScale.endsWith('%')) {
    rawScale = `${rawScale}%`;
  }
  const validScales: ReceiptFontScale[] = ['80%', '90%', '100%', '110%', '120%'];
  const fontScale: ReceiptFontScale = validScales.includes(rawScale as ReceiptFontScale)
    ? (rawScale as ReceiptFontScale)
    : RECEIPT_DEFAULTS.fontScale;

  const scaleFactor = parseInt(fontScale, 10) / 100;

  return {
    format,
    fontScale,
    isMinimal: format === 'minimal',
    scaleFactor,
    loaded: settings !== null,
  };
}
