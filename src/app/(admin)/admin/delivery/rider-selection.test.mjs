import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  filterRidersByRole,
  filterRidersForAssignment,
  formatRiderOptions,
} from './rider-selection.js';

describe('Rider Selection - Baseline Existing Behavior', () => {
  const sampleUsers = [
    { id: 1, name: 'Rider One', roles: [{ name: 'rider' }], location_id: 10 },
    { id: 2, name: 'Chef Mario', roles: [{ name: 'chef' }], location_id: 10 },
    { id: 3, name: 'Floating Rider', roles: [{ name: 'rider' }], location_id: null },
    { id: 4, name: 'Branch 20 Rider', roles: [{ name: 'rider' }], location_id: 20 },
    { id: 5, name: 'No Role User', roles: [], location_id: null },
  ];

  test('filterRidersByRole: strictly filters users with exact "rider" role', () => {
    const riders = filterRidersByRole(sampleUsers);
    assert.equal(riders.length, 3);
    assert.deepEqual(
      riders.map((r) => r.id),
      [1, 3, 4]
    );
  });

  test('filterRidersByRole: returns empty array if no users have rider role', () => {
    const nonRiders = [
      { id: 10, name: 'Admin', roles: [{ name: 'restaurant_admin' }] },
      { id: 11, name: 'Waiter', roles: [{ name: 'waiter' }] },
    ];
    assert.deepEqual(filterRidersByRole(nonRiders), []);
    assert.deepEqual(filterRidersByRole([]), []);
    assert.deepEqual(filterRidersByRole(null), []);
  });

  test('filterRidersForAssignment: matches rider with exact branch of selected order', () => {
    const riders = filterRidersByRole(sampleUsers);
    const orders = [
      { id: 101, location_id: 10 },
      { id: 102, location_id: 20 },
    ];

    const result = filterRidersForAssignment({
      riders,
      orders,
      orderId: 101,
      activeLocationId: null,
    });

    // Only Rider One (location_id: 10) matches in baseline
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 1);
  });

  test('filterRidersForAssignment: baseline BUG demonstration - floating rider (null location) is excluded', () => {
    const riders = filterRidersByRole(sampleUsers);
    const orders = [{ id: 101, location_id: 10 }];

    const result = filterRidersForAssignment({
      riders,
      orders,
      orderId: 101,
      activeLocationId: null,
    });

    // In the baseline, Floating Rider (id: 3) is EXCLUDED because null === 10 is false
    const floatingIncluded = result.some((r) => r.id === 3);
    assert.equal(floatingIncluded, false, 'Baseline strictly rejects null location_id when order has branch');
  });

  test('filterRidersForAssignment: filters by activeLocationId when no orderId specified', () => {
    const riders = filterRidersByRole(sampleUsers);
    const orders = [];

    const result = filterRidersForAssignment({
      riders,
      orders,
      orderId: null,
      activeLocationId: 20,
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].id, 4);
  });

  test('filterRidersForAssignment: returns all riders when neither order branch nor activeLocationId is set', () => {
    const riders = filterRidersByRole(sampleUsers);
    const result = filterRidersForAssignment({
      riders,
      orders: [],
      orderId: null,
      activeLocationId: null,
    });
    assert.equal(result.length, 3);
  });

  test('formatRiderOptions: correctly maps options with active delivery counts', () => {
    const riders = [
      { id: 1, name: 'Rider One', location: { id: 10, name: 'Downtown' } },
      { id: 3, name: 'Floating Rider', location: null },
    ];

    const deliveries = [
      { id: 201, rider_id: 1, status: 'In Transit' },
      { id: 202, rider_id: 1, status: 'Delivered' },
      { id: 203, rider_id: 1, status: 'Failed' },
      { id: 204, rider_id: 3, status: 'Assigned' },
      { id: 205, rider_id: 3, status: 'Picking Up' },
    ];

    const options = formatRiderOptions({ riders, deliveries });

    assert.equal(options.length, 2);
    assert.deepEqual(options[0], {
      value: 1,
      label: 'Rider One',
      hint: 'Downtown (1 active)',
    });
    assert.deepEqual(options[1], {
      value: 3,
      label: 'Floating Rider',
      hint: 'No Branch (2 active)',
    });
  });
});
