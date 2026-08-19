'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { CrudPage } from '@/components/ui/CrudPage';
import { Button } from '@/components/ui/Button';
import { downloadApi, apiErrorMessage } from '@/lib/api';

/** Default is most recent purchase - see CustomerController::SORTS. */
const SORTS = [
  { value: 'recent', label: 'Most recent purchase' },
  { value: 'value', label: 'Highest total spend' },
  { value: 'name', label: 'Name (A-Z)' },
];

/**
 * Thresholds rather than a free-text box. "Customers worth more than X" is a
 * question asked in round numbers, and a picker cannot be typed into a state
 * that returns nothing.
 */
const MIN_PURCHASE = [
  { value: '', label: 'Any spend' },
  { value: '1000', label: '৳1,000+' },
  { value: '5000', label: '৳5,000+' },
  { value: '10000', label: '৳10,000+' },
  { value: '50000', label: '৳50,000+' },
];

const money = (value: unknown) =>
  `৳${Number(value ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CustomersPage() {
  const router = useRouter();
  const [sort, setSort] = useState('recent');
  const [minPurchase, setMinPurchase] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // The export carries the same sort and filter the page is showing, so a
      // downloaded file always matches the list it was downloaded from.
      const params = new URLSearchParams({ sort });
      if (minPurchase) params.append('min_purchase', minPurchase);

      await downloadApi(`/customers-export?${params}`, `customers-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      alert(apiErrorMessage(error, 'Could not export the customer list.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <CrudPage
      title="Customers"
      endpoint="/customers"
      addLabel="+ New Customer"
      countLabel="customers"
      extraParams={{ sort, min_purchase: minPurchase }}
      onRowClick={(row) => router.push(`/admin/crm/customers/${row.id}`)}
      toolbar={
        <>
          <select
            className="select select-bordered select-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort customers"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            className="select select-bordered select-sm"
            value={minPurchase}
            onChange={(e) => setMinPurchase(e.target.value)}
            aria-label="Minimum total spend"
          >
            {MIN_PURCHASE.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <Button onClick={handleExport} variant="ghost" className="gap-2 border border-base-300" disabled={exporting}>
            {exporting ? <span className="loading loading-spinner loading-xs" /> : <Download size={14} />} CSV
          </Button>
        </>
      }
      tableColumns={[
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'organization', label: 'Organization', render: (row) => row.organization?.name || '-' },
        { key: 'orders_count', label: 'Orders' },
        { key: 'orders_total', label: 'Total spent', render: (row) => money(row.orders_total) },
        {
          key: 'last_order_at',
          label: 'Last order',
          render: (row) => (row.last_order_at ? new Date(row.last_order_at).toLocaleDateString() : '—'),
        },
        { key: 'tier', label: 'Tier' },
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
