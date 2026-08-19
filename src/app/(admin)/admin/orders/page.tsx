'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import DiscountInput from '../pos/components/DiscountInput';
import { ChefHat, CheckCircle, XCircle, RefreshCw, Package, Truck, DollarSign, CreditCard, Banknote, Smartphone, Printer, Tag, Clock, MapPin, Pencil, X, Plus, Minus, Eye, Trash2, RotateCcw, AlertTriangle, Share2 } from 'lucide-react';
import { tenantKey } from '@/lib/tenant';

/** The fields the row actions read off an order. */
interface OrderRow {
  id: number;
  total?: string | number;
  payment_status?: string | null;
  amount_outstanding?: number;
  customer?: { phone?: string | null } | null;
}

/**
 * How a payment state reads on screen.
 *
 * Three states, not two: "due" is money the restaurant agreed to collect later
 * and is chasing, which is a different thing from "unpaid" - a customer who has
 * not settled up yet and is still standing there. Showing both as red "Unpaid"
 * loses exactly the distinction the Due tab exists to make.
 */
const paymentBadge = (status?: string | null): { className: string; label: string } => {
  if (status === 'paid') return { className: 'badge-success text-white', label: 'Paid' };
  if (status === 'due') return { className: 'badge-warning', label: 'Due' };
  return { className: 'badge-error text-white', label: 'Unpaid' };
};

const statusConfig: Record<string, { badge: string; label: string }> = {
  pending: { badge: 'badge-warning', label: 'Pending' },
  cooking: { badge: 'badge-info', label: 'Cooking' },
  ready_to_serve: { badge: 'badge-success', label: 'Ready to Serve' },
  served: { badge: 'badge-primary', label: 'Served' },
  packed: { badge: 'badge-primary', label: 'Packed' },
  picked_up: { badge: 'badge-secondary', label: 'Picked Up By Delivery' },
  delivered: { badge: 'badge-accent', label: 'Delivered' },
  cancelled: { badge: 'badge-error', label: 'Cancelled' },
  paid: { badge: 'badge-neutral', label: 'Paid' },
};

const stageButton: Record<string, { label: string; icon: any; color: string }> = {
  cooking: { label: 'Start Cooking', icon: ChefHat, color: 'btn-info' },
  ready_to_serve: { label: 'Ready to Serve', icon: CheckCircle, color: 'btn-success' },
  served: { label: 'Serve', icon: CheckCircle, color: 'btn-primary' },
  packed: { label: 'Pack', icon: Package, color: 'btn-primary' },
  picked_up: { label: 'Picked Up', icon: Truck, color: 'btn-secondary' },
  delivered: { label: 'Deliver', icon: CheckCircle, color: 'btn-accent' },
};

const getNextActions = (order: any) =>
  (order.next_statuses || []).map((status: string) => ({
    status,
    ...(stageButton[status] ?? { label: status, icon: CheckCircle, color: 'btn-primary' }),
  }));

const FINISHED = ['served', 'delivered'];
const isFinished = (order: any) =>
  FINISHED.includes(order.status) || (order.status === 'packed' && order.order_type === 'takeaway');

