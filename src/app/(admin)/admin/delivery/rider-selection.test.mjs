import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  isRiderRole,
  hasDeliverPermission,
  filterRidersByRole,
  filterRidersForAssignment,
  formatRiderOptions,
} from './rider-selection.js';

describe('Rider Selection - Comprehensive Feature & Edge Case Tests', () => {
  const sampleUsers = [
    { id: 1, name: 'Faisal (Rider)', roles: [{ name: 'rider' }], location_id: null }, // floating driver like Mr Dough
    { id: 2, name: 'Rakib (Rider)', roles: [{ name: 'rider' }], location_id: null },
    { id: 3, name: 'Branch 10 Driver', roles: [{ name: 'Delivery Guy' }], location_id: 10 },
    { id: 4, name: 'Branch 20 Rider', roles: [{ name: 'driver' }], location_id: 20 },
    { id: 5, name: 'Chef Mario', roles: [{ name: 'chef' }], location_id: 10 },
    { id: 6, name: 'Waiter John', roles: [{ name: 'waiter' }], location_id: 10 },
    { id: 7, name: 'Customer Bob', roles: [{ name: 'customer' }], location_id: null },
    { id: 8, name: 'Super Admin', roles: [{ name: 'super_admin' }], location_id: null },
    // User with explicit can_deliver permission
    { id: 9, name: 'Staff with Toggle', roles: [{ name: 'waiter' }], can_deliver: true, location_id: null },
    // User with role holding deliver_orders permission
    { id: 10, name: 'Staff with Role Perm', roles: [{ name: 'custom_courier', permissions: [{ name: 'deliver_orders' }] }], location_id: null },
    // User with direct permission
    { id: 11, name: 'Staff with Direct Perm', roles: [{ name: 'waiter' }], permissions: [{ name: 'deliver_orders' }], location_id: null },
  ];

  describe('isRiderRole()', () => {
    test('identifies exact and variations of rider/driver/delivery roles', () => {
      assert.equal(isRiderRole('rider'), true);
      assert.equal(isRiderRole('Rider'), true);
      assert.equal(isRiderRole('delivery_driver'), true);
      assert.equal(isRiderRole('Fast Delivery'), true);
      assert.equal(isRiderRole('Head Driver'), true);
      assert.equal(isRiderRole('chef'), false);
      assert.equal(isRiderRole('waiter'), false);
      assert.equal(isRiderRole(''), false);
      assert.equal(isRiderRole(null), false);
      assert.equal(isRiderRole(undefined), false);
    });
  });

  describe('hasDeliverPermission()', () => {
    test('returns true for user with can_deliver: true', () => {
      assert.equal(hasDeliverPermission({ id: 101, name: 'Driver', can_deliver: true }), true);
    });

    test('returns true for user with direct deliver_orders permission', () => {
      assert.equal(hasDeliverPermission({ id: 102, name: 'Staff', permissions: [{ name: 'deliver_orders' }] }), true);
    });

    test('returns true for user whose role has deliver_orders permission', () => {
      assert.equal(
        hasDeliverPermission({
          id: 103,
          name: 'Staff',
          roles: [{ name: 'custom_role', permissions: [{ name: 'deliver_orders' }] }],
        }),
        true
      );
    });

    test('returns true for user with rider role name', () => {
      assert.equal(hasDeliverPermission({ id: 104, name: 'Staff', roles: [{ name: 'rider' }] }), true);
    });

    test('returns false for user without delivery permission or rider role', () => {
      assert.equal(
        hasDeliverPermission({
          id: 105,
          name: 'Waiter',
          can_deliver: false,
          roles: [{ name: 'waiter', permissions: [{ name: 'view_pos' }] }],
        }),
        false
      );
      assert.equal(hasDeliverPermission(null), false);
      assert.equal(hasDeliverPermission(undefined), false);
    });
  });

  describe('filterRidersByRole()', () => {
    test('primary matching: picks users with delivery permission (direct, toggle, role) or rider role', () => {
      const riders = filterRidersByRole(sampleUsers);
      // Faisal (1), Rakib (2), Branch 10 Driver (3), Branch 20 Rider (4),
      // Staff with Toggle (9), Staff with Role Perm (10), Staff with Direct Perm (11)
      assert.equal(riders.length, 7);
      assert.deepEqual(
        riders.map((r) => r.id),
        [1, 2, 3, 4, 9, 10, 11]
      );
    });

    test('fallback matching: when NO dedicated riders exist, falls back to active staff (excludes customers/super_admin)', () => {
      const staffWithoutRider = [
        { id: 101, name: 'Chef Gordon', roles: [{ name: 'chef' }] },
        { id: 102, name: 'Waiter Alice', roles: [{ name: 'waiter' }] },
        { id: 103, name: 'Customer Bob', roles: [{ name: 'customer' }] },
        { id: 104, name: 'Super Admin', roles: [{ name: 'super_admin' }] },
      ];

      const fallbackStaff = filterRidersByRole(staffWithoutRider);
      assert.equal(fallbackStaff.length, 2);
      assert.deepEqual(
        fallbackStaff.map((s) => s.id),
        [101, 102]
      );
    });

    test('handles empty or non-array inputs gracefully', () => {
      assert.deepEqual(filterRidersByRole([]), []);
      assert.deepEqual(filterRidersByRole(null), []);
      assert.deepEqual(filterRidersByRole(undefined), []);
    });
  });

  describe('filterRidersForAssignment()', () => {
    const riders = filterRidersByRole(sampleUsers);
    const orders = [
      { id: 501, location_id: 10 },
      { id: 502, location_id: 20 },
      { id: 503, location_id: null },
    ];

    test('SOLVED: floating riders (location_id: null) match orders for Branch 10', () => {
      const matches = filterRidersForAssignment({
        riders,
        orders,
        orderId: 501, // Order from Branch 10
        activeLocationId: null,
      });

      // Faisal (null), Rakib (null), Branch 10 Driver (10), Staff 9 (null), Staff 10 (null), Staff 11 (null)
      assert.equal(matches.length, 6);
      assert.deepEqual(
        matches.map((r) => r.id),
        [1, 2, 3, 9, 10, 11]
      );
    });

    test('SOLVED: floating riders (location_id: null) match orders for Branch 20', () => {
      const matches = filterRidersForAssignment({
        riders,
        orders,
        orderId: 502, // Order from Branch 20
        activeLocationId: null,
      });

      // Faisal (null), Rakib (null), Branch 20 Rider (20), Staff 9 (null), Staff 10 (null), Staff 11 (null)
      assert.equal(matches.length, 6);
      assert.deepEqual(
        matches.map((r) => r.id),
        [1, 2, 4, 9, 10, 11]
      );
    });

    test('Branch-specific rider from Branch 10 DOES NOT leak into Branch 20', () => {
      const matches = filterRidersForAssignment({
        riders,
        orders,
        orderId: 502, // Order from Branch 20
        activeLocationId: null,
      });

      const branch10RiderPresent = matches.some((r) => r.id === 3);
      assert.equal(branch10RiderPresent, false);
    });

    test('matches by activeLocationId when order has no branch or orderId not provided', () => {
      const matches = filterRidersForAssignment({
        riders,
        orders: [],
        orderId: null,
        activeLocationId: 10,
      });

      assert.equal(matches.length, 6);
      assert.deepEqual(
        matches.map((r) => r.id),
        [1, 2, 3, 9, 10, 11]
      );
    });

    test('returns all riders when neither order nor activeLocationId is set', () => {
      const matches = filterRidersForAssignment({
        riders,
        orders: [],
        orderId: null,
        activeLocationId: null,
      });

      assert.equal(matches.length, 7);
    });

    test('returns empty array when riders is empty or invalid', () => {
      assert.deepEqual(filterRidersForAssignment({ riders: [] }), []);
      assert.deepEqual(filterRidersForAssignment({ riders: null }), []);
    });
  });

  describe('formatRiderOptions()', () => {
    const riders = [
      { id: 1, name: 'Faisal', location_id: null, roles: [{ name: 'rider' }] },
      { id: 3, name: 'Branch 10 Driver', location_id: 10, location: { name: 'Main Outlet' }, roles: [{ name: 'rider' }] },
      { id: 5, name: 'Chef Mario', location_id: 10, location: { name: 'Main Outlet' }, roles: [{ name: 'chef' }] },
    ];

    const deliveries = [
      { id: 901, rider_id: 1, status: 'In Transit' },
      { id: 902, rider_id: 1, status: 'Assigned' },
      { id: 903, rider_id: 1, status: 'Delivered' }, // finished, not counted
      { id: 904, rider_id: 3, status: 'Picking Up' },
    ];

    test('formats options displaying "All Branches" for floating riders and active counts', () => {
      const options = formatRiderOptions({ riders, deliveries });

      assert.equal(options.length, 3);

      assert.deepEqual(options[0], {
        value: 1,
        label: 'Faisal',
        hint: 'All Branches (2 active)',
      });

      assert.deepEqual(options[1], {
        value: 3,
        label: 'Branch 10 Driver',
        hint: 'Main Outlet (1 active)',
      });

      // For fallback staff, includes their role in the hint
      assert.deepEqual(options[2], {
        value: 5,
        label: 'Chef Mario',
        hint: 'Main Outlet • chef',
      });
    });

    test('returns empty array for invalid input', () => {
      assert.deepEqual(formatRiderOptions({ riders: null, deliveries: [] }), []);
    });
  });
});
