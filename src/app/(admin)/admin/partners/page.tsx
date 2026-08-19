'use client';
import React, { useEffect, useState } from 'react';
import { CrudPage } from '@/components/ui/CrudPage';
import { Card } from '@/components/ui/Card';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { SETTING_KEYS, useSetting, clearBrandingCache } from '@/hooks/useBranding';

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

  // Each partner's cut is their own - one aggregator takes 25%, the next takes
  // 18%. This is only what a *new* partner starts at, so a restaurant that has
  // negotiated the same number with everyone stops retyping it.
  const { value: defaultCut, loaded: cutLoaded } = useSetting(SETTING_KEYS.partnerDefaultCommission, '25');
  const [editingCut, setEditingCut] = useState(false);
  const [cutDraft, setCutDraft] = useState('');

  const saveDefaultCut = async () => {
    try {
      const existing = await fetchApi('/website-settings?nopaginate=1');
      const rows = (existing?.data ?? existing ?? []) as { id: number; key: string }[];
      const row = rows.find((r) => r.key === SETTING_KEYS.partnerDefaultCommission);
      const body = JSON.stringify({ key: SETTING_KEYS.partnerDefaultCommission, value: cutDraft, type: 'string' });

      await (row
        ? fetchApi(`/website-settings/${row.id}`, { method: 'PUT', body })
        : fetchApi('/website-settings', { method: 'POST', body }));

      clearBrandingCache();
      setEditingCut(false);
      setRefresh((n) => n + 1);
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not save the default rate.'));
    }
  };

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

  if (!cutLoaded) {
    return <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary" /></div>;
  }

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

      <Card title="Default cut for a new partner">
        {editingCut ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className="input input-bordered input-sm w-28"
              value={cutDraft}
              onChange={(e) => setCutDraft(e.target.value)}
              aria-label="Default commission rate"
            />
            <span className="text-sm">%</span>
            <button className="btn btn-sm btn-primary" onClick={saveDefaultCut}>Save</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditingCut(false)}>Cancel</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold text-primary">{Number(defaultCut).toFixed(2)}%</span>
            <button
              className="btn btn-sm btn-ghost border border-base-300"
              onClick={() => { setCutDraft(defaultCut); setEditingCut(true); }}
            >
              Change
            </button>
            <span className="text-sm text-base-content/60">
              Only the starting value — each partner keeps its own rate.
            </span>
          </div>
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
          commission_rate: defaultCut,
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
