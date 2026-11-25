import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Cash Storage & Organization Logic Tests', () => {
  // 1. Payment method to storage category normalization
  const normalizeStorageType = (method) => {
    const m = (method || '').toLowerCase().trim();
    if (m === 'mfs' || m === 'bkash' || m === 'nagad') return 'bkash';
    if (m === 'card') return 'card';
    return 'cash';
  };

  test('normalizes payment method strings to storage categories', () => {
    assert.equal(normalizeStorageType('cash'), 'cash');
    assert.equal(normalizeStorageType('Cash'), 'cash');
    assert.equal(normalizeStorageType('card'), 'card');
    assert.equal(normalizeStorageType('Card'), 'card');
    assert.equal(normalizeStorageType('mfs'), 'bkash');
    assert.equal(normalizeStorageType('bkash'), 'bkash');
    assert.equal(normalizeStorageType('bKash'), 'bkash');
    assert.equal(normalizeStorageType('nagad'), 'bkash');
  });

  // 2. Storage balance aggregation and summary
  test('calculates summary totals across cash, card, and bkash categories', () => {
    const storages = [
      { id: 1, name: 'Register 1 Till', type: 'cash', current_balance: '3500.00' },
      { id: 2, name: 'Register 2 Till', type: 'cash', current_balance: '1500.00' },
      { id: 3, name: 'Main Safe', type: 'cash', current_balance: '10000.00' },
      { id: 4, name: 'Card POS 1', type: 'card', current_balance: '8200.00' },
      { id: 5, name: 'bKash Merchant 017', type: 'bkash', current_balance: '4800.00' },
      { id: 6, name: 'bKash Counter 2', type: 'bkash', current_balance: '2200.00' },
    ];

    const calculateSummary = (list) => {
      let cashTotal = 0;
      let cardTotal = 0;
      let bkashTotal = 0;

      for (const s of list) {
        const val = parseFloat(s.current_balance || 0);
        if (s.type === 'cash') cashTotal += val;
        else if (s.type === 'card') cardTotal += val;
        else if (s.type === 'bkash') bkashTotal += val;
      }

      return {
        cash_total: cashTotal,
        card_total: cardTotal,
        bkash_total: bkashTotal,
        grand_total: cashTotal + cardTotal + bkashTotal,
        storages_count: list.length,
      };
    };

    const summary = calculateSummary(storages);
    assert.equal(summary.cash_total, 15000);
    assert.equal(summary.card_total, 8200);
    assert.equal(summary.bkash_total, 7000);
    assert.equal(summary.grand_total, 30200);
    assert.equal(summary.storages_count, 6);
  });

  // 3. Auto-storage resolution and outlet/location filtering
  test('resolves default matching cash storage by category and location', () => {
    const storages = [
      { id: 10, name: 'Dhanmondi Till', type: 'cash', location_id: 1, is_active: true },
      { id: 20, name: 'Gulshan Till', type: 'cash', location_id: 2, is_active: true },
      { id: 30, name: 'Gulshan Card POS', type: 'card', location_id: 2, is_active: true },
      { id: 40, name: 'Shared bKash Merchant', type: 'bkash', location_id: null, is_active: true },
    ];

    const resolveDefaultStorage = (method, locationId) => {
      const type = normalizeStorageType(method);
      // Location-scoped first
      if (locationId) {
        const match = storages.find(
          (s) => s.is_active && s.type === type && s.location_id === locationId
        );
        if (match) return match;
      }
      // Tenant-wide fallback
      return (
        storages.find((s) => s.is_active && s.type === type && s.location_id === null) ||
        storages.find((s) => s.is_active && s.type === type) ||
        null
      );
    };

    assert.equal(resolveDefaultStorage('cash', 1)?.id, 10);
    assert.equal(resolveDefaultStorage('cash', 2)?.id, 20);
    assert.equal(resolveDefaultStorage('card', 2)?.id, 30);
    assert.equal(resolveDefaultStorage('mfs', 1)?.id, 40);
    assert.equal(resolveDefaultStorage('bkash', 2)?.id, 40);
  });

  // 4. Form validation for Cash Storage creation
  test('validates cash storage form inputs', () => {
    const validateStorage = ({ name, type, opening_balance }) => {
      const errors = [];
      if (!name || !name.trim()) errors.push('Name is required');
      if (!['cash', 'card', 'bkash'].includes(type)) errors.push('Invalid type');
      const numBal = Number(opening_balance);
      if (isNaN(numBal) || numBal < 0) errors.push('Opening balance must be >= 0');
      return { valid: errors.length === 0, errors };
    };

    assert.equal(validateStorage({ name: '', type: 'cash', opening_balance: 0 }).valid, false);
    assert.equal(validateStorage({ name: 'Safe', type: 'bitcoin', opening_balance: 0 }).valid, false);
    assert.equal(validateStorage({ name: 'Safe', type: 'cash', opening_balance: -50 }).valid, false);

    const valid = validateStorage({
      name: 'Counter 1 Till',
      type: 'cash',
      opening_balance: 1000,
    });
    assert.equal(valid.valid, true);
    assert.equal(valid.errors.length, 0);
  });

  // 5. Payment payload includes cash_storage_id
  test('formats payment collection payload with cash_storage_id', () => {
    const formatPaymentPayload = ({ method, note, storageId }) => {
      const payload = {
        payment_method: method,
      };
      if (note && note.trim()) payload.payment_note = note.trim();
      if (storageId) payload.cash_storage_id = Number(storageId);
      return payload;
    };

    const payload = formatPaymentPayload({
      method: 'cash',
      note: 'Customer paid in 1000 note',
      storageId: '10',
    });

    assert.equal(payload.payment_method, 'cash');
    assert.equal(payload.payment_note, 'Customer paid in 1000 note');
    assert.equal(payload.cash_storage_id, 10);
  });
});
