'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export interface OutletSummary {
  id: number;
  name: string | null;
  is_active?: boolean;
}

/**
 * The restaurant's outlets, and whether it has more than one.
 *
 * Most restaurants on this product have exactly one, and every screen that
 * scoped anything by branch still made them choose it: a dropdown with a single
 * option, a filter that could only narrow to everything, a required field on
 * every purchase order with one possible answer. `single` is what those screens
 * check to stop asking.
 *
 * The count is what decides, not the plan. A Business tenant starts with one
 * outlet and opens its second months later, and keying off the tier would leave
 * the pickers hidden with two branches to choose between. Counting means the
 * controls come back by themselves the moment a second outlet is created.
 *
 * Hiding a picker must never mean dropping the value: `only` is the outlet to
 * submit while the control is not on screen. `location_id` is NOT NULL on
 * orders and half a dozen other tables, so a form that hides the field and
 * sends nothing is a 500, not a simplification.
 */
let cached: Promise<OutletSummary[]> | null = null;

function loadLocations(): Promise<OutletSummary[]> {
  cached ??= fetchApi('/locations?nopaginate=1')
    .then((res) => (res?.data ?? res ?? []) as OutletSummary[])
    .catch(() => {
      // Not cached as a failure - one dropped request should not convince the
      // whole session the restaurant has no outlets.
      cached = null;
      return [];
    });

  return cached;
}

/** Forget the cached list - call after creating or removing an outlet. */
export function clearLocationCache(): void {
  cached = null;
}

export interface Locations {
  locations: OutletSummary[];
  /** False until the list arrives, so nothing renders on a guess. */
  loaded: boolean;
  /** Exactly one outlet: every "which branch?" control can go. */
  single: boolean;
  /** That one outlet, for forms to submit while the field is hidden. */
  only: OutletSummary | null;
}

export function useLocations(): Locations {
  const [locations, setLocations] = useState<OutletSummary[] | null>(null);

  useEffect(() => {
    let active = true;

    loadLocations().then((list) => {
      if (active) setLocations(list);
    });

    return () => {
      active = false;
    };
  }, []);

  const list = locations ?? [];

  return {
    locations: list,
    loaded: locations !== null,
    // Deliberately requires the list to have arrived. Before it does, length
    // is 0 and `0 === 1` is false, so a picker stays visible rather than
    // flashing away - but being explicit says that is intended.
    single: locations !== null && list.length === 1,
    only: list.length === 1 ? list[0] : null,
  };
}
