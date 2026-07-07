'use client';
import { CrudPage } from '@/components/ui/CrudPage';

export default function CustomersPage() {
  return (
    <CrudPage
      title="Customers"
      endpoint="/customers"
      addLabel="+ New Customer"
      tableColumns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'organization', label: 'Organization', render: (row) => row.organization?.name || '-' },
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Address' },
        { key: 'tier', label: 'Tier' },
        { key: 'loyalty_points', label: 'Points' },
      ]}
      formFields={[
        { key: 'name', label: 'Full Name *' },
        { key: 'phone', label: 'Phone *' },
        { key: 'organization_name', label: 'Organization (Optional)' },
        { key: 'email', label: 'Email (Optional)', type: 'email' },
        { key: 'address', label: 'Location / Address (Optional)' },
        { key: 'google_map_location', label: 'Google Maps Link/Coordinates (Optional)' },
      ]}
      defaultValues={{ name: '', phone: '', email: '', address: '', organization_name: '', google_map_location: '' }}
    />
  );
}
