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
          // `percentage` is the column on tax_rules. This used to read `rate`
          // and `type`, neither of which exists in the schema, so the column
          // rendered "৳0.00" for every row regardless of the stored value.
          key: 'percentage',
          label: 'Rate',
          render: (row: any) => `${Number(row.percentage || 0)}%`,
        },
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
        { key: 'percentage', label: 'Rate (%)', type: 'number', step: '0.01' },
        { key: 'is_active', label: 'Status', options: [
          { value: '1', label: 'Active' },
          { value: '0', label: 'Inactive' },
        ]},
      ]}
      // The "Type" selector (Percentage / Fixed Amount) is gone: tax_rules has
      // no `type` column, so the choice was posted, silently discarded, and
      // every rule behaved as a percentage anyway. Supporting fixed-amount tax
      // needs a schema change rather than a form field.
      defaultValues={{ name: '', percentage: '', is_active: '1' }}
    />
  );
}
