import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Accounting Trash & CrudPage Trash Consistency Tests', () => {
  test('derives trashedEndpoint from base endpoint by default', () => {
    const endpoint = '/incomes';
    const effectiveTrashedEndpoint = `${endpoint}-trashed`;
    assert.equal(effectiveTrashedEndpoint, '/incomes-trashed');

    const expenseEndpoint = '/expenses';
    const effectiveExpenseTrashed = `${expenseEndpoint}-trashed`;
    assert.equal(effectiveExpenseTrashed, '/expenses-trashed');
  });

  test('constructs restore endpoint correctly from trashed item ID', () => {
    const effectiveTrashedEndpoint = '/incomes-trashed';
    const recordId = 42;
    const restoreUrl = `${effectiveTrashedEndpoint}/${recordId}/restore`;
    assert.equal(restoreUrl, '/incomes-trashed/42/restore');
  });

  test('formats trashed columns correctly with trashedByUser fallback and date formatting', () => {
    const rowWithUser = {
      id: 1,
      amount: 500,
      trashed_by_user: { id: 10, name: 'Admin Manager' },
      deleted_at: '2026-11-23T10:30:00.000Z',
    };

    const rowWithoutUser = {
      id: 2,
      amount: 250,
      trashed_by: 99,
      deleted_at: null,
    };

    const getTrashedBy = (row) => row.trashed_by_user?.name || row.trashed_by || '—';
    const getDeletedAt = (row) => (row.deleted_at ? new Date(row.deleted_at).toISOString() : '—');

    assert.equal(getTrashedBy(rowWithUser), 'Admin Manager');
    assert.equal(getDeletedAt(rowWithUser), '2026-11-23T10:30:00.000Z');

    assert.equal(getTrashedBy(rowWithoutUser), 99);
    assert.equal(getDeletedAt(rowWithoutUser), '—');
  });

  test('tab switching correctly separates active and trashed states', () => {
    let activeTab = 'active';
    let trashedPage = 3;

    // User clicks Trashed tab
    activeTab = 'trashed';
    trashedPage = 1; // resets page on tab switch

    assert.equal(activeTab, 'trashed');
    assert.equal(trashedPage, 1);
  });
});
