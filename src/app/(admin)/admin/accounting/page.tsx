import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function AccountingDashboard() {
  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Accounting & Finance</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card title="Ledgers">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>View all financial transactions and balances.</p>
          <Link href="/admin/accounting/ledgers" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>View Ledgers &rarr;</Link>
        </Card>
        <Card title="Expenses">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Log and track operational expenses.</p>
          <Link href="/admin/accounting/expenses" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Expenses &rarr;</Link>
        </Card>
        <Card title="Tax Rules">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Configure sales taxes for different items.</p>
          <Link href="/admin/accounting/taxes" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Taxes &rarr;</Link>
        </Card>
      </div>
    </div>
  );
}