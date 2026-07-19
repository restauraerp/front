'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';
import { BookOpen, Receipt, Percent } from 'lucide-react';

export default function AccountingDashboard() {
  const [stats, setStats] = useState({ ledgers: 0, expenses: 0, taxes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [ledgerRes, expenseRes, taxRes] = await Promise.all([
          fetchApi('/accounting-ledgers?per_page=1'),
          fetchApi('/expenses?per_page=1'),
          fetchApi('/tax-rules')
        ]);

        const ledgerCount = ledgerRes?.total || ledgerRes?.meta?.total || (Array.isArray(ledgerRes?.data) ? ledgerRes.data.length : 0) || 0;
        const expenseCount = expenseRes?.total || expenseRes?.meta?.total || (Array.isArray(expenseRes?.data) ? expenseRes.data.length : 0) || 0;
        const taxCount = taxRes?.total || taxRes?.meta?.total || (Array.isArray(taxRes?.data) ? taxRes.data.length : (Array.isArray(taxRes) ? taxRes.length : 0)) || 0;

        setStats({
          ledgers: ledgerCount,
          expenses: expenseCount,
          taxes: taxCount
        });
      } catch (error) {
        console.error("Failed to load accounting stats", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Accounting & Finance</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title={<div className="flex items-center gap-2"><BookOpen className="text-primary" size={20} /> Ledgers</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">View all financial transactions and balances.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.ledgers} <span className="text-sm font-normal text-base-content/60">Records</span></div>
            )}
          </div>
          <Link href="/admin/accounting/ledgers" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            View Ledgers &rarr;
          </Link>
        </Card>

        <Card title={<div className="flex items-center gap-2"><Receipt className="text-primary" size={20} /> Expenses</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Log and track operational expenses.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.expenses} <span className="text-sm font-normal text-base-content/60">Expenses</span></div>
            )}
          </div>
          <Link href="/admin/accounting/expenses" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Manage Expenses &rarr;
          </Link>
        </Card>

        <Card title={<div className="flex items-center gap-2"><Percent className="text-primary" size={20} /> Tax Rules</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Configure sales taxes for different items.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.taxes} <span className="text-sm font-normal text-base-content/60">Rules</span></div>
            )}
          </div>
          <Link href="/admin/accounting/taxes" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Manage Taxes &rarr;
          </Link>
        </Card>
      </div>
    </div>
  );
}