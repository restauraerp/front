'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { useReport } from '@/hooks/useReport';
import { useBusinessTime } from '@/hooks/useBranding';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { resolveRange, RANGE_OPTIONS, formatBucket, businessToday, ReportBucket } from '@/lib/reportRange';
import { formatTaka, formatCount } from '@/lib/format';
import {
  ReportLoading, ReportError, ReportNeedsDates, StatTile, MetricNote,
} from '@/components/reporting/ReportStates';
import { Banknote, Trash2, X } from 'lucide-react';

interface DeliveryChargesReport {
  bucket: ReportBucket;
  summary: {
    orders_count: number;
    total: number;
    collected: number;
    outstanding: number;
    avg_charge: number;
    paid_out: number;
    balance: number;
  };
  series: { bucket: string; orders: number; total: number }[];
}

interface Payout {
  id: number;
  amount: string | number;
  paid_on: string;
  reference: string | null;
  note: string | null;
  rider: { id: number; name: string } | null;
  location: { id: number; name: string } | null;
}

const emptyForm = () => ({ amount: '', paid_on: '', rider_id: '', location_id: '', reference: '', note: '' });

/**
 * Delivery charges, kept apart from sales revenue, and paid back out.
 *
 * Delivery is money the restaurant collects on the customer's behalf and
 * usually passes on to a rider or courier. This page shows what was collected,
 * records what has been paid out (each payout is booked as an expense, so it
 * comes off net profit), and what is still owed. Part of the delivery module.
 */
