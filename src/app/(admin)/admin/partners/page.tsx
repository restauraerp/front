'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CrudPage } from '@/components/ui/CrudPage';
import { Card } from '@/components/ui/Card';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { SETTING_KEYS, useSetting, clearBrandingCache } from '@/hooks/useBranding';
import { useDialogs } from '@/components/ui/Dialogs';
import { SettleDueModal } from '@/components/orders/SettleDueModal';
import {
  Users,
  Share2,
  DollarSign,
  Plus,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Receipt,
  FileText,
} from 'lucide-react';

interface PartnerRow {
  id: number;
  name: string;
  commission_rate: string | number;
  is_active: boolean;
  outstanding?: number;
}

interface PartnerPayoutRow {
  id: number;
  partner_id: number;
  partner?: { id: number; name: string };
  amount: number | string;
  payment_method?: string | null;
  cash_storage_id?: number | null;
  cash_storage?: { id: number; name: string; category?: string } | null;
  orders_count?: number;
  received_on: string;
  reference?: string | null;
  note?: string | null;
  created_at?: string;
}

const money = (value: unknown) =>
  `৳${Number(value ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const paymentBadge = (status?: string | null): { className: string; label: string } => {
  if (status === 'paid') return { className: 'badge-success text-white', label: 'Paid' };
  if (status === 'due') return { className: 'badge-warning', label: 'Due' };
  return { className: 'badge-error text-white', label: 'Unpaid' };
};

export default function PartnersPage() {
  const { confirm, alert, dialog } = useDialogs();

  const [activeTab, setActiveTab] = useState<'partners' | 'orders' | 'payouts'>('partners');
  const [owed, setOwed] = useState<{ name: string; outstanding: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  // Default cut setting
  const { value: defaultCut, loaded: cutLoaded } = useSetting(SETTING_KEYS.partnerDefaultCommission, '25');
  const [editingCut, setEditingCut] = useState(false);
  const [cutDraft, setCutDraft] = useState('');

  // Partner list for filters & modals
  const [partnersList, setPartnersList] = useState<{ id: number; name: string; commission_rate: number }[]>([]);

  // 3rd Party Orders Tab state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [partnerFilter, setPartnerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  const [settlingOrder, setSettlingOrder] = useState<any | null>(null);

  // Cash storages for payout deposits
  const [cashStorages, setCashStorages] = useState<{ id: number; name: string; category: string }[]>([]);

  // Payouts Tab state
  const [payouts, setPayouts] = useState<PartnerPayoutRow[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [payoutsTotalPages, setPayoutsTotalPages] = useState(1);
  const [payoutMethodFilter, setPayoutMethodFilter] = useState('');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    partner_id: '',
    amount: '',
    received_on: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    cash_storage_id: '',
    reference: '',
    note: '',
    order_ids: [] as number[],
  });

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
      await alert({
        title: 'Save Failed',
        message: apiErrorMessage(err, 'Could not save the default rate.'),
        tone: 'btn-error',
      });
    }
  };

  // Load balances & active partners list
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

    fetchApi('/partners?nopaginate=1')
      .then((res) => {
        if (!active) return;
        const list = res?.data ?? res ?? [];
        setPartnersList(list);
      })
      .catch(console.error);

    fetchApi('/cash-storages?nopaginate=1')
      .then((res) => {
        if (!active) return;
        const list = res?.data ?? res ?? [];
        setCashStorages(list);
      })
      .catch(console.error);

    return () => { active = false; };
  }, [refresh]);

  // Load 3rd party orders when orders tab is active
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams({
        partner_only: '1',
        page: String(ordersPage),
      });
      if (partnerFilter) params.set('partner_id', partnerFilter);
      if (statusFilter) params.set('payment_status', statusFilter);
      if (orderSearch.trim()) params.set('partner_order_id', orderSearch.trim());

      const res = await fetchApi(`/orders?${params.toString()}`);
      setOrders(res.data || []);
      setOrdersTotalPages(res.last_page || 1);
      setOrdersTotal(res.total ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersPage, partnerFilter, statusFilter, orderSearch]);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, loadOrders]);

  // Load payouts when payouts tab is active
  const loadPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(payoutsPage) });
      if (partnerFilter) params.set('partner_id', partnerFilter);
      if (payoutMethodFilter) params.set('payment_method', payoutMethodFilter);

      const res = await fetchApi(`/partner-payouts?${params.toString()}`);
      setPayouts(res.data || []);
      setPayoutsTotalPages(res.last_page || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setPayoutsLoading(false);
    }
  }, [payoutsPage, partnerFilter, payoutMethodFilter]);

  useEffect(() => {
    if (activeTab === 'payouts') {
      loadPayouts();
    }
  }, [activeTab, loadPayouts]);

  // Batch Payout selection totals
  const selectedOrdersList = orders.filter((o) => selectedOrderIds.includes(o.id));
  const selectedGrossTotal = selectedOrdersList.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const selectedNetTotal = selectedOrdersList.reduce((sum, o) => {
    return sum + (parseFloat(o.total || 0) - parseFloat(o.partner_commission_amount || 0));
  }, 0);
  const dueOrdersOnPage = orders.filter((o) => o.payment_status !== 'paid').map((o) => o.id);

  const handleOpenBatchPayoutModal = async () => {
    if (selectedOrderIds.length === 0) return;
    const partnerIds = Array.from(new Set(selectedOrdersList.map((o) => o.partner_id).filter(Boolean)));
    if (partnerIds.length > 1) {
      await alert({
        title: 'Multiple Partners Selected',
        message: 'Please filter or select orders from a single 3rd party partner to record a batch payout.',
        tone: 'btn-warning',
      });
      return;
    }

    const partnerId = partnerIds[0] ? String(partnerIds[0]) : (partnerFilter || '');
    setPayoutForm({
      partner_id: partnerId,
      amount: selectedNetTotal.toFixed(2),
      received_on: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      cash_storage_id: '',
      reference: '',
      note: `Batch settlement for ${selectedOrderIds.length} orders`,
      order_ids: [...selectedOrderIds],
    });
    setShowPayoutModal(true);
  };

  // Record payout submission
  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutForm.partner_id || !payoutForm.amount || !payoutForm.received_on) {
      await alert({
        title: 'Missing Information',
        message: 'Please choose a partner, enter an amount, and select received date.',
        tone: 'btn-warning',
      });
      return;
    }

    setSubmittingPayout(true);
    try {
      await fetchApi('/partner-payouts', {
        method: 'POST',
        body: JSON.stringify({
          partner_id: Number(payoutForm.partner_id),
          amount: Number(payoutForm.amount),
          received_on: payoutForm.received_on,
          payment_method: payoutForm.payment_method || null,
          cash_storage_id: payoutForm.cash_storage_id ? Number(payoutForm.cash_storage_id) : null,
          reference: payoutForm.reference || null,
          note: payoutForm.note || null,
          order_ids: payoutForm.order_ids && payoutForm.order_ids.length > 0 ? payoutForm.order_ids : undefined,
        }),
      });

      const settledCount = payoutForm.order_ids.length;
      setShowPayoutModal(false);
      setSelectedOrderIds([]);
      setPayoutForm({
        partner_id: '',
        amount: '',
        received_on: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        cash_storage_id: '',
        reference: '',
        note: '',
        order_ids: [],
      });
      setRefresh((n) => n + 1);
      loadPayouts();
      loadOrders();
      await alert({
        title: 'Payout Recorded',
        message: settledCount > 0
          ? `Partner payout recorded successfully! ${settledCount} order(s) marked as paid and synced with the accounting ledger.`
          : 'Partner payout recorded successfully and synced with the accounting ledger.',
        tone: 'btn-success',
      });
    } catch (err) {
      await alert({
        title: 'Submission Failed',
        message: apiErrorMessage(err, 'Could not record partner payout.'),
        tone: 'btn-error',
      });
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Delete a payout
  const handleDeletePayout = async (id: number) => {
    const ok = await confirm({
      title: 'Delete Payout Record?',
      message: 'This will remove this payout and its corresponding entry from the accounting ledger.',
      action: 'Delete Payout',
      tone: 'btn-error',
    });
    if (!ok) return;

    try {
      await fetchApi(`/partner-payouts/${id}`, { method: 'DELETE' });
      setRefresh((n) => n + 1);
      loadPayouts();
    } catch (err) {
      await alert({
        title: 'Delete Failed',
        message: apiErrorMessage(err, 'Could not delete payout.'),
        tone: 'btn-error',
      });
    }
  };

  const totalOwed = (owed ?? []).reduce((sum, p) => sum + p.outstanding, 0);

  if (!cutLoaded) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-base-300 pb-3">
        <div className="tabs tabs-boxed bg-base-200">
          <button
            className={`tab gap-2 font-medium ${activeTab === 'partners' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('partners')}
          >
            <Users size={16} /> Partners & Profiles
          </button>
          <button
            className={`tab gap-2 font-medium ${activeTab === 'orders' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Share2 size={16} /> 3rd Party Orders
          </button>
          <button
            className={`tab gap-2 font-medium ${activeTab === 'payouts' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('payouts')}
          >
            <DollarSign size={16} /> Payouts & Settlements
          </button>
        </div>

        {activeTab === 'payouts' && (
          <button
            className="btn btn-primary btn-sm gap-2"
            onClick={() => setShowPayoutModal(true)}
          >
            <Plus size={16} /> Record Payout
          </button>
        )}
      </div>

      {/* Shared Balances Overview Card */}
      <Card title="Owed by 3rd Party Partners">
        {error ? (
          <p className="text-error text-sm">{error}</p>
        ) : owed === null ? (
          <div className="skeleton h-8 w-40" />
        ) : owed.length === 0 ? (
          <p className="text-sm text-base-content/60">No partners configured yet.</p>
        ) : (
          <>
            <div className="text-3xl font-bold text-primary">{money(totalOwed)}</div>
            <p className="text-sm text-base-content/60 mt-1 mb-3">
              Total earned across partner orders, less payouts received to date.
            </p>
            <div className="flex flex-wrap gap-2">
              {owed.map((p) => (
                <span
                  key={p.name}
                  className={`badge gap-1 py-3 ${p.outstanding > 0 ? 'badge-warning font-medium' : 'badge-outline'}`}
                >
                  {p.name}: <span className="font-semibold">{money(p.outstanding)}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* TAB 1: Partners & Profiles */}
      {activeTab === 'partners' && (
        <div className="space-y-6">
          <Card title="Default Cut for New Partners">
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
                  Starting commission rate applied to new aggregator channels.
                </span>
              </div>
            )}
          </Card>

          <CrudPage
            title="Partners"
            subtitle="Aggregators and channels that send orders and pay in arrears."
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
                label: 'Commission Cut',
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
              { key: 'commission_rate', label: 'Commission rate (%) *', type: 'number', step: '0.01' },
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
      )}

      {/* TAB 2: 3rd Party Orders Dedicated Listing */}
      {activeTab === 'orders' && (
        <Card title="3rd Party Partner Orders">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="select select-bordered select-sm"
                value={partnerFilter}
                onChange={(e) => { setPartnerFilter(e.target.value); setOrdersPage(1); }}
              >
                <option value="">All Partners</option>
                {partnersList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                className="select select-bordered select-sm"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setOrdersPage(1); }}
              >
                <option value="">All Payment Statuses</option>
                <option value="due">Due Only</option>
                <option value="paid">Paid Only</option>
              </select>

              <div className="join">
                <input
                  type="text"
                  placeholder="Partner Ref / Order #"
                  className="input input-bordered input-sm join-item w-44"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
                />
                <button className="btn btn-sm btn-square join-item" onClick={loadOrders}>
                  <Search size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-base-content/60">
                {ordersTotal} order{ordersTotal === 1 ? '' : 's'}
              </span>
              <button
                className="btn btn-ghost btn-sm btn-square"
                onClick={loadOrders}
                title="Refresh orders"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Batch Payout Selection Banner */}
          {selectedOrderIds.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="badge badge-primary font-bold">{selectedOrderIds.length} Orders Selected</span>
                <span className="text-xs sm:text-sm font-medium">
                  Billed: <span className="font-semibold">{money(selectedGrossTotal)}</span> • Net Owed: <span className="text-primary font-bold">{money(selectedNetTotal)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => setSelectedOrderIds([])}
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-primary gap-1"
                  onClick={handleOpenBatchPayoutModal}
                >
                  <DollarSign size={13} /> Collect Payment &amp; Mark as Paid
                </button>
              </div>
            </div>
          )}

          {/* Orders Table */}
          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-base-content/50">
              <Share2 className="mx-auto mb-2 opacity-30" size={36} />
              <p>No 3rd party orders found for the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra table-sm w-full">
                <thead>
                  <tr>
                    <th className="w-8">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={dueOrdersOnPage.length > 0 && dueOrdersOnPage.every(id => selectedOrderIds.includes(id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(prev => Array.from(new Set([...prev, ...dueOrdersOnPage])));
                          } else {
                            setSelectedOrderIds(prev => prev.filter(id => !dueOrdersOnPage.includes(id)));
                          }
                        }}
                        aria-label="Select all due orders"
                      />
                    </th>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Partner</th>
                    <th>Partner Ref #</th>
                    <th>Items</th>
                    <th className="text-right">Billed (৳)</th>
                    <th className="text-right">Commission</th>
                    <th className="text-right">Net Owed (৳)</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const gross = parseFloat(o.total || 0);
                    const comm = parseFloat(o.partner_commission_amount || 0);
                    const net = gross - comm;
                    const badge = paymentBadge(o.payment_status);

                    return (
                      <tr key={o.id}>
                        <td>
                          {o.payment_status !== 'paid' ? (
                            <input
                              type="checkbox"
                              className="checkbox checkbox-xs"
                              checked={selectedOrderIds.includes(o.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOrderIds(prev => [...prev, o.id]);
                                } else {
                                  setSelectedOrderIds(prev => prev.filter(id => id !== o.id));
                                }
                              }}
                              aria-label={`Select order #${o.id}`}
                            />
                          ) : (
                            <span className="text-success text-xs font-bold" title="Paid">✓</span>
                          )}
                        </td>
                        <td className="font-bold">
                          <button
                            className="text-primary hover:underline"
                            onClick={() => setDetailOrder(o)}
                          >
                            #{o.id}
                          </button>
                        </td>
                        <td className="text-xs text-base-content/70">
                          {new Date(o.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <span className="font-semibold">{o.partner?.name || '—'}</span>
                          {o.partner_commission_rate != null && (
                            <div className="text-xs opacity-60">{o.partner_commission_rate}% cut</div>
                          )}
                        </td>
                        <td>
                          {o.partner_order_id ? (
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                              {o.partner_order_id}
                            </span>
                          ) : (
                            <span className="opacity-40 text-xs">—</span>
                          )}
                        </td>
                        <td className="text-xs max-w-[200px]">
                          <div className="line-clamp-2">
                            {(o.items || []).map((it: any) => `${it.quantity ?? 1}x ${it.product?.name || 'Item'}`).join(', ')}
                          </div>
                        </td>
                        <td className="text-right font-medium">{money(gross)}</td>
                        <td className="text-right text-xs text-warning font-medium">-{money(comm)}</td>
                        <td className="text-right font-bold text-primary">{money(net)}</td>
                        <td>
                          <div className="flex flex-col gap-0.5">
                            <span className={`badge badge-xs ${badge.className}`}>{badge.label}</span>
                            {o.due_note && (
                              <span className="text-[10px] text-base-content/60 line-clamp-1 max-w-[120px]" title={o.due_note}>
                                {o.due_note}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-ghost badge-xs capitalize">{o.status}</span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn btn-ghost btn-xs btn-square"
                              title="View Details"
                              onClick={() => setDetailOrder(o)}
                            >
                              <Eye size={14} />
                            </button>
                            {o.payment_status === 'due' && (
                              <button
                                className="btn btn-xs btn-outline btn-warning gap-1"
                                title="Settle Due"
                                onClick={() => setSettlingOrder(o)}
                              >
                                Settle
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Orders Pagination */}
          {ordersTotalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-base-200">
              <span className="text-xs text-base-content/60">
                Page {ordersPage} of {ordersTotalPages}
              </span>
              <div className="join">
                <button
                  className="join-item btn btn-xs"
                  disabled={ordersPage <= 1}
                  onClick={() => setOrdersPage((p) => p - 1)}
                >
                  Prev
                </button>
                <button
                  className="join-item btn btn-xs"
                  disabled={ordersPage >= ordersTotalPages}
                  onClick={() => setOrdersPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Payouts & Settlements / Payment Receiving Report */}
      {activeTab === 'payouts' && (
        <Card title="3rd Party Payment Receiving & Settlements">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="select select-bordered select-sm"
                value={partnerFilter}
                onChange={(e) => { setPartnerFilter(e.target.value); setPayoutsPage(1); }}
              >
                <option value="">All Partners</option>
                {partnersList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                className="select select-bordered select-sm"
                value={payoutMethodFilter}
                onChange={(e) => { setPayoutMethodFilter(e.target.value); setPayoutsPage(1); }}
              >
                <option value="">All Payment Methods</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mfs">Mobile Money (bKash/Nagad)</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              className="btn btn-primary btn-sm gap-2"
              onClick={() => {
                setPayoutForm({
                  partner_id: partnerFilter || '',
                  amount: '',
                  received_on: new Date().toISOString().split('T')[0],
                  payment_method: 'bank_transfer',
                  cash_storage_id: '',
                  reference: '',
                  note: '',
                  order_ids: [],
                });
                setShowPayoutModal(true);
              }}
            >
              <Plus size={16} /> Record Payout
            </button>
          </div>

          {/* Payouts Table */}
          {payoutsLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-12 text-base-content/50">
              <DollarSign className="mx-auto mb-2 opacity-30" size={36} />
              <p>No partner payouts recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra table-sm w-full">
                <thead>
                  <tr>
                    <th>Received Date</th>
                    <th>3rd Party Partner</th>
                    <th className="text-right">Amount Received</th>
                    <th>Payment Method &amp; Storage</th>
                    <th>Orders Settled</th>
                    <th>Reference #</th>
                    <th>Note</th>
                    <th>Recorded</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold text-sm whitespace-nowrap">{p.received_on}</td>
                      <td>
                        <span className="font-bold text-base-content/90">{p.partner?.name || `Partner #${p.partner_id}`}</span>
                      </td>
                      <td className="text-right font-bold text-success text-sm whitespace-nowrap">{money(p.amount)}</td>
                      <td>
                        <div>
                          <span className="font-medium text-xs capitalize">
                            {p.payment_method ? p.payment_method.replace('_', ' ') : '—'}
                          </span>
                          {p.cash_storage?.name && (
                            <div className="text-[10px] text-primary/80 font-medium">📦 {p.cash_storage.name}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        {p.orders_count && p.orders_count > 0 ? (
                          <span className="badge badge-primary badge-outline badge-xs font-semibold">
                            {p.orders_count} order{p.orders_count === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="badge badge-ghost badge-xs opacity-60">Lump sum</span>
                        )}
                      </td>
                      <td>
                        {p.reference ? (
                          <span className="badge badge-ghost badge-sm font-mono">{p.reference}</span>
                        ) : (
                          <span className="opacity-40 text-xs">—</span>
                        )}
                      </td>
                      <td className="text-xs text-base-content/70 max-w-[200px]">
                        <span className="line-clamp-2">{p.note || '—'}</span>
                      </td>
                      <td className="text-xs text-base-content/50 whitespace-nowrap">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-ghost btn-xs text-error btn-square"
                          title="Delete payout record"
                          onClick={() => handleDeletePayout(p.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payouts Pagination */}
          {payoutsTotalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-base-200">
              <span className="text-xs text-base-content/60">
                Page {payoutsPage} of {payoutsTotalPages}
              </span>
              <div className="join">
                <button
                  className="join-item btn btn-xs"
                  disabled={payoutsPage <= 1}
                  onClick={() => setPayoutsPage((p) => p - 1)}
                >
                  Prev
                </button>
                <button
                  className="join-item btn btn-xs"
                  disabled={payoutsPage >= payoutsTotalPages}
                  onClick={() => setPayoutsPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Record Payout Modal */}
      {showPayoutModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <DollarSign className="text-primary" size={20} />
              {payoutForm.order_ids.length > 0 ? 'Batch Settle 3rd Party Orders' : 'Record Partner Payout'}
            </h3>
            <form onSubmit={handleRecordPayout} className="space-y-4">
              {payoutForm.order_ids.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs space-y-1">
                  <div className="font-semibold text-primary flex items-center gap-1">
                    <CheckCircle size={14} /> Marking {payoutForm.order_ids.length} Selected Orders as Paid
                  </div>
                  <div className="text-base-content/70">
                    The selected orders will be updated to paid and their payments credited into this payout record.
                  </div>
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">3rd Party Partner *</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={payoutForm.partner_id}
                  onChange={(e) => setPayoutForm({ ...payoutForm, partner_id: e.target.value })}
                  required
                >
                  <option value="">Choose partner...</option>
                  {partnersList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Amount Received (৳) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="input input-bordered w-full"
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Received Date *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={payoutForm.received_on}
                    onChange={(e) => setPayoutForm({ ...payoutForm, received_on: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Payment Method *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={payoutForm.payment_method}
                    onChange={(e) => setPayoutForm({ ...payoutForm, payment_method: e.target.value })}
                    required
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mfs">Mobile Money (bKash/Nagad)</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Deposit to Cash Storage</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={payoutForm.cash_storage_id}
                    onChange={(e) => setPayoutForm({ ...payoutForm, cash_storage_id: e.target.value })}
                  >
                    <option value="">No specific storage (Default)</option>
                    {cashStorages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Reference # (Statement / Transfer ID)</span>
                </label>
                <input
                  type="text"
                  placeholder="Bank transfer / Cheque # / Settlement ID"
                  className="input input-bordered w-full"
                  value={payoutForm.reference}
                  onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Notes / Remarks</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Fortnight settlement, adjustment notes, etc."
                  className="textarea textarea-bordered w-full"
                  value={payoutForm.note}
                  onChange={(e) => setPayoutForm({ ...payoutForm, note: e.target.value })}
                />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowPayoutModal(false)}
                  disabled={submittingPayout}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingPayout}
                >
                  {submittingPayout ? (
                    <>
                      <span className="loading loading-spinner loading-xs" /> Saving...
                    </>
                  ) : payoutForm.order_ids.length > 0 ? (
                    'Confirm & Mark Paid'
                  ) : (
                    'Record Payout'
                  )}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowPayoutModal(false)} />
        </div>
      )}

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <span>Order #{detailOrder.id} Details</span>
                </h3>
                <span className="text-xs text-base-content/60">
                  {new Date(detailOrder.created_at).toLocaleString()}
                </span>
              </div>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setDetailOrder(null)}>✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 bg-base-200/50 p-3 rounded-lg">
                <div>
                  <span className="opacity-60">Partner:</span>{' '}
                  <span className="font-semibold">{detailOrder.partner?.name || '3rd Party'}</span>
                </div>
                <div>
                  <span className="opacity-60">Partner Ref:</span>{' '}
                  <span className="font-mono font-bold text-primary">
                    {detailOrder.partner_order_id || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="opacity-60">Status:</span>{' '}
                  <span className="font-semibold capitalize">{detailOrder.status}</span>
                </div>
                <div>
                  <span className="opacity-60">Payment:</span>{' '}
                  <span className={`font-semibold ${detailOrder.payment_status === 'paid' ? 'text-success' : 'text-warning'}`}>
                    {paymentBadge(detailOrder.payment_status).label}
                  </span>
                </div>
                {detailOrder.due_note && (
                  <div className="col-span-2">
                    <span className="opacity-60">Account Note:</span>{' '}
                    <span className="font-semibold">{detailOrder.due_note}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="font-semibold mb-2">Order Items</p>
                <div className="space-y-1">
                  {(detailOrder.items || []).map((item: any) => (
                    <div key={item.id} className="p-2 bg-base-200/50 rounded-lg flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-ghost badge-sm">×{item.quantity ?? item.qty ?? 1}</span>
                        <span>{item.product?.name || `Product #${item.product_id}`}</span>
                      </div>
                      <span className="font-semibold">
                        {money(parseFloat(item.price) * (item.quantity ?? item.qty ?? 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-base-200/30 p-3 rounded-lg space-y-1 border border-base-200">
                <div className="flex justify-between">
                  <span className="opacity-70">Order Gross</span>
                  <span>{money(detailOrder.total)}</span>
                </div>
                {detailOrder.partner_commission_amount != null && (
                  <div className="flex justify-between text-warning">
                    <span>Partner Commission ({detailOrder.partner_commission_rate ?? 0}%)</span>
                    <span>-{money(detailOrder.partner_commission_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-base-300 pt-1">
                  <span>Net Owed to Restaurant</span>
                  <span className="text-primary">
                    {money(parseFloat(detailOrder.total || 0) - parseFloat(detailOrder.partner_commission_amount || 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-action">
              {detailOrder.payment_status === 'due' && (
                <button
                  className="btn btn-warning btn-sm gap-1"
                  onClick={() => {
                    const toSettle = detailOrder;
                    setDetailOrder(null);
                    setSettlingOrder(toSettle);
                  }}
                >
                  Settle Due
                </button>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => setDetailOrder(null)}>
                Close
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDetailOrder(null)} />
        </div>
      )}

      {/* Settle Due Modal */}
      {settlingOrder && (
        <SettleDueModal
          order={settlingOrder}
          onClose={() => setSettlingOrder(null)}
          onSettled={() => {
            setSettlingOrder(null);
            setRefresh((n) => n + 1);
            if (activeTab === 'orders') loadOrders();
          }}
        />
      )}

      {/* Shared Dialogs from useDialogs() */}
      {dialog}
    </div>
  );
}
