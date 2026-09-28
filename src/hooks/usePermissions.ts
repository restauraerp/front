'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

/**
 * What the signed-in user is allowed to do, for hiding things they are not.
 *
 * The sidebar in `(admin)/layout.tsx` gates whole modules on one permission
 * each - `/admin/crm` on `view_crm`. That is too coarse now that a tier can
 * hold part of a module: a Starter restaurant gets `view_crm` for its customer
 * list, and the old check would light up Reservations and Loyalty alongside it,
 * both of which answer 403. A card that leads only to a refusal is worse than
 * no card.
 *
 * The response is shared across every component that asks. Without that, each
 * card on a dashboard fires its own /auth/me on mount - five identical
 * requests to answer one question - and they resolve out of order.
 */
type Entitlements = {
  permissions: string[];
  /**
   * The restaurant's modules (its custom package's or its tier's), or null
   * from an API too old to send them - treated as "everything", since the
   * server still refuses what the restaurant does not have.
   */
  modules: string[] | null;
};

let cached: Promise<Entitlements> | null = null;

function loadPermissions(): Promise<Entitlements> {
  cached ??= fetchApi('/auth/me')
    .then((res) => ({
      permissions: (res?.all_permissions as string[]) || [],
      modules: Array.isArray(res?.modules) ? (res.modules as string[]) : null,
    }))
    .catch(() => {
      // Not cached as a failure: a dropped request should not leave the whole
      // session convinced it has no permissions until a full reload.
      cached = null;
      return { permissions: [], modules: null };
    });

  return cached;
}

/** Forget the cached answer - call after anything that changes entitlements. */
export function clearPermissionCache(): void {
  cached = null;
}

export interface Permissions {
  /** False until /auth/me answers, so nothing flashes before it is known. */
  loaded: boolean;
  can: (permission: string) => boolean;
  /**
   * Whether the restaurant has a module. True until /auth/me answers, so a
   * screen does not flash an option away for the restaurants that have it.
   */
  hasModule: (module: string) => boolean;
}

export function usePermissions(): Permissions {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  useEffect(() => {
    let active = true;

    loadPermissions().then((loaded) => {
      if (active) setEntitlements(loaded);
    });

    return () => {
      active = false;
    };
  }, []);

  return {
    loaded: entitlements !== null,
    can: (permission: string) => (entitlements?.permissions ?? []).includes(permission),
    hasModule: (module: string) => entitlements?.modules == null || entitlements.modules.includes(module),
  };
}
