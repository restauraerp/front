'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { ChefHat, CheckCircle, AlarmClock, Clock } from 'lucide-react';
import { tenantKey } from '@/lib/tenant';

/** Falls back to an hour, the same default the API uses when a tenant has not set one. */
const DEFAULT_LEAD_MINUTES = 60;

/**
 * Minutes until the food is wanted. Null delivery time means ASAP, which is due
 * now rather than "no rush" — the same reading OrderFlow takes on the API side.
 */
const minutesUntilDue = (order: any, now: number) =>
  order.delivery_time ? Math.round((new Date(order.delivery_time).getTime() - now) / 60000) : 0;

const dueLabel = (minutes: number) => {
  if (minutes <= 0) return `Overdue by ${Math.abs(minutes)} min`;
  if (minutes < 60) return `Start in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (minutes < 24 * 60) return `Start in ${hours}h${rest ? ` ${rest}m` : ''}`;
  return `Due in ${Math.round(minutes / (24 * 60))} day(s)`;
};

export default function KitchenKiosk() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [leadMinutes, setLeadMinutes] = useState(DEFAULT_LEAD_MINUTES);
  // Countdowns have to move on their own: an order crosses into the hour
  // without anything arriving from the API to say so.
  const [now, setNow] = useState(() => Date.now());

  const loadOrders = async () => {
    try {
      const res = await fetchApi(`/orders?nopaginate=1&statuses=pending,cooking&_t=${Date.now()}`);
      const data = res.data || res || [];

      // By when the food is wanted, not when it was typed in. Sorting by
      // placement time kept a catering booking made last week pinned to the top
      // of the board, above food due in ten minutes.
      const now = Date.now();
      data.sort((a: any, b: any) => minutesUntilDue(a, now) - minutesUntilDue(b, now));

      setAllOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

    fetchApi('/website-settings')
      .then(res => {
        const configured = (res.data || res || []).find((s: any) => s.key === 'kitchen_lead_minutes');
        const minutes = Number(configured?.value);
        if (Number.isFinite(minutes) && minutes > 0) setLeadMinutes(minutes);
      })
      .catch(console.error);

    loadOrders();
    const interval = setInterval(loadOrders, 10000); // 10 seconds auto-refresh
    const clock = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setProcessing(id);
    try {
      await fetchApi(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      await loadOrders();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setProcessing(null);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!activeLocationId) return allOrders;
    return allOrders.filter(o => o.location_id === activeLocationId);
  }, [allOrders, activeLocationId]);

  /**
   * Three lanes: what is on the stove, what has to go on within the lead
   * window, and what can wait. Sorted by due time inside each.
   */
  const lanes = useMemo(() => {
    const cooking = filteredOrders.filter(o => o.status === 'cooking');
    const waiting = filteredOrders
      .filter(o => o.status !== 'cooking')
      .sort((a, b) => minutesUntilDue(a, now) - minutesUntilDue(b, now));

    return {
      cooking,
      dueSoon: waiting.filter(o => minutesUntilDue(o, now) <= leadMinutes),
      later: waiting.filter(o => minutesUntilDue(o, now) > leadMinutes),
    };
  }, [filteredOrders, leadMinutes, now]);

  if (loading && allOrders.length === 0) return <div className="flex justify-center items-center min-h-[50vh]"><span className="loading loading-spinner text-primary loading-lg"></span></div>;

  return (
    <div className="bg-base-200 min-h-screen p-4 sm:p-6 -m-6 text-base-content relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <ChefHat size={28} /> Kitchen Display System
          </h1>
          {locations.length > 0 && (
            <select 
              value={activeLocationId || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setActiveLocationId(id);
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
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-sm bg-base-100 border border-base-300" onClick={loadOrders}>
            Refresh
          </button>
          <div className="text-sm opacity-70 flex items-center gap-2 font-medium">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
            Live Sync Active
          </div>
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="text-center py-32 bg-base-100 rounded-2xl shadow-sm border border-base-300">
          <CheckCircle size={64} className="mx-auto text-success/50 mb-4" />
          <h2 className="text-2xl font-semibold opacity-80">Kitchen is clear!</h2>
          <p className="opacity-50 text-sm mt-2">No pending or cooking orders for this location.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {lanes.cooking.length > 0 && (
            <Lane
              title="Cooking now"
              count={lanes.cooking.length}
              icon={<ChefHat size={18} />}
              orders={lanes.cooking}
              now={now}
              processing={processing}
              onAdvance={handleUpdateStatus}
            />
          )}

          {lanes.dueSoon.length > 0 && (
            <Lane
              title={`Start within the next ${leadMinutes} minutes`}
              subtitle="These are due soon — start them in due order, soonest first."
              count={lanes.dueSoon.length}
              icon={<AlarmClock size={18} />}
              tone="urgent"
              orders={lanes.dueSoon}
              now={now}
              processing={processing}
              onAdvance={handleUpdateStatus}
            />
          )}

          {lanes.later.length > 0 && (
            <Lane
              title="Later"
              subtitle="Booked ahead. Nothing to do yet."
              count={lanes.later.length}
              icon={<Clock size={18} />}
              tone="muted"
              orders={lanes.later}
              now={now}
              processing={processing}
              onAdvance={handleUpdateStatus}
            />
          )}
        </div>
      )}
    </div>
  );

}

function Lane({ title, subtitle, count, icon, orders, tone = 'normal', now, processing, onAdvance }: any) {
  return (
    <section>
      <header className="mb-3 flex items-center gap-2">
        <span className={tone === 'urgent' ? 'text-warning' : tone === 'muted' ? 'text-base-content/40' : 'text-info'}>
          {icon}
        </span>
        <h2 className={`text-lg font-bold ${tone === 'muted' ? 'text-base-content/50' : ''}`}>{title}</h2>
        <span className="badge badge-sm badge-ghost font-semibold">{count}</span>
        {subtitle && <span className="text-sm opacity-50 hidden sm:inline">— {subtitle}</span>}
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {orders.map((order: any) => <Ticket key={order.id} order={order} tone={tone} now={now} processing={processing} onAdvance={onAdvance} />)}
      </div>
    </section>
  );
}

function Ticket({ order, tone, now, processing, onAdvance }: any) {
  const minutes = minutesUntilDue(order, now);
  const overdue = order.status !== 'cooking' && minutes <= 0;
  const border = order.status === 'cooking'
    ? 'border-t-info'
    : overdue ? 'border-t-error' : tone === 'urgent' ? 'border-t-warning' : 'border-t-base-300';

  return (
    <div className={`flex flex-col bg-base-100 p-5 rounded-2xl shadow-md border-t-4 transition-all ${border} ${tone === 'muted' ? 'opacity-75' : ''}`}>
      <div className="flex justify-between items-start mb-4 pb-3 border-b border-base-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-black text-base-content">
              {order.table?.name || (order.order_type || '').replace('_', ' ').toUpperCase()}
            </h3>
            {order.token_number != null && (
              <span className="badge badge-secondary font-black text-xs">
                Token #{order.token_number}
              </span>
            )}
          </div>
          <p className="text-sm opacity-60">
            Order #{order.id} {order.token_number != null ? `(Token #${order.token_number})` : ''}
          </p>
        </div>
        <div className="text-right">
          <span className={`badge font-bold ${order.status === 'cooking' ? 'badge-info text-white' : overdue ? 'badge-error text-white' : 'badge-warning'}`}>
            {order.status === 'cooking' ? 'COOKING' : overdue ? 'START NOW' : 'SCHEDULED'}
          </span>
          <div className="text-xs opacity-60 mt-1 font-mono">
            {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
          </div>
        </div>
      </div>

      {order.status === 'pending' && (
        <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${overdue ? 'bg-error/15' : tone === 'urgent' ? 'bg-warning/20' : 'bg-base-200/70'}`}>
          {order.delivery_time ? (
            <>
              <span className="font-semibold">{dueLabel(minutes)}</span>
              <span className="block text-xs opacity-70">
                Due {new Date(order.delivery_time).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </span>
            </>
          ) : (
            <span className="font-semibold">Waiting to start</span>
          )}
          <span className="block text-xs opacity-70">Not started yet — press Start Cooking when you want it made.</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {order.items?.map((item: any, idx: number) => {
          const imgUrl = item.product?.images?.[0]?.url;
          return (
            <div key={idx} className="flex gap-3 bg-base-200/50 p-2.5 rounded-lg items-center">
              <span className="font-black text-lg text-primary shrink-0">{item.quantity || item.qty}x</span>
              <div className="w-10 h-10 rounded-md overflow-hidden bg-base-300 shrink-0 border border-base-200 flex items-center justify-center">
                {imgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/storage/${imgUrl}`} alt={item.product?.name} className="w-full h-full object-cover" />
                ) : (
                  <ChefHat size={16} className="text-base-content/30" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-base block truncate">{item.product?.name || `Item #${item.product_id}`}</span>
                {item.product?.type === 'combo' && item.product?.combo_items?.length > 0 && (
                  <div className="mt-1 ml-1 space-y-0.5">
                    {item.product.combo_items.map((ci: any, i: number) => (
                      <p key={i} className="text-xs text-base-content/60 flex items-center gap-1">
                        <span className="opacity-50">↳</span>
                        <span className="font-medium">{ci.quantity > 1 ? `${ci.quantity}× ` : ''}{ci.product?.name || ci.inventory_item?.title || 'Item'}</span>
                      </p>
                    ))}
                  </div>
                )}
                {item.notes && <p className="text-sm text-error mt-0.5 italic font-medium break-words">* {item.notes}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-base-200">
        {order.status === 'pending' ? (
          <button
            className={`btn w-full text-white text-lg font-bold h-12 ${overdue ? 'btn-error' : 'btn-info'}`}
            onClick={() => onAdvance(order.id, 'cooking')}
            disabled={processing === order.id}
          >
            {processing === order.id ? <span className="loading loading-spinner"></span> : 'Start Cooking'}
          </button>
        ) : (
          <button
            className="btn btn-success w-full text-white text-lg font-bold h-12"
            onClick={() => onAdvance(order.id, 'ready_to_serve')}
            disabled={processing === order.id}
          >
            {processing === order.id ? <span className="loading loading-spinner"></span> : 'Ready to Serve'}
          </button>
        )}
      </div>
    </div>
  );
}
