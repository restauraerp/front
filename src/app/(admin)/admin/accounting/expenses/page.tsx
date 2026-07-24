'use client';
import { useEffect, useState } from 'react';
import { CrudPage } from '@/components/ui/CrudPage';
import { fetchApi } from '@/lib/api';
import { sendGTMEvent } from '@next/third-parties/google';

export default function ExpensesPage() {
  const [locations, setLocations] = useState<{value: string, label: string}[]>([
    { value: '', label: 'Generic (All Branches)' }
  ]);

  useEffect(() => {
    sendGTMEvent({ event: 'page_view', page_path: '/admin/accounting/expenses' });
  }, []);

  useEffect(() => {
    fetchApi('/locations?nopaginate=1').then((res) => {
      const locs = (res.data || res.data?.data || res || []).map((l: any) => ({
        value: l.id.toString(),
        label: l.name
      }));
      setLocations([{ value: '', label: 'Generic (All Branches)' }, ...locs]);
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
        { key: 'category', label: 'Category' },
        { 
          key: 'amount', 
          label: 'Amount (৳)', 
          render: (row) => `৳${Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
        },
        { 
          key: 'location_id', 
          label: 'Branch',
          render: (row) => row.location ? row.location.name : <span className="badge badge-neutral badge-sm">Generic</span>
        },
        {
          key: 'logged_by',
          label: 'Logged By',
          render: (row) => (row.logged_by && typeof row.logged_by === 'object') ? row.logged_by.name : (row.logged_by || 'System')
        },
        { 
          key: 'created_at', 
          label: 'Date',
          render: (row) => new Date(row.created_at).toLocaleDateString()
        }
      ]}
      formFields={[
        { key: 'location_id', label: 'Branch / Location', options: locations },
        { key: 'category', label: 'Category (e.g. Utility, Maintenance)' },
        { key: 'amount', label: 'Amount', type: 'number', step: '0.01' },
      ]}
      defaultValues={{ location_id: '', category: '', amount: '' }}
    />
  );
}
