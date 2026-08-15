'use client';
import { useEffect, useState } from 'react';
import { CrudPage } from '@/components/ui/CrudPage';
import { fetchApi } from '@/lib/api';
import { sendGTMEvent } from '@next/third-parties/google';

export default function ExpensesPage() {
  const [locations, setLocations] = useState<{value: string, label: string}[]>([
    { value: '', label: 'Generic (All Branches)' }
  ]);
  const [headers, setHeaders] = useState<{value: string, label: string}[]>([
    { value: '', label: '— No Header —' }
  ]);

  useEffect(() => {
    sendGTMEvent({ event: 'page_view', page_path: '/admin/accounting/expenses' });
  }, []);

  useEffect(() => {
    Promise.all([
      fetchApi('/locations?nopaginate=1'),
      fetchApi('/accounting-headers?nopaginate=1'),
    ]).then(([locRes, headerRes]) => {
      const locs = (locRes.data || locRes.data?.data || locRes || []).map((l: any) => ({
        value: l.id.toString(),
        label: l.name,
      }));
      setLocations([{ value: '', label: 'Generic (All Branches)' }, ...locs]);

      const hdrs = (headerRes.data || headerRes.data?.data || headerRes || [])
        .filter((h: any) => h.type === 'expense' && h.is_active)
        .map((h: any) => ({ value: h.id.toString(), label: h.name }));
      setHeaders([{ value: '', label: '— No Header —' }, ...hdrs]);
    }).catch(console.error);
  }, []);

  return (
    <CrudPage
      title="Expenses"
      subtitle="Log and track operational expenses across your branches."
      endpoint="/expenses"
      addLabel="+ Log Expense"
      tableColumns={[
        { key: 'id', label: 'ID' },
        {
          key: 'header',
          label: 'Header',
          render: (row: any) => row.header
            ? <span className="badge badge-outline badge-sm font-medium">{row.header.name}</span>
            : <span className="text-base-content/30 text-xs">—</span>,
        },
        { key: 'category', label: 'Category' },
        {
          key: 'amount',
          label: 'Amount (৳)',
          render: (row: any) => `৳${Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        },
        {
          key: 'location_id',
          label: 'Branch',
          render: (row: any) => row.location ? row.location.name : <span className="badge badge-neutral badge-sm">Generic</span>
        },
        {
          key: 'logged_by',
          label: 'Logged By',
          render: (row: any) => (row.logged_by && typeof row.logged_by === 'object') ? row.logged_by.name : (row.logged_by || 'System')
        },
        {
          key: 'created_at',
          label: 'Date',
          render: (row: any) => new Date(row.created_at).toLocaleDateString()
        }
      ]}
      formFields={[
        { key: 'header_id', label: 'Accounting Header', options: headers },
        { key: 'location_id', label: 'Branch / Location', options: locations },
        { key: 'category', label: 'Category (e.g. Utility, Maintenance)' },
        { key: 'amount', label: 'Amount', type: 'number', step: '0.01' },
      ]}
      defaultValues={{ header_id: '', location_id: '', category: '', amount: '' }}
    />
  );
}
