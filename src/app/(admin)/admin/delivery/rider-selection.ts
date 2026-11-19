export interface UserRole {
  id?: number | string;
  name: string;
}

export interface RiderUser {
  id: number | string;
  name: string;
  email?: string | null;
  phone?: string | null;
  location_id?: number | string | null;
  location?: {
    id: number | string;
    name: string;
  } | null;
  roles?: UserRole[];
}

export interface DeliveryOrder {
  id: number | string;
  location_id?: number | string | null;
}

export interface DeliveryItem {
  id: number | string;
  rider_id?: number | string | null;
  status: string;
}

export interface RiderOption {
  value: number | string;
  label: string;
  hint: string;
}

/**
 * Baseline filter: extracts users who have the 'rider' role.
 */
export function filterRidersByRole(users: RiderUser[]): RiderUser[] {
  return (users || []).filter(
    (u) => u.roles && u.roles.some((r) => r.name === 'rider')
  );
}

/**
 * Baseline filter: checks rider against order location or active location.
 */
export function filterRidersForAssignment(params: {
  riders: RiderUser[];
  orders: DeliveryOrder[];
  orderId?: string | number | null;
  activeLocationId?: string | number | null;
}): RiderUser[] {
  const { riders, orders, orderId, activeLocationId } = params;

  return (riders || []).filter((rider) => {
    if (orderId) {
      const selectedOrder = (orders || []).find(
        (o) => o.id.toString() === orderId.toString()
      );
      if (selectedOrder && selectedOrder.location_id) {
        return rider.location_id === selectedOrder.location_id;
      }
    } else if (activeLocationId) {
      return rider.location_id === activeLocationId;
    }
    return true;
  });
}

/**
 * Formats riders into SearchSelect dropdown options with active delivery counts.
 */
export function formatRiderOptions(params: {
  riders: RiderUser[];
  deliveries: DeliveryItem[];
}): RiderOption[] {
  const { riders, deliveries } = params;

  return (riders || []).map((rider) => {
    const activeCount = (deliveries || []).filter(
      (d) =>
        d.rider_id === rider.id &&
        !['Delivered', 'Failed', 'Cancelled'].includes(d.status)
    ).length;
    const statusText = activeCount > 0 ? ` (${activeCount} active)` : '';

    return {
      value: rider.id,
      label: rider.name,
      hint: `${rider.location?.name || 'No Branch'}${statusText}`,
    };
  });
}
