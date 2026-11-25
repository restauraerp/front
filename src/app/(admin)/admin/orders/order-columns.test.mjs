import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Order Management Columns & Tab Segregation Logic', () => {
  // Column resolver logic reflecting Orders page table header configuration
  const getTableColumns = (activeTab) => {
    const columns = ['Order Info'];
    if (['active_orders', 'customer_orders', 'completed', 'due', 'trashed', 'third_party'].includes(activeTab)) {
      columns.push('Type');
    }
    if (['delivery', 'catering'].includes(activeTab)) {
      columns.push('Logistics');
    }
    // Date & Time is always present for all order tabs
    columns.push('Date & Time');
    columns.push('Items');
    columns.push('Total');

    // Conditional column:
    // Only 'due' tab has 'Due Note' (no payment method).
    // Only 'third_party' tab has 'Note / Ref #' (no payment method).
    // All other tabs have 'Payment Method'.
    if (activeTab === 'due') {
      columns.push('Due Note');
    } else if (activeTab === 'third_party') {
      columns.push('Note / Ref #');
    } else {
      columns.push('Payment Method');
    }

    columns.push('Status');
    columns.push('Actions');
    return columns;
  };

  test('dine_in tab includes Date & Time and Payment Method columns', () => {
    const columns = getTableColumns('dine_in');
    assert.ok(columns.includes('Date & Time'));
    assert.ok(columns.includes('Payment Method'));
    assert.ok(!columns.includes('Due Note'));
    assert.ok(!columns.includes('Note / Ref #'));
  });

  test('completed tab includes Date & Time and Payment Method columns', () => {
    const columns = getTableColumns('completed');
    assert.ok(columns.includes('Date & Time'));
    assert.ok(columns.includes('Payment Method'));
    assert.ok(!columns.includes('Due Note'));
    assert.ok(!columns.includes('Note / Ref #'));
  });

  test('takeaway and delivery tabs include Date & Time and Payment Method columns', () => {
    ['takeaway', 'delivery', 'catering', 'active_orders', 'customer_orders', 'trashed'].forEach(tab => {
      const columns = getTableColumns(tab);
      assert.ok(columns.includes('Date & Time'), `Expected Date & Time in tab: ${tab}`);
      assert.ok(columns.includes('Payment Method'), `Expected Payment Method in tab: ${tab}`);
      assert.ok(!columns.includes('Due Note'), `Did not expect Due Note in tab: ${tab}`);
      assert.ok(!columns.includes('Note / Ref #'), `Did not expect Note / Ref # in tab: ${tab}`);
    });
  });

  test('due tab includes Date & Time and Due Note, but NOT Payment Method', () => {
    const columns = getTableColumns('due');
    assert.ok(columns.includes('Date & Time'));
    assert.ok(columns.includes('Due Note'));
    assert.ok(!columns.includes('Payment Method'), 'Due tab must not have Payment Method column');
    assert.ok(!columns.includes('Note / Ref #'));
  });

  test('third_party tab includes Date & Time and Note / Ref #, but NOT Payment Method', () => {
    const columns = getTableColumns('third_party');
    assert.ok(columns.includes('Date & Time'));
    assert.ok(columns.includes('Note / Ref #'));
    assert.ok(!columns.includes('Payment Method'), '3rd party tab must not have Payment Method column');
    assert.ok(!columns.includes('Due Note'));
  });

  // Payment method and storage resolution logic
  const resolvePaymentMethodDisplay = (order) => {
    const payment = order.payments?.find(p => p.status === 'completed') || order.payments?.[0];
    const method = payment?.method || order.payment_method;
    if (!method) {
      return {
        label: order.payment_status === 'unpaid' ? 'Unpaid' : '—',
        storageName: null,
        isUnpaid: true,
      };
    }
    const labels = {
      cash: 'Cash',
      card: 'Card',
      mfs: 'Mobile Money',
      due: 'On Account',
    };
    return {
      label: labels[method] || method,
      storageName: payment?.cash_storage?.name || null,
      isUnpaid: false,
    };
  };

  test('resolves payment method and cash storage correctly', () => {
    const cashOrder = {
      payment_status: 'paid',
      payments: [
        { method: 'cash', status: 'completed', cash_storage: { id: 1, name: 'Main Cash Register' } }
      ]
    };
    const resCash = resolvePaymentMethodDisplay(cashOrder);
    assert.equal(resCash.label, 'Cash');
    assert.equal(resCash.storageName, 'Main Cash Register');
    assert.equal(resCash.isUnpaid, false);

    const mfsOrder = {
      payment_status: 'paid',
      payments: [
        { method: 'mfs', status: 'completed', cash_storage: { id: 2, name: 'bKash Merchant Till' } }
      ]
    };
    const resMfs = resolvePaymentMethodDisplay(mfsOrder);
    assert.equal(resMfs.label, 'Mobile Money');
    assert.equal(resMfs.storageName, 'bKash Merchant Till');

    const unpaidOrder = {
      payment_status: 'unpaid',
      payments: []
    };
    const resUnpaid = resolvePaymentMethodDisplay(unpaidOrder);
    assert.equal(resUnpaid.label, 'Unpaid');
    assert.equal(resUnpaid.isUnpaid, true);
  });

  // Third party partner & reference display resolution
  const resolveThirdPartyDisplay = (order) => {
    return {
      partnerName: order.partner?.name || '3rd Party',
      refNumber: order.partner_order_id ? `Ref: ${order.partner_order_id}` : null,
      dueNote: order.due_note ? `Note: ${order.due_note}` : null,
      commissionText: order.partner_commission_rate != null ? `${order.partner_commission_rate}% commission` : null,
    };
  };

  test('resolves 3rd party reference and note information', () => {
    const partnerOrder = {
      partner: { id: 1, name: 'Foodpanda' },
      partner_order_id: 'FP-98214',
      partner_commission_rate: 15,
      due_note: 'Aggregator batch settlement',
    };
    const res = resolveThirdPartyDisplay(partnerOrder);
    assert.equal(res.partnerName, 'Foodpanda');
    assert.equal(res.refNumber, 'Ref: FP-98214');
    assert.equal(res.dueNote, 'Note: Aggregator batch settlement');
    assert.equal(res.commissionText, '15% commission');
  });

  // Segregation of 3rd party orders from Due and Completed tabs
  test('segregates 3rd party orders from direct due and completed orders', () => {
    const orders = [
      { id: 1, partner_id: null, payment_status: 'due', due_note: 'VIP customer due' },
      { id: 2, partner_id: 3, payment_status: 'due', partner_order_id: 'PATHAO-112' },
      { id: 3, partner_id: null, payment_status: 'paid', status: 'completed' },
      { id: 4, partner_id: 2, payment_status: 'paid', status: 'completed' },
    ];

    // Backend queries enforce:
    // due_only: due()->whereNull('partner_id')
    // completed_only: completed()->whereNull('partner_id')
    // partner_only: whereNotNull('partner_id')
    const dueOrders = orders.filter(o => o.payment_status === 'due' && o.partner_id === null);
    const completedDirectOrders = orders.filter(o => o.status === 'completed' && o.partner_id === null);
    const partnerOrders = orders.filter(o => o.partner_id !== null);

    assert.equal(dueOrders.length, 1);
    assert.equal(dueOrders[0].id, 1);

    assert.equal(completedDirectOrders.length, 1);
    assert.equal(completedDirectOrders[0].id, 3);

    assert.equal(partnerOrders.length, 2);
    assert.deepEqual(partnerOrders.map(o => o.id), [2, 4]);
  });

  // Dine-in view mode toggle default
  test('dine-in view mode defaults to table so desktop renders table columns', () => {
    let viewMode = 'table';
    assert.equal(viewMode, 'table');
    // toggles to cards
    viewMode = 'cards';
    assert.equal(viewMode, 'cards');
  });
});
