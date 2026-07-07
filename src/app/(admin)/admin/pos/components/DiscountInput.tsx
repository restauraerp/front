'use client';
import React, { useState } from 'react';
import { Tag, X, Check } from 'lucide-react';

interface Discount { id: number; code: string | null; discount_type: string | null; value: string | null; valid_until: string | null; is_active: number; }
interface Props {
  discounts: Discount[];
  appliedDiscount: Discount | null;
  onApply: (d: Discount | null) => void;
  subtotal: number;
}

export default function DiscountInput({ discounts, appliedDiscount, onApply, subtotal }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleApply = () => {
    setError('');
    const found = discounts.find(d => d.code?.toLowerCase() === code.toLowerCase());
    if (!found) { setError('Invalid code'); return; }
    if (!found.is_active) { setError('Coupon is inactive'); return; }
    if (found.valid_until && new Date(found.valid_until) < new Date()) { setError('Coupon expired'); return; }
    onApply(found);
    setCode('');
  };

  const calcAmount = (d: Discount) => {
    const val = parseFloat(d.value || '0');
    return d.discount_type === 'percentage' ? subtotal * (val / 100) : val;
  };

  if (appliedDiscount) {
    const amt = calcAmount(appliedDiscount);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.8rem' }}>
        <Tag size={14} style={{ color: '#16a34a' }} />
        <span style={{ fontWeight: 600, color: '#166534' }}>{appliedDiscount.code}</span>
        <span style={{ color: '#6b7280' }}>(-৳{amt.toFixed(2)})</span>
        <button onClick={() => onApply(null)} style={{ marginLeft: 'auto', cursor: 'pointer', background: 'none', border: 'none', color: '#9ca3af' }}><X size={14} /></button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Tag size={13} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            value={code} onChange={e => { setCode(e.target.value); setError(''); }}
            placeholder="Discount code"
            onKeyDown={e => e.key === 'Enter' && handleApply()}
            style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.8rem', borderRadius: '8px', border: `1px solid ${error ? '#fca5a5' : '#e5e7eb'}`, fontSize: '0.78rem', outline: 'none' }}
          />
        </div>
        <button onClick={handleApply} disabled={!code.trim()} style={{ padding: '0.4rem 0.65rem', borderRadius: '8px', background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: code.trim() ? 1 : 0.5 }}>
          <Check size={14} />
        </button>
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: '0.7rem', marginTop: '0.2rem' }}>{error}</p>}
    </div>
  );
}
