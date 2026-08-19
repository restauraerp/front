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
let cached: Promise<string[]> | null = null;

function loadPermissions(): Promise<string[]> {
  cached ??= fetchApi('/auth/me')
    .then((res) => (res?.all_permissions as string[]) || [])
    .catch(() => {
      // Not cached as a failure: a dropped request should not leave the whole
      // session convinced it has no permissions until a full reload.
      cached = null;
      return [];
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
}

export function usePermissions(): Permissions {
  const [permissions, setPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;

    loadPermissions().then((perms) => {
      if (active) setPermissions(perms);
    });

    return () => {
      active = false;
    };
  }, []);

  return {
    loaded: permissions !== null,
    can: (permission: string) => (permissions ?? []).includes(permission),
  };
}
