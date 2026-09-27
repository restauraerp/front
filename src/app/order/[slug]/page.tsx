'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Minus, Plus, Search, ShoppingBag, ShoppingCart, MapPin, Phone, CheckCircle2, X, Store, Bike, ClipboardList } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import MyOrders from './MyOrders';
import { readTrackedOrders, trackOrder } from './trackedOrders';

/**
 * The restaurant's online order link: /order/{restaurant-code}.
 *
 * Public - no account, no tenant cookie. The restaurant comes from the URL,
 * and everything it shows and accepts goes through core-api's
 * PublicOrderController, which prices the order itself. The cart here holds
 * product ids and quantities; the prices shown are only a preview of what the
 * server will charge.
 */

type Restaurant = { code: string; name: string; address: string | null; phone: string | null; logo_url: string | null; currency: string };
type Location = { id: number; name: string; address: string | null; phone: string | null };
type Category = { id: number; name: string };
type Product = { id: number; name: string; description: string | null; price: number; category_id: number | null; image_url: string | null; location_ids: number[] | null };
type Menu = { restaurant: Restaurant; accepting_orders: boolean; order_types: string[]; locations: Location[]; categories: Category[]; products: Product[] };
type Placed = { order_id: number; tracking_key: string; token_number: number | null; order_type: string; location: Location; subtotal: number; tax_amount: number; total: number; currency: string };
type Cart = Record<number, number>;

const TYPE_LABEL: Record<string, string> = { takeaway: 'Pickup', delivery: 'Delivery' };

function storageUrl(path: string | null): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `/storage/${path}`;
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage blocked - the cart just won't survive a reload.
  }
}

