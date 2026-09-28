'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList, Phone, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { readTrackedOrders, writeTrackedOrders } from './trackedOrders';

type CustomerOrder = {
  id: number;
  token_number: number | null;
  order_type: string;
  status: string;
  status_label: string;
  finished: boolean;
  paid: boolean;
  placed_at: string | null;
  location: { name: string; phone: string | null } | null;
  items: { name: string; qty: number; total: number }[];
  subtotal: number;
  tax_amount: number;
  delivery_charge: number;
  total: number;
};

/** How often an unfinished order is re-checked while the list is open. */
const REFRESH_MS = 20_000;

const STATUS_TONE: Record<string, string> = {
  pending: 'badge-info',
  cooking: 'badge-warning',
  ready_to_serve: 'badge-success',
  packed: 'badge-success',
  picked_up: 'badge-primary',
  delivered: 'badge-neutral',
  served: 'badge-neutral',
  cancelled: 'badge-error',
};

/**
 * The customer's own orders at this restaurant, live.
 *
 * Reads the ids and tracking keys this browser kept (see trackedOrders.ts) and
 * asks the API for their current state. Anything the API no longer recognises
 * - a key from before the server's key changed, an order that is gone - is
 * dropped from the cookie so the list does not keep asking for it.
 */
export default function MyOrders({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null);
  const [currency, setCurrency] = useState('৳');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const tracked = readTrackedOrders(slug);
    if (tracked.length === 0) {
      setOrders([]);
      return;
    }

    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/order/${encodeURIComponent(slug)}/my-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ orders: tracked }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || 'Your orders could not be loaded.');

      const found: CustomerOrder[] = body.orders;
      const known = new Set(found.map((o) => o.id));
      if (known.size !== tracked.length) writeTrackedOrders(slug, tracked.filter((o) => known.has(o.id)));

      setCurrency(body.currency || '৳');
      setOrders(found);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    // Deferred a tick so the first load is not a synchronous setState in the effect.
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);

  const live = orders?.some((o) => !o.finished) ?? false;
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [live, load]);

  const money = (n: number) => `${currency}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  return (
    <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button className="btn btn-sm btn-ghost gap-1 -ml-2" onClick={onBack}><ArrowLeft size={16} /> Back to menu</button>
        <button className="btn btn-sm btn-ghost gap-1" onClick={load} disabled={refreshing} aria-label="Refresh">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      <h2 className="text-xl font-semibold flex items-center gap-2"><ClipboardList size={20} /> My orders</h2>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      {orders === null ? (
        <div className="flex justify-center py-12"><span className="loading loading-spinner text-primary" /></div>
      ) : orders.length === 0 ? (
        <div className="bg-base-100 rounded-xl p-8 text-center text-base-content/60">
          No orders yet. Orders you place from this device show up here.
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="bg-base-100 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    Order #{o.id}{o.token_number != null && <span className="text-base-content/60 font-normal"> · Token {o.token_number}</span>}
                  </div>
                  <div className="text-xs text-base-content/60">
                    {o.order_type === 'delivery' ? 'Delivery' : 'Pickup'}
                    {o.location ? ` · ${o.location.name}` : ''}
                    {o.placed_at ? ` · ${new Date(o.placed_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge ${STATUS_TONE[o.status] ?? 'badge-ghost'} font-semibold`}>{o.status_label}</span>
                  {o.status !== 'cancelled' && (
                    <span className={`badge badge-sm ${o.paid ? 'badge-success badge-outline' : 'badge-ghost'}`}>{o.paid ? 'Paid' : 'Unpaid'}</span>
                  )}
                </div>
              </div>

              <ul className="text-sm divide-y divide-base-200">
                {o.items.map((item, i) => (
                  <li key={i} className="py-1 flex justify-between gap-2">
                    <span>{item.qty} × {item.name}</span>
                    <span>{money(item.total)}</span>
                  </li>
                ))}
              </ul>

              <div className="text-sm space-y-0.5">
                {o.tax_amount > 0 && <div className="flex justify-between text-base-content/70"><span>Tax</span><span>{money(o.tax_amount)}</span></div>}
                {o.delivery_charge > 0 && <div className="flex justify-between text-base-content/70"><span>Delivery charge</span><span>{money(o.delivery_charge)}</span></div>}
                <div className="flex justify-between font-semibold"><span>Total</span><span>{money(o.total)}</span></div>
              </div>

              {!o.finished && o.location?.phone && (
                <a className="btn btn-xs btn-ghost border-base-300 gap-1" href={`tel:${o.location.phone}`}><Phone size={12} /> Call {o.location.name}</a>
              )}
            </li>
          ))}
        </ul>
      )}

      {live && <p className="text-xs text-center text-base-content/50">Updates automatically while an order is in progress.</p>}
    </main>
  );
}
