import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function InventoryDashboard() {
  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Inventory Management</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card title="Inventory Items">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Manage raw materials, ingredients, and stock levels.</p>
          <Link href="/admin/inventory/items" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Items &rarr;</Link>
        </Card>
        <Card title="Suppliers">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Manage your vendors and contact details.</p>
          <Link href="/admin/inventory/suppliers" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Suppliers &rarr;</Link>
        </Card>
        <Card title="Storage Units">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Configure physical storage locations.</p>
          <Link href="/admin/inventory/storage" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Storage &rarr;</Link>
        </Card>
        <Card title="Purchase Orders">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Create and track purchase orders from suppliers.</p>
          <Link href="/admin/inventory/purchase-orders" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Orders &rarr;</Link>
        </Card>
        <Card title="Recipes">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Define ingredients and required quantities for products.</p>
          <Link href="/admin/inventory/recipes" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Recipes &rarr;</Link>
        </Card>
      </div>
    </div>
  );
}