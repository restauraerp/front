'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

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
  checkout: (details: { delivery_address?: string; delivery_time?: string; payment_method?: string }) => Promise<any>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('restauraerp_cart');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('restauraerp_cart', JSON.stringify(items));
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

  const checkout = async (details: any) => {
    // Assuming location_id 1 for storefront
    const payload = {
      location_id: 1,
      order_type: 'delivery',
      status: 'pending',
      subtotal: total,
      tax_amount: 0,
      discount_amount: 0,
      total: total,
      delivery_address: details.delivery_address,
      payment_method: details.payment_method || 'cash',
      items: items.map(i => ({
        product_id: i.product_id,
        qty: i.qty,
        price: i.price
      }))
    };

    const res = await fetchApi('/storefront/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    clearCart();
    setIsCartOpen(false);
    return res;
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
  const { isCartOpen, setIsCartOpen, items, updateQty, removeFromCart, total, checkout } = useCart();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!address) return alert('Please enter delivery address');
    
    setLoading(true);
    try {
      await checkout({ delivery_address: address });
      alert('Order placed successfully!');
    } catch (err) {
      alert('Failed to place order. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[100]"
        onClick={() => setIsCartOpen(false)}
      />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-base-100 z-[101] shadow-2xl flex flex-col">
        <div className="p-4 border-b border-base-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Order</h2>
          <button onClick={() => setIsCartOpen(false)} className="btn btn-sm btn-ghost btn-circle">✕</button>
        </div>
        
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
                  <button className="btn btn-xs btn-square" onClick={() => updateQty(item.product_id, item.qty - 1)}>-</button>
                  <span className="w-4 text-center">{item.qty}</span>
                  <button className="btn btn-xs btn-square" onClick={() => updateQty(item.product_id, item.qty + 1)}>+</button>
                </div>
              </div>
            ))
          )}

          {items.length > 0 && (
            <div className="mt-4 form-control">
              <label className="label"><span className="label-text font-semibold">Delivery Address</span></label>
              <textarea 
                className="textarea textarea-bordered h-24" 
                placeholder="Enter your delivery address..."
                value={address}
                onChange={e => setAddress(e.target.value)}
              ></textarea>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-base-200 bg-base-100">
          <div className="flex justify-between mb-4">
            <span className="font-bold">Total:</span>
            <span className="font-bold text-xl">৳{total.toFixed(2)}</span>
          </div>
          <button 
            className="btn btn-primary w-full"
            disabled={items.length === 0 || loading}
            onClick={handleCheckout}
          >
            {loading ? <span className="loading loading-spinner"></span> : 'Place Order'}
          </button>
        </div>
      </div>
    </>
  );
}