export default function OnlineOrderPage() {
  const { slug } = useParams<{ slug: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [locationId, setLocationId] = useState<number | null>(null);
  const [orderType, setOrderType] = useState('takeaway');
  const [category, setCategory] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [view, setView] = useState<'menu' | 'orders'>('menu');
  // How many orders this browser has placed here, for the header button.
  // Read after mount - the cookie is not there during the server render.
  const [trackedCount, setTrackedCount] = useState(0);

  const cartKey = `restora_online_cart::${slug}`;
  const customerKey = 'restora_online_customer';

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE_URL}/order/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.message || 'This restaurant could not be loaded.');
        return body as Menu;
      })
      .then((data) => {
        setMenu(data);
        setTrackedCount(readTrackedOrders(slug).length);
        const saved = readStored<{ cart?: Cart; locationId?: number; orderType?: string }>(cartKey, {});
        const ids = data.locations.map((l) => l.id);
        setLocationId(saved.locationId && ids.includes(saved.locationId) ? saved.locationId : ids[0] ?? null);
        if (saved.orderType && data.order_types.includes(saved.orderType)) setOrderType(saved.orderType);
        const known = new Set(data.products.map((p) => p.id));
        setCart(Object.fromEntries(Object.entries(saved.cart ?? {}).filter(([id]) => known.has(Number(id)))));
        const who = readStored<{ name?: string; phone?: string; address?: string }>(customerKey, {});
        setName(who.name ?? '');
        setPhone(who.phone ?? '');
        setAddress(who.address ?? '');
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [slug, cartKey]);

  useEffect(() => {
    if (menu) writeStored(cartKey, { cart, locationId, orderType });
  }, [menu, cart, locationId, orderType, cartKey]);

  const available = useMemo(() => {
    if (!menu) return [];
    return menu.products.filter((p) => p.location_ids === null || (locationId !== null && p.location_ids.includes(locationId)));
  }, [menu, locationId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available.filter((p) =>
      (category === null || p.category_id === category) &&
      (!q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)),
    );
  }, [available, category, query]);

  const categories = useMemo(() => {
    if (!menu) return [];
    const used = new Set(available.map((p) => p.category_id));
    return menu.categories.filter((c) => used.has(c.id));
  }, [menu, available]);

  const productById = useMemo(() => new Map(menu?.products.map((p) => [p.id, p]) ?? []), [menu]);
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: productById.get(Number(id)), qty }))
    .filter((l): l is { product: Product; qty: number } => !!l.product && l.qty > 0);
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const unavailable = lines.filter((l) => !available.includes(l.product));
  const currency = menu?.restaurant.currency ?? '৳';
  const money = (n: number) => `${currency}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  const setQty = (id: number, qty: number) =>
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, 99);
      return next;
    });

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (unavailable.length) {
      setError(`${unavailable.map((l) => l.product.name).join(', ')} not available at this branch. Remove to continue.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/order/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          order_type: orderType,
          name,
          phone,
          delivery_address: orderType === 'delivery' ? address : null,
          note: note || null,
          items: lines.map((l) => ({ product_id: l.product.id, qty: l.qty })),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const first = body?.errors ? (Object.values(body.errors)[0] as string[])[0] : null;
        throw new Error(first || body?.message || 'Your order could not be placed. Please try again.');
      }
      writeStored(customerKey, { name, phone, address });
      setCart({});
      setNote('');
      setCartOpen(false);
      setPlaced(body as Placed);
      setTrackedCount(trackOrder(slug, { id: body.order_id, key: body.tracking_key }).length);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <div className="card bg-base-100 shadow max-w-md w-full"><div className="card-body text-center">
          <Store className="mx-auto text-base-content/40" size={40} />
          <h1 className="text-lg font-semibold">Restaurant not found</h1>
          <p className="text-base-content/70">{loadError}</p>
        </div></div>
      </div>
    );
  }

  if (!menu) {
    return <div className="min-h-screen flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary" /></div>;
  }

  const { restaurant } = menu;
  const logo = storageUrl(restaurant.logo_url);

  if (placed) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow max-w-md w-full"><div className="card-body items-center text-center gap-3">
          <CheckCircle2 className="text-success" size={52} />
          <h1 className="text-xl font-semibold">Order placed</h1>
          <p className="text-base-content/70">Thank you, {name}. {restaurant.name} has your order.</p>
          <div className="grid grid-cols-2 gap-3 w-full my-2">
            <div className="rounded-lg bg-base-200 p-3"><div className="text-xs text-base-content/60">Order</div><div className="text-2xl font-semibold">#{placed.order_id}</div></div>
            <div className="rounded-lg bg-base-200 p-3"><div className="text-xs text-base-content/60">Token</div><div className="text-2xl font-semibold">{placed.token_number ?? '—'}</div></div>
          </div>
          <div className="w-full text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(placed.subtotal)}</span></div>
            {placed.tax_amount > 0 && <div className="flex justify-between"><span>Tax</span><span>{money(placed.tax_amount)}</span></div>}
            <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{money(placed.total)}</span></div>
          </div>
          <p className="text-sm text-base-content/70">
            {placed.order_type === 'delivery'
              ? 'Pay on delivery. Any delivery charge is added by the restaurant.'
              : `Pay when you pick it up at ${placed.location.name}.`}
          </p>
          {(placed.location.phone || restaurant.phone) && (
            <a className="btn btn-outline btn-sm" href={`tel:${placed.location.phone || restaurant.phone}`}><Phone size={14} /> Call the restaurant</a>
          )}
          <button className="btn btn-primary w-full gap-1" onClick={() => { setPlaced(null); setView('orders'); }}><ClipboardList size={16} /> Track my order</button>
          <button className="btn btn-ghost btn-sm w-full" onClick={() => setPlaced(null)}>Order something else</button>
        </div></div>
      </div>
    );
  }

  const location = menu.locations.find((l) => l.id === locationId);

  const header = (
    <header className="bg-base-100 border-b border-base-300">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
        {logo ? <img src={logo} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Store className="text-primary" /></div>}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold truncate">{restaurant.name}</h1>
          <p className="text-xs text-base-content/60 truncate">Order online · pay on {orderType === 'delivery' ? 'delivery' : 'pickup'}</p>
        </div>
        {view === 'menu' && trackedCount > 0 && (
          <button className="btn btn-sm btn-ghost border-base-300 gap-1 shrink-0" onClick={() => setView('orders')}>
            <ClipboardList size={16} /> <span className="hidden sm:inline">My orders</span>
            <span className="badge badge-sm badge-primary">{trackedCount}</span>
          </button>
        )}
      </div>
    </header>
  );

  if (view === 'orders') {
    return (
      <div className="min-h-screen bg-base-200 pb-10">
        {header}
        <MyOrders slug={slug} onBack={() => { setView('menu'); setTrackedCount(readTrackedOrders(slug).length); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 pb-28">
      {header}

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {!menu.accepting_orders && (
          <div className="alert alert-warning">This restaurant is not taking online orders right now.{restaurant.phone && <> Call <a className="link" href={`tel:${restaurant.phone}`}>{restaurant.phone}</a> to order.</>}</div>
        )}

        <div className="bg-base-100 rounded-xl p-3 flex flex-col sm:flex-row gap-3">
          <div className="join">
            {menu.order_types.map((t) => (
              <button key={t} type="button" onClick={() => setOrderType(t)} className={`btn btn-sm join-item ${orderType === t ? 'btn-primary' : 'btn-ghost border-base-300'}`}>
                {t === 'delivery' ? <Bike size={14} /> : <ShoppingBag size={14} />} {TYPE_LABEL[t] ?? t}
              </button>
            ))}
          </div>
          {menu.locations.length > 1 ? (
            <label className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin size={16} className="text-base-content/60 shrink-0" />
              <select className="select select-sm select-bordered w-full" value={locationId ?? ''} onChange={(e) => setLocationId(Number(e.target.value))}>
                {menu.locations.map((l) => <option key={l.id} value={l.id}>{l.name}{l.address ? ` — ${l.address}` : ''}</option>)}
              </select>
            </label>
          ) : location && (
            <div className="flex items-center gap-2 text-sm text-base-content/70"><MapPin size={16} /> {location.name}{location.address ? ` — ${location.address}` : ''}</div>
          )}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 z-10" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the menu" className="input input-bordered w-full pl-9" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button className={`btn btn-sm shrink-0 ${category === null ? 'btn-primary' : 'btn-ghost bg-base-100'}`} onClick={() => setCategory(null)}>All</button>
          {categories.map((c) => (
            <button key={c.id} className={`btn btn-sm shrink-0 ${category === c.id ? 'btn-primary' : 'btn-ghost bg-base-100'}`} onClick={() => setCategory(c.id)}>{c.name}</button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-center text-base-content/60 py-12">Nothing matches that here.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((p) => {
              const qty = cart[p.id] ?? 0;
              const img = storageUrl(p.image_url);
              return (
                <div key={p.id} className="bg-base-100 rounded-xl overflow-hidden flex sm:flex-col">
                  {img && <img src={img} alt="" className="w-28 h-28 sm:w-full sm:h-40 object-cover shrink-0" />}
                  <div className="p-3 flex flex-col flex-1 min-w-0">
                    <h3 className="font-semibold leading-tight">{p.name}</h3>
                    {p.description && <p className="text-xs text-base-content/60 mt-1 line-clamp-2">{p.description}</p>}
                    <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                      <span className="font-semibold">{money(p.price)}</span>
                      {qty === 0 ? (
                        <button className="btn btn-sm btn-primary" disabled={!menu.accepting_orders} onClick={() => setQty(p.id, 1)}><ShoppingCart size={14} /> Add</button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button className="btn btn-sm btn-square btn-ghost border-base-300" onClick={() => setQty(p.id, qty - 1)} aria-label="Remove one"><Minus size={14} /></button>
                          <span className="w-6 text-center font-semibold">{qty}</span>
                          <button className="btn btn-sm btn-square btn-primary" onClick={() => setQty(p.id, qty + 1)} aria-label="Add one"><Plus size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {itemCount > 0 && !cartOpen && (
        <div className="fixed bottom-0 inset-x-0 p-3 bg-base-100 border-t border-base-300">
          <button className="btn btn-primary w-full max-w-5xl mx-auto flex justify-between" onClick={() => setCartOpen(true)}>
            <span className="flex items-center gap-2"><ShoppingBag size={16} /> {itemCount} item{itemCount === 1 ? '' : 's'}</span>
            <span>View order · {money(subtotal)}</span>
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setCartOpen(false)}>
          <form onSubmit={placeOrder} onClick={(e) => e.stopPropagation()} className="bg-base-100 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your order · {TYPE_LABEL[orderType]}</h2>
              <button type="button" className="btn btn-sm btn-ghost btn-square" onClick={() => setCartOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            {location && <p className="text-sm text-base-content/70 -mt-2">From {location.name}</p>}

            <ul className="divide-y divide-base-200">
              {lines.map(({ product, qty }) => (
                <li key={product.id} className="py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{product.name}</div>
                    <div className="text-xs text-base-content/60">{money(product.price)} each</div>
                    {!available.includes(product) && <div className="text-xs text-error">Not available at this branch</div>}
                  </div>
                  <button type="button" className="btn btn-xs btn-square btn-ghost border-base-300" onClick={() => setQty(product.id, qty - 1)}><Minus size={12} /></button>
                  <span className="w-5 text-center text-sm">{qty}</span>
                  <button type="button" className="btn btn-xs btn-square btn-ghost border-base-300" onClick={() => setQty(product.id, qty + 1)}><Plus size={12} /></button>
                  <span className="w-20 text-right text-sm font-medium">{money(product.price * qty)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-semibold"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <p className="text-xs text-base-content/60 -mt-3">Tax{orderType === 'delivery' ? ' and delivery charge' : ''}, if any, is added by the restaurant.</p>

            <div className="grid gap-3">
              <input required maxLength={100} className="input input-bordered w-full" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              <input required type="tel" inputMode="tel" maxLength={20} className="input input-bordered w-full" placeholder="Mobile number (01XXXXXXXXX)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              {orderType === 'delivery' && (
                <textarea required maxLength={500} className="textarea textarea-bordered w-full" rows={2} placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} />
              )}
              <textarea maxLength={500} className="textarea textarea-bordered w-full" rows={2} placeholder="Note for the restaurant (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {error && <div className="alert alert-error text-sm">{error}</div>}

            <button type="submit" className="btn btn-primary w-full" disabled={submitting || !menu.accepting_orders || lines.length === 0}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : `Place order · ${money(subtotal)}`}
            </button>
            <p className="text-xs text-center text-base-content/60">You pay {orderType === 'delivery' ? 'on delivery' : 'at pickup'}. No payment is taken online.</p>
          </form>
        </div>
      )}
    </div>
  );
}
