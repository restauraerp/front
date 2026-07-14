'use client';

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from './CartProvider';

export function CartButton() {
  const { items, setIsCartOpen } = useCart();
  
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <button 
      className="btn btn-ghost btn-circle relative"
      onClick={() => setIsCartOpen(true)}
    >
      <ShoppingBag size={20} />
      {itemCount > 0 && (
        <div className="badge badge-primary badge-sm absolute top-0 right-0">
          {itemCount}
        </div>
      )}
    </button>
  );
}
