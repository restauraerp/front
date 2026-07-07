'use client';
import React from 'react';

interface Table { id: number; name: string; capacity: number | null; orders_count?: number; }
interface Props {
  tables: Table[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  loading: boolean;
}

export default function TableSelector({ tables, selectedId, onSelect, loading }: Props) {
  if (loading) return <div style={{ padding: '0.5rem', color: '#9ca3af', fontSize: '0.8rem' }}>Loading tables…</div>;
  if (tables.length === 0) return <div style={{ padding: '0.5rem', color: '#9ca3af', fontSize: '0.8rem' }}>No tables available</div>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {tables.map(t => {
        const active = selectedId === t.id;
        const occupied = t.orders_count ? t.orders_count > 0 : false;
        return (
          <button
            key={t.id}
            onClick={() => { if (!occupied) onSelect(active ? null : t.id); }}
            disabled={occupied}
            title={occupied ? "Table is currently occupied" : ""}
            style={{
              padding: '0.45rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
              border: active ? '2px solid #6366f1' : (occupied ? '2px dashed #d1d5db' : '2px solid #e5e7eb'),
              background: active ? '#6366f115' : (occupied ? '#f3f4f6' : 'white'),
              color: active ? '#6366f1' : (occupied ? '#9ca3af' : '#374151'),
              cursor: occupied ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              minWidth: '60px', textAlign: 'center', opacity: occupied ? 0.7 : 1
            }}
          >
            {t.name}
            {t.capacity && <span style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af', fontWeight: 400 }}>👤 {t.capacity}</span>}
          </button>
        );
      })}
    </div>
  );
}
