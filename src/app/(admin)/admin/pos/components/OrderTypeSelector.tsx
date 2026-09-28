'use client';
import React from 'react';
import { UtensilsCrossed, ShoppingBag, Truck, ChefHat } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * `module` is what the restaurant must have for the type to be offered.
 * Delivery needs the Delivery module: without it there are no riders to assign
 * the order to, and the API refuses it.
 */
const ORDER_TYPES = [
  { value: 'dine_in', label: 'Dine-in', icon: UtensilsCrossed, color: '#6366f1' },
  { value: 'takeaway', label: 'Takeaway', icon: ShoppingBag, color: '#f59e0b' },
  { value: 'delivery', label: 'Delivery', icon: Truck, color: '#10b981', module: 'delivery' },
  { value: 'catering', label: 'Catering', icon: ChefHat, color: '#ec4899' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function OrderTypeSelector({ value, onChange }: Props) {
  const { hasModule } = usePermissions();
  // An order already of that type (being edited) keeps its button, so the
  // selection is never invisible.
  const offered = ORDER_TYPES.filter(t => !t.module || hasModule(t.module) || t.value === value);

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {offered.map(t => {
        const Icon = t.icon;
        const active = value === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 0.85rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600,
              border: active ? `2px solid ${t.color}` : '2px solid #e5e7eb',
              background: active ? `${t.color}15` : 'white',
              color: active ? t.color : '#6b7280',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <Icon size={15} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
