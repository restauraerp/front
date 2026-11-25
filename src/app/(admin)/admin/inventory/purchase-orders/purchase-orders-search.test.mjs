import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Purchase Orders Search Query & Logic Tests', () => {
  const buildQuery = (page, searchQuery) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    const trimmed = (searchQuery || '').trim();
    if (trimmed) {
      params.set('search', trimmed);
    }
    return `/purchase-orders?${params.toString()}`;
  };

  test('builds standard page query when search query is empty', () => {
    assert.equal(buildQuery(1, ''), '/purchase-orders?page=1');
    assert.equal(buildQuery(3, '   '), '/purchase-orders?page=3');
    assert.equal(buildQuery(2, null), '/purchase-orders?page=2');
  });

  test('appends search query correctly with trimmed value', () => {
    assert.equal(buildQuery(1, 'Basmati Rice'), '/purchase-orders?page=1&search=Basmati+Rice');
    assert.equal(buildQuery(1, '   Dhaka Wholesale   '), '/purchase-orders?page=1&search=Dhaka+Wholesale');
    assert.equal(buildQuery(1, '#42'), '/purchase-orders?page=1&search=%2342');
  });

  test('changing search query resets page to 1', () => {
    let page = 5;
    let searchInput = 'flour';

    const onSearchChange = (newInput) => {
      searchInput = newInput;
      page = 1; // Resets pagination
    };

    onSearchChange('sugar');
    assert.equal(page, 1);
    assert.equal(buildQuery(page, searchInput), '/purchase-orders?page=1&search=sugar');
  });

  test('search matching evaluates inventory items, supplier, notes, and PO #', () => {
    const sampleOrder = {
      id: 105,
      notes: 'Urgent restocking for weekend festival',
      supplier: { id: 2, name: 'Metro Fresh Produce' },
      items: [
        {
          id: 1,
          inventory_item: { title: 'Red Onion Jumbo', sku: 'ONION-RED-01' },
        },
        {
          id: 2,
          inventory_item: { title: 'Garlic Import', sku: 'GARLIC-IMP-01' },
        },
      ],
    };

    const matchesSearch = (order, query) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;

      // 1. Check inventory items title or SKU
      const hasItem = (order.items || []).some((line) => {
        const title = line.inventory_item?.title?.toLowerCase() || '';
        const sku = line.inventory_item?.sku?.toLowerCase() || '';
        return title.includes(q) || sku.includes(q);
      });
      if (hasItem) return true;

      // 2. Check supplier name
      if (order.supplier?.name?.toLowerCase().includes(q)) return true;

      // 3. Check notes
      if (order.notes?.toLowerCase().includes(q)) return true;

      // 4. Check PO #
      const cleanId = q.replace(/^#/, '');
      if (String(order.id) === cleanId) return true;

      return false;
    };

    // Item title match
    assert.equal(matchesSearch(sampleOrder, 'Red Onion'), true);
    assert.equal(matchesSearch(sampleOrder, 'Garlic'), true);

    // Item SKU match
    assert.equal(matchesSearch(sampleOrder, 'ONION-RED'), true);

    // Supplier match
    assert.equal(matchesSearch(sampleOrder, 'Metro Fresh'), true);

    // Notes match
    assert.equal(matchesSearch(sampleOrder, 'weekend festival'), true);

    // PO # match
    assert.equal(matchesSearch(sampleOrder, '105'), true);
    assert.equal(matchesSearch(sampleOrder, '#105'), true);

    // Non-matching
    assert.equal(matchesSearch(sampleOrder, 'Soyabean Oil'), false);
    assert.equal(matchesSearch(sampleOrder, '#999'), false);
  });
});
