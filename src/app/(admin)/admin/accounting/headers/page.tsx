'use client';
import { useEffect } from 'react';
import { CrudPage } from '@/components/ui/CrudPage';
import { sendGTMEvent } from '@next/third-parties/google';

export default function AccountingHeadersPage() {
  useEffect(() => {
    sendGTMEvent({ event: 'page_view', page_path: '/admin/accounting/headers' });
  }, []);

  return (
    <CrudPage
      title="Accounting Headers"
      subtitle="Categorise ledger entries under named income or expense headers."
      endpoint="/accounting-headers"
      addLabel="+ New Header"
      tableColumns={[
        { key: 'name', label: 'Name' },
        {
          key: 'type',
          label: 'Type',
          render: (row: any) => (
            <span className={`badge font-medium capitalize ${row.type === 'income' ? 'badge-success text-white' : 'badge-error text-white'}`}>
              {row.type}
            </span>
          ),
        },
        { key: 'description', label: 'Description' },
        {
          key: 'is_active',
          label: 'Active',
          render: (row: any) => (
            <span className={`badge badge-sm ${row.is_active ? 'badge-success' : 'badge-ghost'}`}>
              {row.is_active ? 'Yes' : 'No'}
            </span>
          ),
        },
      ]}
      formFields={[
        { key: 'name', label: 'Header Name' },
        {
          key: 'type',
          label: 'Type',
          options: [
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expense' },
          ],
        },
        { key: 'description', label: 'Description (optional)' },
        {
          key: 'is_active',
          label: 'Active',
          options: [
            { value: '1', label: 'Yes' },
            { value: '0', label: 'No' },
          ],
        },
      ]}
      defaultValues={{ name: '', type: 'income', description: '', is_active: '1' }}
    />
  );
}
