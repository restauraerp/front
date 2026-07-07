import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function HROverview() {
  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Human Resources</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card title="Employees">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Manage staff accounts, roles, and profiles.</p>
          <Link href="/admin/hr/employees" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Employees &rarr;</Link>
        </Card>
        <Card title="Attendance">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Track daily check-ins and check-outs.</p>
          <Link href="/admin/hr/attendance" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>View Attendance &rarr;</Link>
        </Card>
        <Card title="Leaves">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Manage employee time-off requests.</p>
          <Link href="/admin/hr/leaves" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Leaves &rarr;</Link>
        </Card>
        <Card title="Payroll">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Generate and track employee compensation.</p>
          <Link href="/admin/hr/payroll" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Manage Payroll &rarr;</Link>
        </Card>
      </div>
    </div>
  );
}