'use client';
import React, { useEffect, useState } from 'react';
import { CrudPage } from '@/components/ui/CrudPage';
import { Card } from '@/components/ui/Card';
import { fetchApi, apiErrorMessage } from '@/lib/api';

interface PartnerRow {
  id: number;
  name: string;
  commission_rate: string | number;
  is_active: boolean;
  outstanding?: number;
}

const money = (value: unknown) =>
  `৳${Number(value ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The third parties that send the restaurant orders and keep a cut.
 *
 * The balance owed sits at the top rather than in a column, because it is the
 * question this screen exists to answer: an aggregator pays weeks in arrears,
 * and "are they behind?" is not something a restaurant can work out from a list
 * of orders.
 */
export default function PartnersPage() {
  const [owed, setOwed] = useState<{ name: string; outstanding: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;

    fetchApi('/reports/partners')
      .then((res) => {
        if (!active) return;
        setOwed((res?.partners ?? []).map((p: { name: string; outstanding: number }) => ({
          name: p.name,
          outstanding: p.outstanding,
        })));
      })
      .catch((err) => active && setError(apiErrorMessage(err, 'Could not load partner balances.')));

    return () => { active = false; };
  }, [refresh]);

  const totalOwed = (owed ?? []).reduce((sum, p) => sum + p.outstanding, 0);

  return (
    <div className="space-y-6">
      <Card title="Owed to this restaurant">
        {error ? (
          <p className="text-error text-sm">{error}</p>
        ) : owed === null ? (
          <div className="skeleton h-8 w-40" />
        ) : owed.length === 0 ? (
          <p className="text-sm text-base-content/60">No partners yet.</p>
        ) : (
          <>
            <div className="text-3xl font-bold text-primary">{money(totalOwed)}</div>
            <p className="text-sm text-base-content/60 mt-1 mb-3">
              Earned on partner orders, less what has been paid over.
            </p>
            <div className="flex flex-wrap gap-2">
              {owed.filter((p) => p.outstanding !== 0).map((p) => (
                <span key={p.name} className="badge badge-outline gap-1 py-3">
                  {p.name} <span className="font-semibold">{money(p.outstanding)}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      <CrudPage
        title="Partners"
        subtitle="Delivery apps and other channels that send you orders."
        endpoint="/partners"
        addLabel="+ New Partner"
        countLabel="partners"
        onRowClick={() => setRefresh((n) => n + 1)}
        tableColumns={[
          { key: 'name', label: 'Partner' },
          { key: 'contact_name', label: 'Contact' },
          { key: 'phone', label: 'Phone' },
          {
            key: 'commission_rate',
            label: 'Their cut',
            render: (row) => `${Number((row as unknown as PartnerRow).commission_rate).toFixed(2)}%`,
          },
          { key: 'orders_count', label: 'Orders' },
          {
            key: 'is_active',
            label: 'Status',
            render: (row) => (row as unknown as PartnerRow).is_active
              ? <span className="badge badge-success badge-sm text-white">Active</span>
              : <span className="badge badge-ghost badge-sm">Off</span>,
          },
        ]}
        formFields={[
          { key: 'name', label: 'Partner name *' },
          { key: 'commission_rate', label: 'Their cut (%) *', type: 'number', step: '0.01' },
          { key: 'contact_name', label: 'Contact person' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email', type: 'email' },
          {
            key: 'is_active',
            label: 'Status',
            options: [{ value: '1', label: 'Active' }, { value: '0', label: 'Switched off' }],
          },
          { key: 'notes', label: 'Notes', textarea: true, colSpan: true },
        ]}
        defaultValues={{
          name: '',
          // What the aggregators in this market ask for, and what the
          // restaurant asked us to default to.
          commission_rate: '25',
          contact_name: '',
          phone: '',
          email: '',
          is_active: '1',
          notes: '',
        }}
      />
    </div>
  );
}
