import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Logic mirror of getCardBorder in OrdersPage
export const getCardBorder = (status, overdue) => {
  switch (status) {
    case 'cooking':
      return 'border-t-info';
    case 'ready_to_serve':
      return 'border-t-success';
    case 'served':
    case 'packed':
      return 'border-t-primary';
    case 'picked_up':
      return 'border-t-secondary';
    case 'delivered':
    case 'completed':
      return 'border-t-accent';
    case 'cancelled':
    case 'trashed':
      return 'border-t-error';
    case 'pending':
    default:
      return overdue ? 'border-t-error' : 'border-t-warning';
  }
};

// Timing calculation mirror in OrdersPage
export const minutesUntilDue = (order, now) =>
  order.delivery_time ? Math.round((new Date(order.delivery_time).getTime() - now) / 60000) : 0;

export const dueLabel = (minutes) => {
  if (minutes <= 0) return `Overdue by ${Math.abs(minutes)} min`;
  if (minutes < 60) return `Start in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (minutes < 24 * 60) return `Start in ${hours}h${rest ? ` ${rest}m` : ''}`;
  return `Due in ${Math.round(minutes / (24 * 60))} day(s)`;
};

// Stage advance action configuration mirror
export const stageButtonConfig = {
  cooking: { label: 'Start Cooking', color: 'btn-info' },
  ready_to_serve: { label: 'Ready to Serve', color: 'btn-success' },
  served: { label: 'Serve', color: 'btn-primary' },
  packed: { label: 'Pack', color: 'btn-primary' },
  picked_up: { label: 'Picked Up', color: 'btn-secondary' },
  delivered: { label: 'Deliver', color: 'btn-accent' },
};

export const getNextActions = (order) =>
  (order.next_statuses || []).map((status) => ({
    status,
    ...(stageButtonConfig[status] ?? { label: status, color: 'btn-primary' }),
  }));

// Card action availability resolver
export const resolveCardActions = (order, canEditOrder = true) => {
  const actions = getNextActions(order);
  const primaryAction = actions.length > 0 ? actions[0] : null;
  const secondaryStageActions = actions.length > 1 ? actions.slice(1) : [];

  const canCollectDue = order.payment_status === 'due';
  const canPay = !['paid', 'due'].includes(order.payment_status);
  const canEditItems = canEditOrder && order.payment_status !== 'paid';
  const canEditInPos = canEditOrder && order.payment_status !== 'paid';
  const canCancel = canEditOrder && ['pending', 'cooking'].includes(order.status);
  const canShare = Boolean(order.id);

  return {
    primaryAction,
    secondaryStageActions,
    canCollectDue,
    canPay,
    canEditItems,
    canEditInPos,
    canCancel,
    canShare,
  };
};

describe('Kitchen Display Card Styling & Top-Border Logic', () => {
  test('maps cooking status to border-t-info', () => {
    assert.strictEqual(getCardBorder('cooking', false), 'border-t-info');
    assert.strictEqual(getCardBorder('cooking', true), 'border-t-info');
  });

  test('maps ready_to_serve status to border-t-success', () => {
    assert.strictEqual(getCardBorder('ready_to_serve', false), 'border-t-success');
    assert.strictEqual(getCardBorder('ready_to_serve', true), 'border-t-success');
  });

  test('maps served and packed statuses to border-t-primary', () => {
    assert.strictEqual(getCardBorder('served', false), 'border-t-primary');
    assert.strictEqual(getCardBorder('packed', false), 'border-t-primary');
  });

  test('maps picked_up status to border-t-secondary', () => {
    assert.strictEqual(getCardBorder('picked_up', false), 'border-t-secondary');
  });

  test('maps delivered and completed statuses to border-t-accent', () => {
    assert.strictEqual(getCardBorder('delivered', false), 'border-t-accent');
    assert.strictEqual(getCardBorder('completed', false), 'border-t-accent');
  });

  test('maps cancelled and trashed statuses to border-t-error', () => {
    assert.strictEqual(getCardBorder('cancelled', false), 'border-t-error');
    assert.strictEqual(getCardBorder('trashed', false), 'border-t-error');
  });

  test('maps pending status to border-t-error when overdue, border-t-warning when on time', () => {
    assert.strictEqual(getCardBorder('pending', true), 'border-t-error');
    assert.strictEqual(getCardBorder('pending', false), 'border-t-warning');
  });

  test('handles unknown or missing statuses with overdue fallback', () => {
    assert.strictEqual(getCardBorder('unknown_status', false), 'border-t-warning');
    assert.strictEqual(getCardBorder('unknown_status', true), 'border-t-error');
  });
});

describe('Delivery & Schedule Timing Calculation (dueLabel)', () => {
  test('calculates overdue minutes properly', () => {
    const now = new Date('2026-11-25T12:00:00Z').getTime();
    const order = { delivery_time: '2026-11-25T11:45:00Z' }; // 15 mins ago
    const minutes = minutesUntilDue(order, now);
    assert.strictEqual(minutes, -15);
    assert.strictEqual(dueLabel(minutes), 'Overdue by 15 min');
  });

  test('calculates due soon minutes (< 60m)', () => {
    const now = new Date('2026-11-25T12:00:00Z').getTime();
    const order = { delivery_time: '2026-11-25T12:25:00Z' }; // 25 mins from now
    const minutes = minutesUntilDue(order, now);
    assert.strictEqual(minutes, 25);
    assert.strictEqual(dueLabel(minutes), 'Start in 25 min');
  });

  test('calculates hours and minutes (< 24h)', () => {
    const now = new Date('2026-11-25T12:00:00Z').getTime();
    const order = { delivery_time: '2026-11-25T14:35:00Z' }; // 2h 35m
    const minutes = minutesUntilDue(order, now);
    assert.strictEqual(dueLabel(minutes), 'Start in 2h 35m');
  });

  test('calculates days for far future dates (>= 24h)', () => {
    const now = new Date('2026-11-25T12:00:00Z').getTime();
    const order = { delivery_time: '2026-11-27T12:00:00Z' }; // 2 days
    const minutes = minutesUntilDue(order, now);
    assert.strictEqual(dueLabel(minutes), 'Due in 2 day(s)');
  });
});

describe('Primary Stage Button & Action Availability on Order Cards', () => {
  test('correctly resolves primary cooking action button for pending orders', () => {
    const order = {
      id: 101,
      status: 'pending',
      next_statuses: ['cooking'],
      payment_status: 'unpaid',
    };
    const actions = resolveCardActions(order, true);
    assert.ok(actions.primaryAction);
    assert.strictEqual(actions.primaryAction.status, 'cooking');
    assert.strictEqual(actions.primaryAction.label, 'Start Cooking');
    assert.strictEqual(actions.primaryAction.color, 'btn-info');
    assert.strictEqual(actions.secondaryStageActions.length, 0);
    assert.strictEqual(actions.canPay, true);
    assert.strictEqual(actions.canCollectDue, false);
    assert.strictEqual(actions.canEditItems, true);
    assert.strictEqual(actions.canEditInPos, true);
    assert.strictEqual(actions.canCancel, true);
    assert.strictEqual(actions.canShare, true);
  });

  test('correctly resolves primary ready_to_serve action button for cooking orders', () => {
    const order = {
      id: 102,
      status: 'cooking',
      next_statuses: ['ready_to_serve'],
      payment_status: 'paid',
    };
    const actions = resolveCardActions(order, true);
    assert.ok(actions.primaryAction);
    assert.strictEqual(actions.primaryAction.status, 'ready_to_serve');
    assert.strictEqual(actions.primaryAction.label, 'Ready to Serve');
    assert.strictEqual(actions.primaryAction.color, 'btn-success');
    assert.strictEqual(actions.canPay, false); // already paid
    assert.strictEqual(actions.canEditItems, false); // paid cannot edit
    assert.strictEqual(actions.canEditInPos, false);
    assert.strictEqual(actions.canCancel, true); // cooking can still be cancelled
  });

  test('correctly handles due orders with Collect Due action', () => {
    const order = {
      id: 103,
      status: 'served',
      next_statuses: [],
      payment_status: 'due',
      amount_outstanding: 450.00,
    };
    const actions = resolveCardActions(order, true);
    assert.strictEqual(actions.primaryAction, null);
    assert.strictEqual(actions.canCollectDue, true);
    assert.strictEqual(actions.canPay, false); // due orders use Settle Due modal, not standard pay modal
    assert.strictEqual(actions.canCancel, false); // served orders cannot be cancelled
  });

  test('disallows editing or cancellation when user lacks permission', () => {
    const order = {
      id: 104,
      status: 'pending',
      next_statuses: ['cooking'],
      payment_status: 'unpaid',
    };
    const actions = resolveCardActions(order, false); // canEditOrder = false
    assert.strictEqual(actions.canEditItems, false);
    assert.strictEqual(actions.canEditInPos, false);
    assert.strictEqual(actions.canCancel, false);
    assert.strictEqual(actions.canPay, true);
  });
});

describe('Inline Quantity Editing State Transitions', () => {
  const initialItems = [
    { id: 1, quantity: 2, product: { name: 'Burger', price: 150 } },
    { id: 2, quantity: 1, product: { name: 'Fries', price: 80 } },
  ];

  test('incrementing quantity increases item quantity', () => {
    const modified = initialItems.map(i => i.id === 1 ? { ...i, quantity: i.quantity + 1 } : i);
    assert.strictEqual(modified.find(i => i.id === 1).quantity, 3);
  });

  test('decrementing quantity is bounded at zero', () => {
    let items = initialItems.map(i => i.id === 2 ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i);
    assert.strictEqual(items.find(i => i.id === 2).quantity, 0);

    // Decrementing again does not go negative
    items = items.map(i => i.id === 2 ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i);
    assert.strictEqual(items.find(i => i.id === 2).quantity, 0);
  });

  test('removing an item filters it from edited items list', () => {
    const filtered = initialItems.filter(i => i.id !== 1);
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, 2);
  });
});

describe('Orders View Mode Preference & Default Behavior', () => {
  const resolveInitialViewMode = (savedPreference) => {
    if (savedPreference === 'table' || savedPreference === 'cards') {
      return savedPreference;
    }
    return 'cards'; // Default to cards view
  };

  test('defaults to cards view mode when no preference is saved', () => {
    assert.strictEqual(resolveInitialViewMode(null), 'cards');
    assert.strictEqual(resolveInitialViewMode(undefined), 'cards');
    assert.strictEqual(resolveInitialViewMode(''), 'cards');
  });

  test('honors saved table preference from localStorage', () => {
    assert.strictEqual(resolveInitialViewMode('table'), 'table');
  });

  test('honors saved cards preference from localStorage', () => {
    assert.strictEqual(resolveInitialViewMode('cards'), 'cards');
  });

  test('falls back to cards for invalid saved preference', () => {
    assert.strictEqual(resolveInitialViewMode('grid_view_invalid'), 'cards');
  });
});
