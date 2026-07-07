'use client';
import React from 'react';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';

const METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'mfs', label: 'MFS', icon: Smartphone, title: 'bKash, Nagad, Rocket, etc.' },
];

interface Props { value: string; onChange: (v: string) => void; }

export default function PaymentMethodSelector({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: '0.35rem' }}>
      {METHODS.map(m => {
        const Icon = m.icon;
        const active = value === m.value;
        return (
          <button key={m.value} title={m.title} onClick={() => onChange(m.value)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
            padding: '0.45rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600,
            border: active ? '2px solid #6366f1' : '2px solid #e5e7eb',
            background: active ? '#6366f115' : 'white',
            color: active ? '#6366f1' : '#6b7280', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <Icon size={13} />{m.label}
          </button>
        );
      })}
    </div>
  );
}
