'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

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

export const BRANDING_KEYS = {
  name: 'site_name',
  address: 'address',
  phone: 'contact_phone',
  email: 'contact_email',
  currency: 'currency_symbol',
  logo: 'logo_url',
  receiptFooter: 'receipt_footer',
} as const;

export interface Branding {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  logo: string | null;
  receiptFooter: string | null;
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

  return {
    name: read(BRANDING_KEYS.name) ?? FALLBACK.name,
    address: read(BRANDING_KEYS.address),
    phone: read(BRANDING_KEYS.phone),
    email: read(BRANDING_KEYS.email),
    currency: read(BRANDING_KEYS.currency) ?? FALLBACK.currency,
    logo: read(BRANDING_KEYS.logo),
    receiptFooter: read(BRANDING_KEYS.receiptFooter),
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
