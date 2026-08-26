'use client';
import { useEffect, useState } from 'react';
import { CrudPage } from '@/components/ui/CrudPage';
import { fetchApi } from '@/lib/api';
import { useLocations } from '@/hooks/useLocations';
import { sendGTMEvent } from '@next/third-parties/google';

export default function IncomesPage() {
  // Same branch reasoning as the expenses screen: at one outlet "Generic (All
  // Branches)" and the branch itself are the same place, so the field is
  // dropped - but the income is still attributed to that outlet, so a second
  // branch opening later does not inherit an unassignable pile of takings.
  const { single, only, loaded: outletsLoaded } = useLocations();

  const [locations, setLocations] = useState<{value: string, label: string}[]>([
    { value: '', label: 'Generic (All Branches)' }
  ]);
  const [headers, setHeaders] = useState<{value: string, label: string}[]>([
    { value: '', label: '— No Header —' }
  ]);

  useEffect(() => {
    sendGTMEvent({ event: 'page_view', page_path: '/admin/accounting/incomes' });
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
        .filter((h: any) => h.type === 'income' && h.is_active)
        .map((h: any) => ({ value: h.id.toString(), label: h.name }));
      setHeaders([{ value: '', label: '— No Header —' }, ...hdrs]);
    }).catch(console.error);
  }, []);

  // CrudPage reads defaultValues once into useState, so the outlet has to be
  // known before it mounts - arriving a moment later would leave location_id
  // empty and quietly file every income as generic.
  if (!outletsLoaded) {
    return <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary" /></div>;
  }

  return (
    <CrudPage
      title="Income"
      subtitle={single ? "Log income that arrives outside the till." : "Log income that arrives outside the till, across your branches."}
      endpoint="/incomes"
      addLabel="+ Log Income"
      tableColumns={[
        { key: 'id', label: 'ID' },
        {
          key: 'header',
          label: 'Header',
          render: (row: any) => row.header
            ? <span className="badge badge-outline badge-sm font-medium whitespace-nowrap">{row.header.name}</span>
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
        ...(single ? [] : [{ key: 'location_id', label: 'Branch / Location', options: locations }]),
        { key: 'category', label: 'Category (e.g. Hall Rental, Scrap Sale)' },
        { key: 'amount', label: 'Amount', type: 'number', step: '0.01' },
      ]}
      defaultValues={{
        header_id: '',
        location_id: single && only ? String(only.id) : '',
        category: '',
        amount: '',
      }}
    />
  );
}