export default function DeliveryChargesPage() {
  const [range, setRange] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const bt = useBusinessTime();

  const period = resolveRange(range, customFrom, customTo, new Date(), {
    timezone: bt.timezone || undefined,
    dayStartMinutes: bt.dayStartMinutes,
    weekStartDay: bt.weekStartDay,
  });

  const { data, loading, error, reload } = useReport<DeliveryChargesReport>(
    '/reports/delivery-charges',
    { from: period.from, to: period.to, bucket: period.bucket, location_id: 'all' },
    { skip: period.incomplete || !bt.loaded },
  );

  // Payouts in the same window.
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const loadPayouts = useCallback(async () => {
    if (period.incomplete || !bt.loaded) return;
    const params = new URLSearchParams({ nopaginate: '1' });
    if (period.from) params.set('from', period.from);
    params.set('to', period.to);
    try {
      const res = await fetchApi(`/delivery-payouts?${params.toString()}`);
      setPayouts(res?.data ?? res ?? []);
    } catch {
      setPayouts([]);
    }
  }, [period.from, period.to, period.incomplete, bt.loaded]);

  useEffect(() => { loadPayouts(); }, [loadPayouts]);

  // Riders and outlets for the payout form.
  const [riders, setRiders] = useState<{ id: number; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    fetchApi('/users?nopaginate=1')
      .then((res) => {
        const users = res?.data ?? res ?? [];
        setRiders(users.filter((u: any) => u.roles?.some((r: any) => r.name === 'rider')));
      })
      .catch(() => setRiders([]));
    fetchApi('/locations')
      .then((res) => setLocations(res?.data ?? res ?? []))
      .catch(() => setLocations([]));
  }, []);

  // Record-payout modal.
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openModal = () => {
    const balance = data?.summary.balance ?? 0;
    setForm({
      ...emptyForm(),
      amount: balance > 0 ? balance.toFixed(2) : '',
      paid_on: businessToday(new Date(), bt.timezone || undefined, bt.dayStartMinutes),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async () => {
    if (!(Number(form.amount) > 0)) { setFormError('Enter the amount paid out.'); return; }
    if (!form.paid_on) { setFormError('Enter the date it was paid.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      await fetchApi('/delivery-payouts', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.amount).toFixed(2),
          paid_on: form.paid_on,
          rider_id: form.rider_id || null,
          location_id: form.location_id || null,
          reference: form.reference || null,
          note: form.note || null,
        }),
      });
      setModalOpen(false);
      reload();
      loadPayouts();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not record this payout.'));
    } finally {
      setSaving(false);
    }
  };

  const removePayout = async (payout: Payout) => {
    if (!confirm(`Delete this payout of ${formatTaka(Number(payout.amount))}? Its expense entry is removed too.`)) return;
    try {
      await fetchApi(`/delivery-payouts/${payout.id}`, { method: 'DELETE' });
      reload();
      loadPayouts();
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not delete this payout.'));
    }
  };

  const seriesColumns = [
    { key: 'bucket', label: 'Period', render: (row: DeliveryChargesReport['series'][number]) => formatBucket(row.bucket, data?.bucket ?? 'day') },
    { key: 'orders', label: 'Orders', render: (row: DeliveryChargesReport['series'][number]) => formatCount(row.orders) },
    { key: 'total', label: 'Delivery Charges', render: (row: DeliveryChargesReport['series'][number]) => formatTaka(row.total) },
  ];

  const payoutColumns = [
    { key: 'paid_on', label: 'Paid On', render: (row: Payout) => String(row.paid_on).slice(0, 10) },
    { key: 'rider', label: 'Paid To', render: (row: Payout) => row.rider?.name ?? '—' },
    { key: 'location', label: 'Outlet', render: (row: Payout) => row.location?.name ?? 'All outlets' },
    { key: 'reference', label: 'Reference', render: (row: Payout) => row.reference || '—' },
    { key: 'amount', label: 'Amount', render: (row: Payout) => formatTaka(Number(row.amount)) },
    {
      key: 'actions', label: '', render: (row: Payout) => (
        <button className="btn btn-xs btn-ghost text-error" title="Delete payout" onClick={() => removePayout(row)}>
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Delivery Charges</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select className="select select-bordered select-sm" value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {range === 'custom' && (
            <>
              <input type="date" className="input input-bordered input-sm" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <span className="text-sm text-base-content/50">to</span>
              <input type="date" className="input input-bordered input-sm" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          )}
          <button className="btn btn-primary btn-sm gap-1" onClick={openModal} disabled={!data}>
            <Banknote size={14} /> Record Payout
          </button>
        </div>
      </div>

      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
      </p>

      {period.incomplete ? (
        <Card><ReportNeedsDates /></Card>
      ) : error ? (
        <ReportError message={error} onRetry={reload} />
      ) : loading || !data ? (
        <ReportLoading />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            <StatTile label="Delivery Charges" value={formatTaka(data.summary.total)} sub={`${formatCount(data.summary.orders_count)} orders · avg ${formatTaka(data.summary.avg_charge)}`} tone="primary" />
            <StatTile label="Collected" value={formatTaka(data.summary.collected)} sub="On paid orders" tone="success" />
            <StatTile
              label="Outstanding"
              value={formatTaka(data.summary.outstanding)}
              sub={data.summary.outstanding > 0 ? 'On orders not yet paid' : 'Nothing outstanding'}
              tone="warning"
            />
            <StatTile label="Paid Out" value={formatTaka(data.summary.paid_out)} sub="To riders/couriers, booked as expenses" tone="info" />
            <StatTile
              label="Balance to Pay Out"
              value={formatTaka(data.summary.balance)}
              sub={data.summary.balance > 0 ? 'Collected but not yet paid out' : data.summary.balance < 0 ? 'Paid out more than collected this period' : 'All paid out'}
              tone={data.summary.balance > 0 ? 'warning' : 'success'}
            />
          </div>

          <Card title="Payouts" className="mb-6">
            {payouts.length === 0 ? (
              <p className="text-sm text-base-content/50 py-4 text-center">No payouts recorded in this period.</p>
            ) : (
              <Table columns={payoutColumns} data={payouts} />
            )}
          </Card>

          <Card title="By Period">
            <MetricNote>
              Delivery charges are reported separately from sales revenue so they can be paid out to
              riders or couriers. Each payout recorded here is booked as an expense under
              &ldquo;Delivery Payouts&rdquo;, so it comes off net profit in the Profit report.
            </MetricNote>
            <Table columns={seriesColumns} data={data.series} />
          </Card>
        </>
      )}

      {modalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg">Record Delivery Payout</h3>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setModalOpen(false)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">Amount</label>
                <input type="number" step="0.01" min="0" className="input input-bordered w-full" value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                <p className="text-xs text-base-content/50 mt-1">Balance this period: {formatTaka(data?.summary.balance ?? 0)}</p>
              </div>
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">Paid on</label>
                <input type="date" className="input input-bordered w-full" value={form.paid_on}
                  onChange={(e) => setForm((f) => ({ ...f, paid_on: e.target.value }))} />
              </div>
              <SearchSelect
                label="Paid to (rider)"
                value={form.rider_id}
                onChange={(v) => setForm((f) => ({ ...f, rider_id: String(v) }))}
                options={riders.map((r) => ({ value: r.id, label: r.name }))}
                placeholder="Optional — courier or several riders"
                searchPlaceholder="Search riders…"
                clearable
              />
              <SearchSelect
                label="Outlet"
                value={form.location_id}
                onChange={(v) => setForm((f) => ({ ...f, location_id: String(v) }))}
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
                placeholder="All outlets"
                searchPlaceholder="Search outlets…"
                clearable
              />
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">Reference</label>
                <input type="text" className="input input-bordered w-full" placeholder="e.g. bKash TrxID" value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">Note</label>
                <textarea className="textarea textarea-bordered w-full" rows={2} value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
              {formError && <div className="alert alert-error py-2"><span className="text-sm">{formError}</span></div>}
              <button className="btn btn-primary w-full" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : 'Record Payout'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setModalOpen(false)} />
        </dialog>
      )}
    </div>
  );
}