const LiveTimer = ({ placedAt }: { placedAt: string }) => {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(placedAt).getTime()) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [placedAt]);
  return <span className="font-mono text-xs opacity-80 flex items-center gap-1"><Clock size={12}/> {elapsed}</span>;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('dine_in');
  const [sortDineIn, setSortDineIn] = useState('time');
  const [sortOthers, setSortOthers] = useState('time');

  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  // Why this payment looks the way it does - the bKash transaction id, the
  // card's last four, which guest settled a shared table.
  const [paymentNote, setPaymentNote] = useState('');
  // Reconciling the till against a mobile-money statement means looking at one
  // method at a time.
  const [completedSort, setCompletedSort] = useState('recent');
  const [completedMethod, setCompletedMethod] = useState('');
  const [processing, setProcessing] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);

  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  // Owed money. Server-paginated like Completed rather than filtered from the
  // active list, because due orders are deliberately no longer in it - see
  // Order::scopeActive() in core-api.
  const [dueOrders, setDueOrders] = useState<any[]>([]);
  const [dueLoading, setDueLoading] = useState(true);
  const [duePage, setDuePage] = useState(1);
  const [dueTotal, setDueTotal] = useState(0);
  const [dueTotalPages, setDueTotalPages] = useState(1);
  const [dueReloadKey, setDueReloadKey] = useState(0);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedTotalPages, setCompletedTotalPages] = useState(1);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedLoading, setCompletedLoading] = useState(true);
  const [completedReloadKey, setCompletedReloadKey] = useState(0);

  // Edit mode state: tracks which order is being edited and its item quantities
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editedItems, setEditedItems] = useState<{ id: number; quantity: number; product?: any }[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  // Detail modal state
  const [detailOrder, setDetailOrder] = useState<any>(null);
  // Which order is having its link minted, so the button can show progress.
  const [sharingId, setSharingId] = useState<number | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'trash' | 'restore';
    orderId: number;
  } | null>(null);
  const [confirmProcessing, setConfirmProcessing] = useState(false);

  // Admin role + trashed orders
  const [isAdmin, setIsAdmin] = useState(false);
  const [trashedOrders, setTrashedOrders] = useState<any[]>([]);
  const [trashedPage, setTrashedPage] = useState(1);
  const [trashedTotalPages, setTrashedTotalPages] = useState(1);
  const [trashedTotal, setTrashedTotal] = useState(0);
  const [trashedLoading, setTrashedLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    fetchApi('/auth/me').then(res => {
      const roles = res?.roles?.map((r: any) => r.name) || [];
      if (roles.includes('super_admin') || roles.includes('restaurant_admin')) {
        setIsAdmin(true);
      }
    }).catch(console.error);
    fetchApi('/discounts').then(res => setDiscounts(res.data || res || [])).catch(console.error);
    fetchApi('/tax-rules').then(res => {
      const rules = res?.data || res || [];
      setTaxRate(rules.filter((r: any) => r.is_active).reduce((sum: number, r: any) => sum + Number(r.percentage || 0), 0));
    }).catch(console.error);
    fetchApi('/locations').then(res => {
      const locs = res.data || res || [];
      setLocations(locs);

      let savedLoc = null;
      if (typeof window !== 'undefined') {
        savedLoc = localStorage.getItem(tenantKey('restora_active_location_id'));
      }

      if (savedLoc && locs.some((l: any) => l.id === Number(savedLoc))) {
        setActiveLocationId(Number(savedLoc));
      } else if (locs.length > 0) {
        setActiveLocationId(locs[0].id);
        if (typeof window !== 'undefined') {
          localStorage.setItem(tenantKey('restora_active_location_id'), locs[0].id.toString());
        }
      }
    }).catch(console.error);

    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const res = await fetchApi('/orders?nopaginate=1&active_only=1');
      setOrders(res.data || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'due') return;

    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams({ due_only: '1', page: String(duePage) });
        if (activeLocationId) params.set('location_id', String(activeLocationId));

        const res = await fetchApi(`/orders?${params.toString()}`);
        if (cancelled) return;

        setDueOrders(res.data || []);
        setDueTotalPages(res.last_page || 1);
        setDueTotal(res.total ?? 0);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setDueLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeTab, duePage, activeLocationId, dueReloadKey]);

  useEffect(() => {
    if (activeTab !== 'completed') return;

    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams({ completed_only: '1', page: String(completedPage) });
        if (activeLocationId) params.set('location_id', String(activeLocationId));
        if (completedSort === 'payment_method') params.set('sort', 'payment_method');
        if (completedMethod) params.set('payment_method', completedMethod);

        const res = await fetchApi(`/orders?${params.toString()}`);
        if (cancelled) return;

        setCompletedOrders(res.data || []);
        setCompletedTotalPages(res.last_page || 1);
        setCompletedTotal(res.total ?? 0);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setCompletedLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeTab, completedPage, activeLocationId, completedReloadKey, completedSort, completedMethod]);

  const [trashedReloadKey, setTrashedReloadKey] = useState(0);

  useEffect(() => {
    if (activeTab !== 'trashed' || !isAdmin) return;

    let cancelled = false;
    setTrashedLoading(true);

    (async () => {
      try {
        const params = new URLSearchParams({ page: String(trashedPage) });
        if (activeLocationId) params.set('location_id', String(activeLocationId));

        const res = await fetchApi(`/orders-trashed?${params.toString()}`);
        if (cancelled) return;

        setTrashedOrders(res.data || []);
        setTrashedTotalPages(res.last_page || 1);
        setTrashedTotal(res.total ?? 0);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setTrashedLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeTab, trashedPage, activeLocationId, isAdmin, trashedReloadKey]);

  const handleTrashOrder = (orderId: number) => {
    setConfirmModal({ type: 'trash', orderId });
    (document.getElementById('confirm_modal') as HTMLDialogElement)?.showModal();
  };

  const handleRestoreOrder = (orderId: number) => {
    setConfirmModal({ type: 'restore', orderId });
    (document.getElementById('confirm_modal') as HTMLDialogElement)?.showModal();
  };

  const executeConfirmAction = async () => {
    if (!confirmModal) return;
    setConfirmProcessing(true);
    try {
      if (confirmModal.type === 'trash') {
        await fetchApi(`/orders/${confirmModal.orderId}/trash`, { method: 'POST' });
        loadOrders();
        setCompletedReloadKey(k => k + 1);
      } else {
        await fetchApi(`/orders-trashed/${confirmModal.orderId}/restore`, { method: 'POST' });
        setTrashedReloadKey(k => k + 1);
        loadOrders();
        setCompletedReloadKey(k => k + 1);
      }
      (document.getElementById('confirm_modal') as HTMLDialogElement)?.close();
      setConfirmModal(null);
    } catch {
      alert(confirmModal.type === 'trash' ? 'Failed to trash order' : 'Failed to restore order');
    } finally {
      setConfirmProcessing(false);
    }
  };

  const handleUpdateStatus = async (order: any, newStatus: string) => {
    if (newStatus === 'pay_modal') {
      setPaymentMethod('cash');
      setPaymentOrder(order);
      const existingDiscount = order.discount_id ? discounts.find(d => d.id === order.discount_id) : null;
      setAppliedDiscount(existingDiscount || null);
      (document.getElementById('payment_modal') as HTMLDialogElement)?.showModal();
      return;
    }
    try {
      await fetchApi(`/orders/${order.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      loadOrders();
    } catch { alert('Failed to update order status'); }
  };

  /**
   * Sends the customer their invoice over WhatsApp.
   *
   * The API mints a signed, expiring link to a public invoice page - no file is
   * generated and nothing is stored. A phone on the order preselects the chat;
   * without one WhatsApp asks the sender who to send it to, which is the right
   * fallback for a walk-in whose number was never taken.
   */
  /**
   * Puts an order on account. The note is where the arrangement goes - a room
   * number, a company account, who authorised it - and the API insists on both
   * it and a customer, because a debt nobody is named on cannot be collected.
   */
  const handleMarkDue = async (order: OrderRow) => {
    const note = prompt(
      `Put order #${order.id} on account?\n\nWhat is it owed against? (room number, company account, who agreed to it)`,
    );

    if (note === null) return;

    try {
      await fetchApi(`/orders/${order.id}/due`, {
        method: 'POST',
        body: JSON.stringify({ due_note: note }),
      });
      setDetailOrder(null);
      loadOrders();
      setDueReloadKey(k => k + 1);
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not put this order on account.'));
    }
  };

  /** Records money collected against a due order, in part or in full. */
  const handleSettle = async (order: OrderRow) => {
    const outstanding = Number(order.amount_outstanding ?? order.total ?? 0);
    const amount = prompt(
      `Settle order #${order.id}\n\n৳${outstanding.toFixed(2)} outstanding. How much is being paid now?`,
      outstanding.toFixed(2),
    );

    if (amount === null) return;

    const method = prompt('Paid by? (cash, card, bkash, nagad…)', 'cash');
    if (method === null) return;

    const note = prompt('Reference or note (optional) — transaction id, who paid', '') ?? '';

    try {
      await fetchApi(`/orders/${order.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({ amount, method, note: note || null }),
      });
      setDetailOrder(null);
      setDueReloadKey(k => k + 1);
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not record this payment.'));
    }
  };

  const handleShareInvoice = async (order: OrderRow) => {
    setSharingId(order.id);
    try {
      const res = await fetchApi(`/orders/${order.id}/invoice-link`, { method: 'POST' });

      const total = Number(order.total || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
      const message =
        `Here is your invoice for order #${order.id} — ৳${total}.\n${res.url}`;

      // From the API, not from the row: wa.me will not resolve a national-form
      // number, and rows written before phone canonicalisation still hold one.
      // An order with no customer sends no number at all, and WhatsApp asks the
      // sender who to send it to - the right fallback for a walk-in.
      const phone = res.customer_phone ?? '';

      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer',
      );
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not create a share link for this invoice.'));
    } finally {
      setSharingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Cancel this order?')) {
      try {
        await fetchApi(`/orders/${id}`, { method: 'DELETE' });
        loadOrders();
      } catch { alert('Failed to cancel order'); }
    }
  };

  const startEdit = (order: any) => {
    setEditingOrderId(order.id);
    setEditedItems((order.items || []).map((item: any) => ({
      id: item.id,
      quantity: item.quantity ?? item.qty ?? 1,
      product: item.product,
    })));
  };

  const cancelEdit = () => {
    setEditingOrderId(null);
    setEditedItems([]);
  };

  const saveEdit = async (orderId: number) => {
    setEditSaving(true);
    try {
      await Promise.all(
        editedItems.map(item =>
          item.quantity > 0
            ? fetchApi(`/order-items/${item.id}`, { method: 'PUT', body: JSON.stringify({ quantity: item.quantity }) })
            : fetchApi(`/order-items/${item.id}`, { method: 'DELETE' })
        )
      );
      cancelEdit();
      loadOrders();
    } catch {
      alert('Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const modalSubtotal = paymentOrder ? parseFloat(paymentOrder.subtotal) : 0;
  const modalDiscountAmt = appliedDiscount
    ? (appliedDiscount.discount_type === 'percentage' ? modalSubtotal * (parseFloat(appliedDiscount.value || '0') / 100) : parseFloat(appliedDiscount.value || '0'))
    : 0;
  const modalAfterDiscount = modalSubtotal - modalDiscountAmt;
  const modalTax = Number((modalAfterDiscount * (taxRate / 100)).toFixed(2));
  const modalDelivery = paymentOrder ? parseFloat(paymentOrder.delivery_charge || '0') : 0;
  const modalTotal = modalAfterDiscount + modalTax + modalDelivery;

  const submitPayment = async () => {
    if (!paymentOrder) return;
    setProcessing(true);
    try {
      await fetchApi(`/orders/${paymentOrder.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          payment_method: paymentMethod, payment_note: paymentNote || null,
          discount_id: appliedDiscount?.id || null,
          discount_amount: modalDiscountAmt.toFixed(2), delivery_charge: modalDelivery.toFixed(2),
          tax_amount: modalTax.toFixed(2), total: modalTotal.toFixed(2)
        })
      });
      (document.getElementById('payment_modal') as HTMLDialogElement)?.close();
      setPaymentOrder(null);
      setPaymentNote('');
      loadOrders();
    } catch {
      alert('Failed to process payment');
    } finally { setProcessing(false); }
  };

  const renderActions = (order: any) => {
    const actions = getNextActions(order);
    const isEditing = editingOrderId === order.id;

    return (
      <div className="flex gap-1 flex-wrap mt-3 pt-3 border-t border-base-200">
        {!isEditing && actions.map((action: any) => {
          const Icon = action.icon;
          return (
            <button key={action.status} className={`btn btn-xs gap-1 ${action.color}`} onClick={() => handleUpdateStatus(order, action.status)}>
              <Icon size={12} /> {action.label}
            </button>
          );
        })}
        {!isEditing && order.payment_status !== 'paid' && (
          <button className="btn btn-xs btn-success gap-1" onClick={() => handleUpdateStatus(order, 'pay_modal')}>
            <DollarSign size={12} /> Pay
          </button>
        )}
        {!isEditing && order.payment_status !== 'paid' && (
          <button className="btn btn-xs btn-outline gap-1" onClick={() => window.location.href = `/admin/pos?edit=${order.id}`}>
            <Pencil size={12} /> Edit in POS
          </button>
        )}
        {!isEditing && ['pending', 'cooking'].includes(order.status) && (
          <button className="btn btn-xs btn-error btn-outline gap-1" onClick={() => handleDelete(order.id)}>
            <XCircle size={12} /> Cancel
          </button>
        )}
        {!isEditing && (
          <div className="ml-auto flex gap-1">
            <button className="btn btn-xs btn-ghost border border-base-300 text-info hover:bg-info/10" onClick={() => window.open(`/kitchen-print/${order.id}`, '_blank')} title="Chef Slip">
              <ChefHat size={12} />
            </button>
            <button className="btn btn-xs btn-ghost border border-base-300" onClick={() => window.open(`/receipt/${order.id}`, '_blank')} title="Receipt">
              <Printer size={12} />
            </button>
          </div>
        )}
        {isEditing && (
          <>
            <button className="btn btn-xs btn-primary gap-1" onClick={() => saveEdit(order.id)} disabled={editSaving}>
              {editSaving ? <span className="loading loading-spinner loading-xs" /> : null} Save
            </button>
            <button className="btn btn-xs btn-ghost gap-1" onClick={cancelEdit}>
              Cancel
            </button>
          </>
        )}
      </div>
    );
  };

  const renderOrderCard = (order: any) => {
    const s = statusConfig[order.status] || { badge: 'badge-ghost', label: order.status || 'Pending' };
    const showLogistics = ['delivery', 'catering'].includes(order.order_type);
    const isEditing = editingOrderId === order.id;
    const displayItems = isEditing ? editedItems : (order.items || []);

    return (
      <div key={order.id} className="bg-base-100 border border-base-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="font-extrabold text-lg text-primary mb-0.5">
              {order.table?.name || (order.order_type ? order.order_type.replace('_', ' ').toUpperCase() : 'NO TABLE')}
            </div>
            <div className="text-xs text-base-content/60">Order #{order.id} • {order.customer?.name || 'Walk-in'}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`badge ${s.badge} badge-sm font-bold shadow-sm`}>{s.label}</span>
            <span className={`badge ${paymentBadge(order.payment_status).className} badge-sm font-bold shadow-sm`}>
              {paymentBadge(order.payment_status).label}
            </span>
          </div>
        </div>

        {showLogistics && (
          <div className="mb-3 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
            <div className="text-xs font-semibold mb-1 flex items-center gap-1">
              <Clock size={12} className="text-primary"/>
              {order.delivery_time ? new Date(order.delivery_time).toLocaleString() : 'ASAP'}
            </div>
            <div className="text-[10px] opacity-80 flex items-start gap-1">
              <MapPin size={12} className="mt-0.5 text-error flex-shrink-0" />
              <span className="line-clamp-2">{order.delivery_address || 'No address provided'}</span>
            </div>
            {order.latitude && order.longitude && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`} target="_blank" className="text-[10px] text-blue-500 hover:underline mt-1 inline-block">
                View on Maps
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-3 bg-base-200/50 p-2 rounded-lg">
          <LiveTimer placedAt={order.created_at} />
          <span className="font-bold text-sm">৳{order.total}</span>
        </div>

        {/* Items list — tall enough to show ≥3 rows before scrolling */}
        <div className="flex-1 overflow-y-auto mb-1 pr-1 text-sm space-y-1" style={{ maxHeight: '192px' }}>
          {displayItems.map((item: any) => {
            const product = item.product ?? {};
            const imgUrl = product.images?.[0]?.url;
            const needsCooking = product.needs_cooking;
            const qty = isEditing ? item.quantity : (item.quantity ?? item.qty ?? '?');

            return (
              <div key={item.id} className="flex items-center gap-2 text-base-content/80 bg-base-100 p-1 rounded-md border border-base-200 shadow-sm">
                <div className="w-8 h-8 rounded overflow-hidden bg-base-200 flex-shrink-0 flex items-center justify-center">
                  {imgUrl ? (
                    <img src={`/storage/${imgUrl}`} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-base-content/30">{(product.name || '?').substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="truncate text-xs font-semibold">{product.name || `Item #${item.product_id}`}</span>
                    {needsCooking && <span title="Needs cooking"><ChefHat size={11} className="text-amber-500 flex-shrink-0" /></span>}
                  </div>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditedItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i))}
                      className="btn btn-xs btn-ghost px-1"
                    ><Minus size={10} /></button>
                    <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => setEditedItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}
                      className="btn btn-xs btn-ghost px-1"
                    ><Plus size={10} /></button>
                    <button
                      onClick={() => setEditedItems(prev => prev.filter(i => i.id !== item.id))}
                      className="btn btn-xs btn-ghost text-error px-1"
                    ><X size={10} /></button>
                  </div>
                ) : (
                  <span className="badge badge-ghost badge-sm font-bold flex-shrink-0">×{qty}</span>
                )}
              </div>
            );
          })}
        </div>

        {activeTab === 'trashed' ? (
          <div className="flex gap-1 flex-wrap mt-3 pt-3 border-t border-base-200">
            <button className="btn btn-xs btn-ghost border border-base-300" title="View Details" onClick={() => setDetailOrder(order)}>
              <Eye size={12} /> View
            </button>
            <div className="ml-auto">
              <button className="btn btn-xs btn-success btn-outline gap-1" title="Restore Order" onClick={() => handleRestoreOrder(order.id)}>
                <RotateCcw size={12} /> Restore
              </button>
            </div>
          </div>
        ) : activeTab === 'completed' ? (
          <div className="flex gap-1 flex-wrap mt-3 pt-3 border-t border-base-200">
            <button className="btn btn-xs btn-ghost border border-base-300 text-info hover:bg-info/10" onClick={() => window.open(`/kitchen-print/${order.id}`, '_blank')} title="Chef Slip">
              <ChefHat size={12} />
            </button>
            <button className="btn btn-xs btn-ghost border border-base-300" onClick={() => window.open(`/receipt/${order.id}`, '_blank')} title="Receipt">
              <Printer size={12} />
            </button>
            <button className="btn btn-xs btn-ghost border border-base-300" title="View Details" onClick={() => setDetailOrder(order)}>
              <Eye size={12} />
            </button>
            {isAdmin && (
              <div className="ml-auto">
                <button className="btn btn-xs btn-error btn-outline gap-1" title="Trash Order" onClick={() => handleTrashOrder(order.id)}>
                  <Trash2 size={12} /> Trash
                </button>
              </div>
            )}
          </div>
        ) : (
          renderActions(order)
        )}
      </div>
    );
  };

  const filteredOrders = useMemo(() => {
    if (activeTab === 'due') return dueOrders;
    if (activeTab === 'completed') return completedOrders;
    if (activeTab === 'trashed') return trashedOrders;

    let current = orders.filter(o => {
      if (activeLocationId && o.location_id !== activeLocationId) return false;
      if (activeTab === 'active_orders') return true;
      const isCompleted = isFinished(o) && o.payment_status === 'paid';
      return o.order_type === activeTab && !isCompleted;
    });

    if (activeTab === 'dine_in') {
      current.sort((a, b) => {
        if (sortDineIn === 'table') return (a.table?.name || '').localeCompare(b.table?.name || '');
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    } else {
      current.sort((a, b) => {
        if (sortOthers === 'delivery_time' && a.delivery_time && b.delivery_time) {
          return new Date(a.delivery_time).getTime() - new Date(b.delivery_time).getTime();
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }
    return current;
  }, [orders, completedOrders, dueOrders, trashedOrders, activeTab, sortDineIn, sortOthers, activeLocationId]);

  const tabLabels: Record<string, string> = {
    active_orders: 'Active Orders',
    dine_in: 'Dine In',
    takeaway: 'Takeaway',
    delivery: 'Delivery',
    catering: 'Catering',
    due: 'Due',
    completed: 'Completed',
    ...(isAdmin ? { trashed: 'Trashed' } : {}),
  };

  const tabCounts = useMemo(() => {
    const active = orders.filter(o => activeLocationId ? o.location_id === activeLocationId : true);
    const notComplete = active.filter(o => !(isFinished(o) && o.payment_status === 'paid'));
    return {
      active_orders: notComplete.length,
      dine_in: notComplete.filter(o => o.order_type === 'dine_in').length,
      takeaway: notComplete.filter(o => o.order_type === 'takeaway').length,
      delivery: notComplete.filter(o => o.order_type === 'delivery').length,
      catering: notComplete.filter(o => o.order_type === 'catering').length,
    };
  }, [orders, activeLocationId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Order Management</h1>
          {locations.length > 0 && (
            <select
              value={activeLocationId || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setActiveLocationId(id);
                setCompletedPage(1);
                if (typeof window !== 'undefined') localStorage.setItem(tenantKey('restora_active_location_id'), id.toString());
              }}
              className="select select-sm select-bordered"
              style={{ fontWeight: 600, color: '#4b5563' }}
            >
              <option value="" disabled>Select Location</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>📍 {loc.name}</option>
              ))}
            </select>
          )}
        </div>
        <button
          className="btn btn-ghost btn-sm gap-2 self-start md:self-auto"
          onClick={() => (activeTab === 'completed' ? setCompletedReloadKey(k => k + 1) : activeTab === 'due' ? setDueReloadKey(k => k + 1) : activeTab === 'trashed' ? setTrashedReloadKey(k => k + 1) : loadOrders())}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="tabs tabs-boxed bg-base-100 border border-base-200 p-1 font-semibold flex-nowrap overflow-x-auto justify-start hide-scrollbar">
        {Object.entries(tabLabels).map(([key, label]) => {
          const count = key !== 'completed' && key !== 'trashed' ? (tabCounts as any)[key] : null;
          return (
            <a key={key} className={`tab tab-sm md:tab-md lg:tab-lg whitespace-nowrap gap-1.5 ${activeTab === key ? 'tab-active' : ''}`} onClick={() => setActiveTab(key)}>
              {label}
              {count !== null && count > 0 && (
                <span className={`badge badge-xs font-bold ${activeTab === key ? 'badge-primary-content bg-white/30 text-white' : 'badge-neutral'}`}>{count}</span>
              )}
            </a>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
          <h2 className="text-lg font-bold">
            {tabLabels[activeTab] || activeTab} Orders
            {activeTab === 'completed' && completedTotal > 0 && (
              <span className="ml-2 text-sm font-normal text-base-content/50">({completedTotal.toLocaleString()})</span>
            )}
            {activeTab === 'due' && dueTotal > 0 && (
              <span className="ml-2 text-sm font-normal text-base-content/50">({dueTotal.toLocaleString()})</span>
            )}
            {activeTab === 'trashed' && trashedTotal > 0 && (
              <span className="ml-2 text-sm font-normal text-base-content/50">({trashedTotal.toLocaleString()})</span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {activeTab === 'completed' ? (
              <>
                {/* Reconciling the till against a bKash or card statement means
                    looking at one method at a time, and grouping the rest. */}
                <span className="text-base-content/60">Paid by:</span>
                <select
                  className="select select-bordered select-sm"
                  value={completedMethod}
                  onChange={e => { setCompletedMethod(e.target.value); setCompletedPage(1); }}
                  aria-label="Filter by payment method"
                >
                  <option value="">Any method</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mfs">Mobile money</option>
                  <option value="due">On account</option>
                </select>
                <select
                  className="select select-bordered select-sm"
                  value={completedSort}
                  onChange={e => { setCompletedSort(e.target.value); setCompletedPage(1); }}
                  aria-label="Sort completed orders"
                >
                  <option value="recent">Newest first</option>
                  <option value="payment_method">Group by payment method</option>
                </select>
              </>
            ) : activeTab === 'due' || activeTab === 'trashed' ? (
              <span className="text-base-content/60">Newest first</span>
            ) : (
              <>
                <span className="text-base-content/60">Sort by:</span>
                {activeTab === 'dine_in' ? (
                  <select className="select select-bordered select-sm" value={sortDineIn} onChange={e => setSortDineIn(e.target.value)}>
                    <option value="time">Placement Time</option>
                    <option value="table">Table Number</option>
                  </select>
                ) : (
                  <select className="select select-bordered select-sm" value={sortOthers} onChange={e => setSortOthers(e.target.value)}>
                    <option value="time">Placement Time</option>
                    <option value="delivery_time">Delivery/Event Time</option>
                  </select>
                )}
              </>
            )}
          </div>
        </div>

        {(activeTab === 'completed' ? completedLoading : activeTab === 'due' ? dueLoading : activeTab === 'trashed' ? trashedLoading : loading) ? (
          <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-base-content/40 bg-base-200/50 rounded-xl border border-dashed border-base-300">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p>
              {activeTab === 'completed'
                ? 'No completed orders yet.'
                : activeTab === 'due'
                ? 'Nothing is owed. Orders put on account appear here until they are settled.'
                : activeTab === 'trashed'
                ? 'No trashed orders.'
                : `No active ${tabLabels[activeTab]?.toLowerCase() || activeTab} orders.`}
            </p>
          </div>
        ) : (
          activeTab === 'dine_in' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOrders.map(order => renderOrderCard(order))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:hidden gap-4">
                {filteredOrders.map(order => renderOrderCard(order))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Order Info</th>
                      {['active_orders', 'completed', 'due', 'trashed'].includes(activeTab) && <th>Type</th>}
                      {['delivery', 'catering'].includes(activeTab) && <th>Logistics</th>}
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => {
                      const s = statusConfig[order.status] || { badge: 'badge-ghost', label: order.status || 'Pending' };
                      return (
                        <tr key={order.id} className="hover">
                          <td>
                            <div className="font-bold">#{order.id}</div>
                            <div className="text-xs opacity-70">Placed: {new Date(order.created_at).toLocaleTimeString()}</div>
                            {order.customer && <div className="text-xs text-info mt-1 font-semibold">{order.customer.name}</div>}
                          </td>
                          {['active_orders', 'completed', 'due', 'trashed'].includes(activeTab) && (
                            <td className="font-medium text-base-content/80">{tabLabels[order.order_type] || order.order_type?.replace('_', ' ')}</td>
                          )}
                          {['delivery', 'catering'].includes(activeTab) && (
                            <td className="max-w-xs">
                              <div className="text-sm font-semibold mb-1 flex items-center gap-1">
                                <Clock size={12} className="text-primary"/>
                                {order.delivery_time ? new Date(order.delivery_time).toLocaleString() : 'ASAP'}
                              </div>
                              <div className="text-xs opacity-80 flex items-start gap-1">
                                <MapPin size={12} className="mt-0.5 text-error flex-shrink-0" />
                                <span className="line-clamp-2">{order.delivery_address || 'No address provided'}</span>
                              </div>
                              {order.latitude && order.longitude && (
                                <a href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`} target="_blank" className="text-[10px] text-blue-500 hover:underline mt-1 inline-block">
                                  View on Maps
                                </a>
                              )}
                            </td>
                          )}
                          <td>
                            <div className="space-y-0.5 text-xs max-w-[180px]">
                              {(order.items || []).map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1">
                                  <span className="badge badge-ghost badge-xs">×{item.quantity ?? item.qty}</span>
                                  <span className="truncate">{item.product?.name || `#${item.product_id}`}</span>
                                  {item.product?.needs_cooking && <ChefHat size={10} className="text-amber-500 flex-shrink-0" />}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="font-bold text-primary">৳{order.total}</td>
                          <td>
                            <div className="flex flex-col gap-1">
                              <span className={`badge badge-sm ${s.badge}`}>{s.label}</span>
                              <span className={`badge badge-sm ${paymentBadge(order.payment_status).className}`}>
                                {paymentBadge(order.payment_status).label}
                              </span>
                            </div>
                          </td>
                          <td className="align-middle">
                            {activeTab === 'trashed' ? (
                              <div className="flex items-center gap-1">
                                <button
                                  className="btn btn-xs btn-ghost border border-base-300"
                                  title="View Details"
                                  onClick={() => setDetailOrder(order)}
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  className="btn btn-xs btn-success btn-outline"
                                  title="Restore Order"
                                  onClick={() => handleRestoreOrder(order.id)}
                                >
                                  <RotateCcw size={14} />
                                </button>
                              </div>
                            ) : activeTab === 'completed' ? (
                              <div className="flex items-center gap-1">
                                <button
                                  className="btn btn-xs btn-ghost border border-base-300 text-info hover:bg-info/10"
                                  title="Chef Slip"
                                  onClick={() => window.open(`/kitchen-print/${order.id}`, '_blank')}
                                >
                                  <ChefHat size={14} />
                                </button>
                                <button
                                  className="btn btn-xs btn-ghost border border-base-300"
                                  title="Receipt"
                                  onClick={() => window.open(`/receipt/${order.id}`, '_blank')}
                                >
                                  <Printer size={14} />
                                </button>
                                <button
                                  className="btn btn-xs btn-ghost border border-base-300"
                                  title="View Details"
                                  onClick={() => setDetailOrder(order)}
                                >
                                  <Eye size={14} />
                                </button>
                                {isAdmin && (
                                  <button
                                    className="btn btn-xs btn-error btn-outline"
                                    title="Trash Order"
                                    onClick={() => handleTrashOrder(order.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              renderActions(order)
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {activeTab === 'completed' && completedTotalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="join">
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setCompletedPage(p => Math.max(1, p - 1))}
                      disabled={completedPage === 1 || completedLoading}
                    >«</button>
                    <button className="join-item btn btn-sm bg-base-100 cursor-default">
                      Page {completedPage} of {completedTotalPages}
                    </button>
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setCompletedPage(p => Math.min(completedTotalPages, p + 1))}
                      disabled={completedPage === completedTotalPages || completedLoading}
                    >»</button>
                  </div>
                </div>
              )}

              {activeTab === 'due' && dueTotalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="join">
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setDuePage(p => Math.max(1, p - 1))}
                      disabled={duePage === 1 || dueLoading}
                    >«</button>
                    <button className="join-item btn btn-sm bg-base-100 cursor-default">
                      Page {duePage} of {dueTotalPages}
                    </button>
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setDuePage(p => Math.min(dueTotalPages, p + 1))}
                      disabled={duePage === dueTotalPages || dueLoading}
                    >»</button>
                  </div>
                </div>
              )}

              {activeTab === 'trashed' && trashedTotalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="join">
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setTrashedPage(p => Math.max(1, p - 1))}
                      disabled={trashedPage === 1 || trashedLoading}
                    >«</button>
                    <button className="join-item btn btn-sm bg-base-100 cursor-default">
                      Page {trashedPage} of {trashedTotalPages}
                    </button>
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setTrashedPage(p => Math.min(trashedTotalPages, p + 1))}
                      disabled={trashedPage === trashedTotalPages || trashedLoading}
                    >»</button>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </Card>

      {/* Payment modal */}
      <dialog id="payment_modal" className="modal">
        <div className="modal-box p-0 overflow-hidden max-w-md bg-base-100">
          <div className="bg-gradient-to-r from-primary to-secondary p-6 text-primary-content text-center relative">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-white" onClick={() => (document.getElementById('payment_modal') as HTMLDialogElement)?.close()}>✕</button>
            <h3 className="font-bold text-xl mb-1 flex items-center justify-center gap-2">
              <DollarSign size={24} /> Complete Payment
            </h3>
            {paymentOrder && <p className="opacity-80 text-sm">Order #{paymentOrder.id}</p>}
          </div>

          <div className="p-6">
            {paymentOrder && (
              <div className="bg-base-200/50 border border-base-300 p-5 rounded-2xl mb-5 text-center shadow-inner">
                <p className="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-1">Amount Due</p>
                <p className="text-4xl font-extrabold text-base-content">৳{modalTotal.toFixed(2)}</p>
                <div className="mt-4 pt-3 border-t border-base-300/50 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-base-content/60 px-2">
                  <span>Sub: ৳{modalSubtotal.toFixed(2)}</span>
                  {modalDiscountAmt > 0 && <span className="text-success font-semibold">-৳{modalDiscountAmt.toFixed(2)}</span>}
                  <span>Tax: ৳{modalTax.toFixed(2)}</span>
                  {modalDelivery > 0 && <span>Del: ৳{modalDelivery.toFixed(2)}</span>}
                </div>
              </div>
            )}

            <div className="mb-6 bg-base-100 p-4 rounded-xl border border-base-200 shadow-sm">
              <label className="label px-0 pt-0 pb-2 flex items-center gap-2"><Tag size={14} className="text-primary" /><span className="label-text font-bold text-base-content/80">Apply Coupon</span></label>
              <DiscountInput discounts={discounts} appliedDiscount={appliedDiscount} onApply={setAppliedDiscount} subtotal={modalSubtotal} />
            </div>

            <div className="mb-8">
              <label className="label px-0 pt-0"><span className="label-text font-bold text-base-content/80">Select Payment Method</span></label>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setPaymentMethod('cash')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${paymentMethod === 'cash' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-base-200 bg-base-100 hover:border-primary/30 hover:bg-base-200'}`}>
                  <Banknote size={28} className="mb-2" /><span className="font-semibold text-sm">Cash</span>
                </button>
                <button onClick={() => setPaymentMethod('card')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${paymentMethod === 'card' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-base-200 bg-base-100 hover:border-primary/30 hover:bg-base-200'}`}>
                  <CreditCard size={28} className="mb-2" /><span className="font-semibold text-sm">Card</span>
                </button>
                <button onClick={() => setPaymentMethod('mfs')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${paymentMethod === 'mfs' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-base-200 bg-base-100 hover:border-primary/30 hover:bg-base-200'}`}>
                  <Smartphone size={28} className="mb-2" /><span className="font-semibold text-sm">MFS</span>
                </button>
              </div>
            </div>

            <div className="form-control w-full mb-4">
              <label className="label py-1">
                <span className="label-text text-sm">Reference or note (optional)</span>
              </label>
              <input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder={paymentMethod === 'mfs' ? 'e.g. bKash TrxID BKS8891' : paymentMethod === 'card' ? 'e.g. Visa ending 4421' : 'e.g. paid by the host'}
                className="input input-bordered w-full"
                aria-label="Payment note"
              />
            </div>

            <button className="btn btn-primary w-full btn-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" onClick={submitPayment} disabled={processing}>
              {processing ? <span className="loading loading-spinner"></span> : `Confirm ৳${modalTotal.toFixed(2)}`}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Order details modal (completed orders) */}
      {detailOrder && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Order #{detailOrder.id} Details</h3>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setDetailOrder(null)}>✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 bg-base-200/50 p-3 rounded-lg">
                <div><span className="opacity-60">Status:</span> <span className="font-semibold capitalize">{detailOrder.status}</span></div>
                <div><span className="opacity-60">Payment:</span> <span className={`font-semibold ${detailOrder.payment_status === 'paid' ? 'text-success' : detailOrder.payment_status === 'due' ? 'text-warning' : 'text-error'}`}>{paymentBadge(detailOrder.payment_status).label}</span></div>
                {detailOrder.payments?.[0]?.note && (
                  <div className="col-span-2"><span className="opacity-60">Payment note:</span> <span className="font-semibold">{detailOrder.payments[0].note}</span></div>
                )}
                {detailOrder.payment_status === 'due' && detailOrder.due_note && (
                  <div className="col-span-2"><span className="opacity-60">On account:</span> <span className="font-semibold">{detailOrder.due_note}</span></div>
                )}
                <div><span className="opacity-60">Type:</span> <span className="font-semibold">{tabLabels[detailOrder.order_type] || detailOrder.order_type?.replace('_', ' ')}</span></div>
                <div><span className="opacity-60">Customer:</span> <span className="font-semibold">{detailOrder.customer?.name || 'Walk-in'}</span></div>
                {detailOrder.table && <div><span className="opacity-60">Table:</span> <span className="font-semibold">{detailOrder.table.name}</span></div>}
                <div><span className="opacity-60">Date:</span> <span className="font-semibold">{new Date(detailOrder.created_at).toLocaleString()}</span></div>
              </div>
              <div>
                <p className="font-semibold mb-2">Items</p>
                <div className="space-y-1">
                  {(detailOrder.items || []).map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-base-200/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-ghost badge-sm">×{item.quantity ?? item.qty}</span>
                        <span>{item.product?.name || `Product #${item.product_id}`}</span>
                        {item.product?.needs_cooking && <ChefHat size={12} className="text-amber-500" />}
                      </div>
                      <span className="font-semibold">৳{(parseFloat(item.price) * (item.quantity ?? item.qty ?? 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between"><span className="opacity-70">Subtotal</span><span>৳{parseFloat(detailOrder.subtotal || 0).toFixed(2)}</span></div>
                {parseFloat(detailOrder.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-success"><span>Discount</span><span>-৳{parseFloat(detailOrder.discount_amount).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between"><span className="opacity-70">Tax</span><span>৳{parseFloat(detailOrder.tax_amount || 0).toFixed(2)}</span></div>
                {parseFloat(detailOrder.delivery_charge || 0) > 0 && (
                  <div className="flex justify-between"><span className="opacity-70">Delivery</span><span>৳{parseFloat(detailOrder.delivery_charge).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">৳{parseFloat(detailOrder.total || 0).toFixed(2)}</span></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button className="btn btn-sm btn-ghost flex-1 gap-1" onClick={() => window.open(`/kitchen-print/${detailOrder.id}`, '_blank')}>
                  <ChefHat size={14} /> Chef Slip
                </button>
                <button className="btn btn-sm btn-ghost flex-1 gap-1" onClick={() => window.open(`/receipt/${detailOrder.id}`, '_blank')}>
                  <Printer size={14} /> Receipt
                </button>
                {detailOrder.payment_status === 'due' ? (
                  <button
                    className="btn btn-sm btn-ghost flex-1 gap-1 text-warning"
                    onClick={() => handleSettle(detailOrder)}
                    title="Record money collected against this order"
                  >
                    <Banknote size={14} /> Settle
                  </button>
                ) : detailOrder.payment_status !== 'paid' ? (
                  <button
                    className="btn btn-sm btn-ghost flex-1 gap-1 text-warning"
                    onClick={() => handleMarkDue(detailOrder)}
                    title="Let this order leave unpaid, to be collected later"
                  >
                    <Clock size={14} /> On account
                  </button>
                ) : null}
                <button
                  className="btn btn-sm btn-ghost flex-1 gap-1 text-success"
                  onClick={() => handleShareInvoice(detailOrder)}
                  disabled={sharingId === detailOrder.id}
                  title="Send this invoice to the customer on WhatsApp"
                >
                  {sharingId === detailOrder.id
                    ? <span className="loading loading-spinner loading-xs" />
                    : <Share2 size={14} />} Share
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDetailOrder(null)} />
        </dialog>
      )}

      {/* Trash/Restore confirmation modal */}
      <dialog id="confirm_modal" className="modal">
        <div className="modal-box max-w-sm">
          <div className={`flex items-center gap-3 mb-4 ${confirmModal?.type === 'trash' ? 'text-error' : 'text-success'}`}>
            {confirmModal?.type === 'trash' ? <AlertTriangle size={24} /> : <RotateCcw size={24} />}
            <h3 className="font-bold text-lg text-base-content">
              {confirmModal?.type === 'trash' ? 'Trash Order' : 'Restore Order'}
            </h3>
          </div>
          <p className="text-base-content/70">
            {confirmModal?.type === 'trash'
              ? `Are you sure you want to trash order #${confirmModal?.orderId}? It will be excluded from all reports, profit/loss calculations, and statistics.`
              : `Are you sure you want to restore order #${confirmModal?.orderId}? It will be included in all reports and calculations again.`}
          </p>
          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => {
                (document.getElementById('confirm_modal') as HTMLDialogElement)?.close();
                setConfirmModal(null);
              }}
              disabled={confirmProcessing}
            >
              Cancel
            </button>
            <button
              className={`btn ${confirmModal?.type === 'trash' ? 'btn-error' : 'btn-success'}`}
              onClick={executeConfirmAction}
              disabled={confirmProcessing}
            >
              {confirmProcessing
                ? <span className="loading loading-spinner loading-sm" />
                : confirmModal?.type === 'trash' ? 'Trash' : 'Restore'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setConfirmModal(null)}>close</button>
        </form>
      </dialog>
    </div>
  );
}
