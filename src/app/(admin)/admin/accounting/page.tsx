'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { fetchApi } from '@/lib/api';
import { BookOpen, Receipt, Percent, Tag, TrendingUp } from 'lucide-react';

export default function AccountingDashboard() {
  const [stats, setStats] = useState({ ledgers: 0, incomes: 0, expenses: 0, taxes: 0, headers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [ledgerRes, incomeRes, expenseRes, taxRes, headerRes] = await Promise.all([
          fetchApi('/accounting-ledgers?per_page=1'),
          fetchApi('/incomes?per_page=1'),
          fetchApi('/expenses?per_page=1'),
          fetchApi('/tax-rules'),
          fetchApi('/accounting-headers?per_page=1'),
        ]);

        const ledgerCount = ledgerRes?.total || ledgerRes?.meta?.total || (Array.isArray(ledgerRes?.data) ? ledgerRes.data.length : 0) || 0;
        const incomeCount = incomeRes?.total || incomeRes?.meta?.total || (Array.isArray(incomeRes?.data) ? incomeRes.data.length : 0) || 0;
        const expenseCount = expenseRes?.total || expenseRes?.meta?.total || (Array.isArray(expenseRes?.data) ? expenseRes.data.length : 0) || 0;
        const taxCount = taxRes?.total || taxRes?.meta?.total || (Array.isArray(taxRes?.data) ? taxRes.data.length : (Array.isArray(taxRes) ? taxRes.length : 0)) || 0;
        const headerCount = headerRes?.total || headerRes?.meta?.total || (Array.isArray(headerRes?.data) ? headerRes.data.length : 0) || 0;

        setStats({
          ledgers: ledgerCount,
          incomes: incomeCount,
          expenses: expenseCount,
          taxes: taxCount,
          headers: headerCount,
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
      <PageHeader
        title="Accounting & Finance"
        subtitle="Manage ledgers, income, expenses, and tax rules across your branches."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        <Card title={<div className="flex items-center gap-2"><TrendingUp className="text-primary" size={20} /> Income</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Log income that arrives outside the till.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.incomes} <span className="text-sm font-normal text-base-content/60">Entries</span></div>
            )}
          </div>
          <Link href="/admin/accounting/incomes" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Manage Income &rarr;
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

        <Card title={<div className="flex items-center gap-2"><Tag className="text-primary" size={20} /> Headers</div>}>
          <div className="mb-4">
            <p className="text-base-content/70 mb-2">Label ledger entries with income or expense headers.</p>
            {loading ? (
              <div className="skeleton h-8 w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-primary">{stats.headers} <span className="text-sm font-normal text-base-content/60">Headers</span></div>
            )}
          </div>
          <Link href="/admin/accounting/headers" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Manage Headers &rarr;
          </Link>
        </Card>
      </div>
    </div>
  );
}