'use client';
import { CrudPage } from '@/components/ui/CrudPage';

export default function TaxesPage() {
  return (
    <CrudPage
      title="Tax Rules"
      endpoint="/tax-rules"
      addLabel="+ New Tax Rule"
      tableColumns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Tax Name' },
        { key: 'rate', label: 'Rate' },
        { key: 'type', label: 'Type' },
        { key: 'is_active', label: 'Active' },
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
