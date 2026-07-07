import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function KitchenKiosk() {
  return (
    <div style={{ background: '#111827', minHeight: '100vh', padding: '2rem', color: 'white', margin: '-2rem' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>Kitchen Display System (KDS)</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: '#1f2937', padding: '1.5rem', borderRadius: '12px' }}>
          <h2>Order #1042 (Table 4)</h2>
          <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem' }}>
            <li>2x Burger</li>
            <li>1x Fries (No Salt)</li>
          </ul>
          <Button variant="primary" style={{ width: '100%' }}>Mark as Cooking</Button>
        </div>
      </div>
    </div>
  );
}