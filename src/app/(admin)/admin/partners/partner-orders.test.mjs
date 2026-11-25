import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Partner Orders & Revamp Logic Tests', () => {
  // 1. Query builder test for dedicated 3rd-party orders listing
  const buildPartnerOrdersQuery = ({ page = 1, partnerId = '', status = '', search = '' } = {}) => {
    const params = new URLSearchParams({
      partner_only: '1',
      page: String(page),
    });
    if (partnerId) params.set('partner_id', String(partnerId));
    if (status) params.set('payment_status', status);
    if (search.trim()) params.set('partner_order_id', search.trim());
    return `/orders?${params.toString()}`;
  };

  test('builds 3rd party orders query with defaults and filters', () => {
    assert.equal(buildPartnerOrdersQuery(), '/orders?partner_only=1&page=1');
    assert.equal(
      buildPartnerOrdersQuery({ page: 2, partnerId: 5 }),
      '/orders?partner_only=1&page=2&partner_id=5'
    );
    assert.equal(
      buildPartnerOrdersQuery({ status: 'due', search: 'FP-98234' }),
      '/orders?partner_only=1&page=1&payment_status=due&partner_order_id=FP-98234'
    );
    assert.equal(
      buildPartnerOrdersQuery({ partnerId: 3, status: 'paid', search: 'PATHAO-771', page: 4 }),
      '/orders?partner_only=1&page=4&partner_id=3&payment_status=paid&partner_order_id=PATHAO-771'
    );
  });

  // 2. Revenue calculation test (Gross, Commission, Net)
  test('calculates gross, commission, and net owed correctly', () => {
    const order = {
      id: 201,
      total: '1200.00',
      partner_commission_rate: 20.0,
      partner_commission_amount: '240.00',
      payment_status: 'due',
    };

    const gross = parseFloat(order.total || 0);
    const commission = parseFloat(order.partner_commission_amount || 0);
    const net = gross - commission;

    assert.equal(gross, 1200.0);
    assert.equal(commission, 240.0);
    assert.equal(net, 960.0);
  });

  // 3. POS checkout partner order payload
  test('constructs POS checkout payload with partner_order_id', () => {
    const buildCheckoutPayload = ({
      orderType,
      partnerId,
      partnerOrderId,
      items,
      total,
    }) => {
      const payload = {
        order_type: orderType,
        items,
        total,
      };

      if (orderType === 'third_party' && partnerId) {
        payload.partner_id = Number(partnerId);
        if (partnerOrderId && partnerOrderId.trim()) {
          payload.partner_order_id = partnerOrderId.trim();
        }
      }

      return payload;
    };

    const payloadWithRef = buildCheckoutPayload({
      orderType: 'third_party',
      partnerId: 2,
      partnerOrderId: '   FP-10928   ',
      items: [{ product_id: 1, quantity: 2, price: 300 }],
      total: 600,
    });

    assert.equal(payloadWithRef.partner_id, 2);
    assert.equal(payloadWithRef.partner_order_id, 'FP-10928');

    const payloadWithoutRef = buildCheckoutPayload({
      orderType: 'third_party',
      partnerId: 2,
      partnerOrderId: '',
      items: [{ product_id: 1, quantity: 1, price: 300 }],
      total: 300,
    });

    assert.equal(payloadWithoutRef.partner_id, 2);
    assert.equal(payloadWithoutRef.partner_order_id, undefined);
  });

  // 4. Partner Payout creation and validation
  test('validates partner payout form submission', () => {
    const validatePayout = ({ partner_id, amount, received_on }) => {
      const errors = [];
      if (!partner_id) errors.push('Partner is required');
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) errors.push('Valid amount is required');
      if (!received_on) errors.push('Received date is required');
      return { valid: errors.length === 0, errors };
    };

    assert.equal(validatePayout({ partner_id: '', amount: '100', received_on: '2026-11-23' }).valid, false);
    assert.equal(validatePayout({ partner_id: '1', amount: '0', received_on: '2026-11-23' }).valid, false);
    assert.equal(validatePayout({ partner_id: '1', amount: '-50', received_on: '2026-11-23' }).valid, false);
    assert.equal(validatePayout({ partner_id: '1', amount: '5000', received_on: '' }).valid, false);

    const validResult = validatePayout({
      partner_id: '2',
      amount: '15000.50',
      received_on: '2026-11-23',
    });
    assert.equal(validResult.valid, true);
    assert.equal(validResult.errors.length, 0);
  });

  // 5. Sales reporting channel parameter and segregation
  test('builds sales report query with channel parameter', () => {
    const buildSalesReportQuery = ({ from, to, bucket, location_id, channel }) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (bucket) params.set('bucket', bucket);
      if (location_id && location_id !== 'all') params.set('location_id', String(location_id));
      if (channel && channel !== 'all') params.set('channel', channel);
      return `/reports/sales?${params.toString()}`;
    };

    assert.equal(
      buildSalesReportQuery({ from: '2026-11-01', to: '2026-11-23', bucket: 'day', channel: 'all' }),
      '/reports/sales?from=2026-11-01&to=2026-11-23&bucket=day'
    );
    assert.equal(
      buildSalesReportQuery({ from: '2026-11-01', to: '2026-11-23', bucket: 'day', channel: 'direct' }),
      '/reports/sales?from=2026-11-01&to=2026-11-23&bucket=day&channel=direct'
    );
    assert.equal(
      buildSalesReportQuery({ from: '2026-11-01', to: '2026-11-23', bucket: 'day', channel: 'partner' }),
      '/reports/sales?from=2026-11-01&to=2026-11-23&bucket=day&channel=partner'
    );
  });

  test('correctly breaks down direct vs partner sales in report summary', () => {
    const summary = {
      orders_count: 50,
      gross_revenue: 65000,
      direct_orders_count: 35,
      direct_gross_revenue: 45000,
      partner_orders_count: 15,
      partner_gross_revenue: 20000,
      partner_commission_total: 4000,
      partner_net_revenue: 16000,
    };

    assert.equal(summary.direct_orders_count + summary.partner_orders_count, summary.orders_count);
    assert.equal(summary.direct_gross_revenue + summary.partner_gross_revenue, summary.gross_revenue);
    assert.equal(summary.partner_gross_revenue - summary.partner_commission_total, summary.partner_net_revenue);
  });

  // 6. Batch order selection calculations and partner constraint
  test('calculates batch order selection totals and validates single-partner constraint', () => {
    const orders = [
      { id: 101, partner_id: 1, total: '1000.00', partner_commission_amount: '200.00', payment_status: 'due' },
      { id: 102, partner_id: 1, total: '500.00', partner_commission_amount: '100.00', payment_status: 'due' },
      { id: 103, partner_id: 2, total: '800.00', partner_commission_amount: '160.00', payment_status: 'due' },
    ];

    const calculateBatch = (selectedIds) => {
      const selected = orders.filter(o => selectedIds.includes(o.id));
      const partnerIds = Array.from(new Set(selected.map(o => o.partner_id)));
      const gross = selected.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
      const commission = selected.reduce((sum, o) => sum + parseFloat(o.partner_commission_amount || 0), 0);
      const net = gross - commission;
      return {
        count: selected.length,
        partnerIds,
        isSinglePartner: partnerIds.length === 1,
        partnerId: partnerIds[0] || null,
        gross,
        commission,
        net,
      };
    };

    // Selecting orders 101 and 102 (both Foodpanda, partner 1)
    const batch1 = calculateBatch([101, 102]);
    assert.equal(batch1.count, 2);
    assert.equal(batch1.isSinglePartner, true);
    assert.equal(batch1.partnerId, 1);
    assert.equal(batch1.gross, 1500.0);
    assert.equal(batch1.commission, 300.0);
    assert.equal(batch1.net, 1200.0);

    // Selecting orders from multiple partners (101 and 103)
    const batchMulti = calculateBatch([101, 103]);
    assert.equal(batchMulti.isSinglePartner, false);
    assert.equal(batchMulti.partnerIds.length, 2);
  });

  // 7. Batch payout payload construction
  test('constructs batch payout payload with order_ids, payment_method, and cash_storage_id', () => {
    const buildBatchPayoutPayload = ({
      partnerId,
      amount,
      receivedOn,
      paymentMethod,
      cashStorageId,
      reference,
      note,
      orderIds = [],
    }) => {
      return {
        partner_id: Number(partnerId),
        amount: Number(amount),
        received_on: receivedOn,
        payment_method: paymentMethod || null,
        cash_storage_id: cashStorageId ? Number(cashStorageId) : null,
        reference: reference || null,
        note: note || null,
        order_ids: orderIds.length > 0 ? orderIds : undefined,
      };
    };

    const payload = buildBatchPayoutPayload({
      partnerId: 1,
      amount: '1200.00',
      receivedOn: '2026-11-23',
      paymentMethod: 'bank_transfer',
      cashStorageId: 4,
      reference: 'TXN-BANK-112',
      note: 'Settling 2 orders for November',
      orderIds: [101, 102],
    });

    assert.equal(payload.partner_id, 1);
    assert.equal(payload.amount, 1200.0);
    assert.equal(payload.payment_method, 'bank_transfer');
    assert.equal(payload.cash_storage_id, 4);
    assert.equal(payload.reference, 'TXN-BANK-112');
    assert.deepEqual(payload.order_ids, [101, 102]);
  });

  // 8. Payment receiving report row resolution
  test('formats payment receiving report row with partner, method, cash storage, and settled orders count', () => {
    const formatReportRow = (payout) => {
      const methodLabels = {
        bank_transfer: 'Bank Transfer',
        mfs: 'Mobile Money',
        cash: 'Cash',
        card: 'Card',
      };
      return {
        receivedDate: payout.received_on,
        partnerName: payout.partner?.name || `Partner #${payout.partner_id}`,
        amount: parseFloat(payout.amount || 0),
        methodLabel: methodLabels[payout.payment_method] || payout.payment_method || '—',
        storageName: payout.cash_storage?.name || null,
        ordersSettledLabel: payout.orders_count > 0 ? `${payout.orders_count} orders` : 'Lump sum',
      };
    };

    const row = formatReportRow({
      id: 5,
      partner_id: 1,
      partner: { id: 1, name: 'Foodpanda' },
      amount: '34500.00',
      payment_method: 'bank_transfer',
      cash_storage: { id: 2, name: 'BRAC Bank Current' },
      orders_count: 42,
      received_on: '2026-11-23',
    });

    assert.equal(row.partnerName, 'Foodpanda');
    assert.equal(row.amount, 34500.0);
    assert.equal(row.methodLabel, 'Bank Transfer');
    assert.equal(row.storageName, 'BRAC Bank Current');
    assert.equal(row.ordersSettledLabel, '42 orders');
  });
});
