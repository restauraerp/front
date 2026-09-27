'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { getTenant, tenantKey } from '@/lib/tenant';

type CartItem = {
  product_id: number;
  name: string;
  price: number;
  qty: number;
  image?: string;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (product: any, qty: number) => void;
  removeFromCart: (productId: number) => void;
  updateQty: (productId: number, qty: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  total: number;
  checkout: (details: CheckoutDetails) => Promise<PlacedOrder>;
};

type CheckoutDetails = { name: string; phone: string; delivery_address: string; note?: string };
type PlacedOrder = { order_id: number; token_number: number | null; total: number; currency: string };

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(tenantKey('restauraerp_cart'));
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(tenantKey('restauraerp_cart'), JSON.stringify(items));
  }, [items]);

  const addToCart = (product: any, qty: number = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: parseFloat(product.sale_price || product.price),
        qty,
        image: product.images?.[0]?.url
      }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: number) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, qty } : i));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

  /**
   * Places the order through the restaurant's online order link.
   *
   * Only ids and quantities go up. The server prices the order from its own
   * product table and takes no payment, so the prices in this cart are a
   * preview and nothing here can change what the customer is charged. (This
   * used to post to `storefront/orders` with its own prices and
   * payment_method 'cash', which marked the order paid.)
   */
  const checkout = async (details: CheckoutDetails): Promise<PlacedOrder> => {
    const tenant = getTenant();
    if (!tenant) throw new Error('This site is not set up to take orders.');

    const res = await fetch(`${API_BASE_URL}/order/${encodeURIComponent(tenant)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        order_type: 'delivery',
        name: details.name,
        phone: details.phone,
        delivery_address: details.delivery_address,
        note: details.note || null,
        items: items.map(i => ({ product_id: i.product_id, qty: i.qty })),
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const first = body?.errors ? (Object.values(body.errors)[0] as string[])[0] : null;
      throw new Error(first || body?.message || 'Your order could not be placed. Please try again.');
    }

    clearCart();
    return body as PlacedOrder;
  };

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, isCartOpen, setIsCartOpen, total, checkout }}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}

function CartDrawer() {
  const { isCartOpen, setIsCartOpen, items, updateQty, total, checkout } = useCart();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  if (!isCartOpen) return null;

  const close = () => {
    setIsCartOpen(false);
    setPlaced(null);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setError(null);
    setLoading(true);
    try {
      setPlaced(await checkout({ name, phone, delivery_address: address, note }));
      setNote('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (placed) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-[100]" onClick={close} />
        <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-base-100 z-[101] shadow-2xl flex flex-col items-center justify-center p-6 text-center gap-3">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold">Order placed</h2>
          <p>Order #{placed.order_id}{placed.token_number != null ? ` · Token ${placed.token_number}` : ''}</p>
          <p className="font-semibold">Total {placed.currency}{placed.total.toLocaleString()}</p>
          <p className="text-sm text-base-content/70">Pay on delivery. Any delivery charge is added by the restaurant.</p>
          <button className="btn btn-primary mt-2" onClick={close}>Done</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[100]"
        onClick={() => setIsCartOpen(false)}
      />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-base-100 z-[101] shadow-2xl flex flex-col">
        <div className="p-4 border-b border-base-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Order</h2>
          <button type="button" onClick={close} className="btn btn-sm btn-ghost btn-circle">✕</button>
        </div>
        
        <form onSubmit={handleCheckout} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {items.length === 0 ? (
            <p className="text-center text-base-content/50 my-8">Your cart is empty</p>
          ) : (
            items.map(item => (
              <div key={item.product_id} className="flex gap-4 items-center bg-base-200 p-3 rounded-xl">
                {item.image ? (
                  <img src={`/storage/${item.image}`} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                ) : (
                  <div className="w-16 h-16 bg-base-300 rounded-lg flex items-center justify-center text-2xl">🍽️</div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold">{item.name}</h4>
                  <p className="text-primary font-bold">৳{item.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn-xs btn-square" onClick={() => updateQty(item.product_id, item.qty - 1)}>-</button>
                  <span className="w-4 text-center">{item.qty}</span>
                  <button type="button" className="btn btn-xs btn-square" onClick={() => updateQty(item.product_id, item.qty + 1)}>+</button>
                </div>
              </div>
            ))
          )}

          {items.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <input required maxLength={100} className="input input-bordered w-full" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
              <input required type="tel" inputMode="tel" maxLength={20} className="input input-bordered w-full" placeholder="Mobile number (01XXXXXXXXX)" value={phone} onChange={e => setPhone(e.target.value)} />
              <textarea required maxLength={500} className="textarea textarea-bordered h-20 w-full" placeholder="Delivery address" value={address} onChange={e => setAddress(e.target.value)} />
              <textarea maxLength={500} className="textarea textarea-bordered h-16 w-full" placeholder="Note for the restaurant (optional)" value={note} onChange={e => setNote(e.target.value)} />
              {error && <div className="alert alert-error text-sm">{error}</div>}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-base-200 bg-base-100">
          <div className="flex justify-between mb-4">
            <span className="font-bold">Total:</span>
            <span className="font-bold text-xl">৳{total.toFixed(2)}</span>
          </div>
          <button 
            type="submit"
            className="btn btn-primary w-full"
            disabled={items.length === 0 || loading}
          >
            {loading ? <span className="loading loading-spinner"></span> : 'Place Order'}
          </button>
          <p className="text-xs text-center text-base-content/60 mt-2">Pay on delivery. Tax and delivery charge, if any, are added by the restaurant.</p>
        </div>
        </form>
      </div>
    </>
  );
}
