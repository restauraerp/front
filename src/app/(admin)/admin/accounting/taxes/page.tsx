'use client';
import { useEffect } from 'react';
import { CrudPage } from '@/components/ui/CrudPage';
import { sendGTMEvent } from '@next/third-parties/google';

export default function TaxesPage() {
  useEffect(() => {
    sendGTMEvent({ event: 'page_view', page_path: '/admin/accounting/taxes' });
  }, []);

  return (
    <CrudPage
      title="Tax Rules"
      subtitle="Configure sales taxes applied to different items."
      endpoint="/tax-rules"
      addLabel="+ New Tax Rule"
      tableColumns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Tax Name' },
        {
          key: 'rate',
          label: 'Rate',
          render: (row: any) => {
            const isPercentage = String(row.type).toLowerCase() === 'percentage';
            const rate = Number(row.rate || 0);
            return isPercentage
              ? `${rate}%`
              : `৳${rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
          }
        },
        { key: 'type', label: 'Type' },
        {
          key: 'is_active',
          label: 'Status',
          render: (row: any) => {
            const active = row.is_active === true || row.is_active === 1 || row.is_active === '1';
            return (
              <span className={`badge ${active ? 'badge-success text-white' : 'badge-ghost'} font-medium px-3 py-1 h-auto rounded-full`}>
                {active ? 'Active' : 'Inactive'}
              </span>
            );
          }
        },
      ]}
      formFields={[
        { key: 'name', label: 'Tax Name' },
        { key: 'rate', label: 'Rate', type: 'number', step: '0.01' },
        { key: 'type', label: 'Type', options: [
          { value: 'Percentage', label: 'Percentage (%)' },
          { value: 'Fixed', label: 'Fixed Amount (৳)' },
        ]},
        { key: 'is_active', label: 'Status', options: [
          { value: '1', label: 'Active' },
          { value: '0', label: 'Inactive' },
        ]},
      ]}
      defaultValues={{ name: '', rate: '', type: 'Percentage', is_active: '1' }}
    />
  );
}
