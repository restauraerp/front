/**
 * Checks if a given role name represents a delivery driver/rider.
 */
export function isRiderRole(roleName) {
  if (!roleName) return false;
  const normalized = roleName.toLowerCase().trim();
  return (
    normalized === 'rider' ||
    normalized.includes('rider') ||
    normalized.includes('driver') ||
    normalized.includes('delivery')
  );
}

/**
 * Intelligent role filtering with fallback:
 * 1. Primary: Users who hold a rider/driver/delivery role.
 * 2. Fallback: If no users have a delivery role, return all staff users
 *    (excluding customers / super admins) so dispatch operations are never blocked.
 */
export function filterRidersByRole(users) {
  if (!Array.isArray(users) || users.length === 0) {
    return [];
  }

  // 1. Primary: exact or keyword matching for delivery roles
  const dedicatedRiders = users.filter(
    (u) => u.roles && u.roles.some((r) => isRiderRole(r?.name))
  );

  if (dedicatedRiders.length > 0) {
    return dedicatedRiders;
  }

  // 2. Fallback: all staff members (excluding customer/super_admin)
  return users.filter((u) => {
    const roleNames = (u.roles || []).map((r) => r.name?.toLowerCase() || '');
    return !roleNames.includes('customer') && !roleNames.includes('super_admin');
  });
}

/**
 * Filters riders eligible for assignment to an order or branch:
 * - A rider with location_id == null is an all-branch / floating driver
 *   and is eligible for orders from any branch.
 * - A rider with a specific location_id is only eligible for orders
 *   originating from their specific branch.
 */
export function filterRidersForAssignment(params) {
  const { riders, orders, orderId, activeLocationId } = params;

  if (!Array.isArray(riders) || riders.length === 0) {
    return [];
  }

  let targetLocationId = null;

  if (orderId) {
    const selectedOrder = (orders || []).find(
      (o) => o.id.toString() === orderId.toString()
    );
    if (selectedOrder && selectedOrder.location_id) {
      targetLocationId = selectedOrder.location_id;
    }
  }

  if (!targetLocationId && activeLocationId) {
    targetLocationId = activeLocationId;
  }

  return riders.filter((rider) => {
    // If neither the order nor the view is scoped to a branch, any rider qualifies
    if (!targetLocationId) {
      return true;
    }

    // Floating rider (not restricted to a branch) delivers for all branches
    if (rider.location_id === null || rider.location_id === undefined || rider.location_id === '') {
      return true;
    }

    // Branch-locked rider delivers only for their branch
    return rider.location_id.toString() === targetLocationId.toString();
  });
}

/**
 * Formats riders into SearchSelect dropdown options with active delivery counts
 * and clear branch indications.
 */
export function formatRiderOptions(params) {
  const { riders, deliveries } = params;

  if (!Array.isArray(riders)) {
    return [];
  }

  return riders.map((rider) => {
    const activeCount = (deliveries || []).filter(
      (d) =>
        d.rider_id !== null &&
        d.rider_id !== undefined &&
        d.rider_id.toString() === rider.id.toString() &&
        !['Delivered', 'Failed', 'Cancelled'].includes(d.status)
    ).length;

    const statusText = activeCount > 0 ? ` (${activeCount} active)` : '';
    const branchLabel = rider.location?.name || (rider.location_id ? `Branch #${rider.location_id}` : 'All Branches');

    const primaryRole = rider.roles?.[0]?.name;
    const isDedicated = isRiderRole(primaryRole);
    const roleHint = !isDedicated && primaryRole ? ` • ${primaryRole.replace('_', ' ')}` : '';

    return {
      value: rider.id,
      label: rider.name,
      hint: `${branchLabel}${roleHint}${statusText}`,
    };
  });
}
