import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function CRMDashboard() {
  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>CRM & Bookings</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card title="Customers">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Manage your customer database and loyalty points.</p>
          <Link href="/admin/crm/customers" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Customers &rarr;</Link>
        </Card>
        <Card title="Reservations">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>View and manage table and hall reservations.</p>
          <Link href="/admin/crm/reservations" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Reservations &rarr;</Link>
        </Card>
        <Card title="Loyalty Settings">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Configure loyalty tiers and point conversion rates.</p>
          <Link href="/admin/crm/loyalty" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Loyalty Settings &rarr;</Link>
        </Card>
      </div>
    </div>
  );
}