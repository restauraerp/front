'use client';
import { CrudPage } from '@/components/ui/CrudPage';

export default function SuppliersPage() {
  return (
    <CrudPage
      title="Suppliers"
      endpoint="/suppliers"
      addLabel="+ New Supplier"
      tableColumns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Supplier' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
      ]}
      formFields={[
        { key: 'name', label: 'Supplier Name' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone' },
        { key: 'address', label: 'Address', textarea: true, colSpan: true },
      ]}
      defaultValues={{ name: '', email: '', phone: '', address: '' }}
    />
  );
}
