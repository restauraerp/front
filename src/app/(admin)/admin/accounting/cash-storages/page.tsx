'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { useDialogs } from '@/components/ui/Dialogs';
import {
  Wallet,
  Banknote,
  CreditCard,
  Smartphone,
  Plus,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle,
  Building2,
  DollarSign,
} from 'lucide-react';

interface CashStorage {
  id: number;
  name: string;
  type: 'cash' | 'card' | 'bkash';
  location_id: number | null;
  location?: { id: number; name: string } | null;
  opening_balance: string | number;
  current_balance: string | number;
  is_active: boolean;
  notes?: string | null;
  payments_count?: number;
  created_at?: string;
}

interface SummaryData {
  cash_total: number;
  card_total: number;
  bkash_total: number;
  grand_total: number;
  storages_count: number;
}

const formatTaka = (amount: unknown) =>
  `৳${Number(amount ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CashStoragesPage() {
  const { confirm, alert, dialog } = useDialogs();

  const [storages, setStorages] = useState<CashStorage[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    cash_total: 0,
    card_total: 0,
    bkash_total: 0,
    grand_total: 0,
    storages_count: 0,
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'card' | 'bkash'>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingStorage, setEditingStorage] = useState<CashStorage | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as 'cash' | 'card' | 'bkash',
    location_id: '',
    opening_balance: '0.00',
    notes: '',
    is_active: true,
  });

  // View Transactions Modal state
  const [inspectStorage, setInspectStorage] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Load locations
  useEffect(() => {
    fetchApi('/locations?nopaginate=1')
      .then((res) => {
        const list = res?.data ?? res ?? [];
        setLocations(list);
      })
      .catch(console.error);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ nopaginate: '1' });
      if (activeTab !== 'all') params.set('type', activeTab);
      if (selectedLocation !== 'all') params.set('location_id', selectedLocation);

      const [storagesRes, summaryRes] = await Promise.all([
        fetchApi(`/cash-storages?${params.toString()}`),
        fetchApi('/cash-storages/summary'),
      ]);

      setStorages(storagesRes?.data ?? storagesRes ?? []);
      if (summaryRes) setSummary(summaryRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedLocation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingStorage(null);
    setFormData({
      name: '',
      type: 'cash',
      location_id: selectedLocation !== 'all' ? selectedLocation : '',
      opening_balance: '0.00',
      notes: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (storage: CashStorage) => {
    setEditingStorage(storage);
    setFormData({
      name: storage.name,
      type: storage.type,
      location_id: storage.location_id ? String(storage.location_id) : '',
      opening_balance: String(storage.opening_balance),
      notes: storage.notes || '',
      is_active: storage.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      await alert({
        title: 'Validation Error',
        message: 'Please enter a name for the cash storage.',
        tone: 'btn-warning',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        location_id: formData.location_id ? Number(formData.location_id) : null,
        opening_balance: Number(formData.opening_balance || 0),
        notes: formData.notes.trim() || null,
        is_active: formData.is_active,
      };

      if (editingStorage) {
        await fetchApi(`/cash-storages/${editingStorage.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/cash-storages', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      loadData();
      await alert({
        title: editingStorage ? 'Storage Updated' : 'Storage Created',
        message: `Cash storage "${payload.name}" was saved successfully.`,
        tone: 'btn-success',
      });
    } catch (err) {
      await alert({
        title: 'Save Failed',
        message: apiErrorMessage(err, 'Could not save the cash storage.'),
        tone: 'btn-error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (storage: CashStorage) => {
    const ok = await confirm({
      title: 'Archive Cash Storage?',
      message: `Are you sure you want to remove "${storage.name}"? Past payment records will be preserved.`,
      action: 'Archive Storage',
      tone: 'btn-error',
    });
    if (!ok) return;

    try {
      await fetchApi(`/cash-storages/${storage.id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      await alert({
        title: 'Delete Failed',
        message: apiErrorMessage(err, 'Could not remove cash storage.'),
        tone: 'btn-error',
      });
    }
  };

  const handleInspect = async (storage: CashStorage) => {
    setInspectLoading(true);
    setInspectStorage(null);
    try {
      const res = await fetchApi(`/cash-storages/${storage.id}`);
      setInspectStorage(res);
    } catch (err) {
      console.error(err);
      await alert({
        title: 'Error',
        message: 'Could not load payment records for this storage.',
        tone: 'btn-error',
      });
    } finally {
      setInspectLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Banknote className="text-emerald-500" size={18} />;
      case 'card':
        return <CreditCard className="text-blue-500" size={18} />;
      case 'bkash':
        return <Smartphone className="text-pink-500" size={18} />;
      default:
        return <Wallet className="text-primary" size={18} />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'cash':
        return <span className="badge badge-success badge-sm text-white">Cash Drawer</span>;
      case 'card':
        return <span className="badge badge-info badge-sm text-white">Card POS</span>;
      case 'bkash':
        return <span className="badge badge-secondary badge-sm text-white">bKash / MFS</span>;
      default:
        return <span className="badge badge-ghost badge-sm capitalize">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Cash Storages & Tills"
          subtitle="Organize physical cash drawers, card POS terminals, and bKash mobile wallets."
        />
        <button className="btn btn-primary btn-sm gap-2" onClick={handleOpenAdd}>
          <Plus size={16} /> New Cash Storage
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Wallet size={24} />
            </div>
            <div>
              <div className="text-xs text-base-content/60 font-medium">Grand Total Held</div>
              <div className="text-2xl font-bold text-primary">{formatTaka(summary.grand_total)}</div>
              <div className="text-xs text-base-content/50 mt-0.5">{summary.storages_count} active storages</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <Banknote size={24} />
            </div>
            <div>
              <div className="text-xs text-base-content/60 font-medium">Physical Cash Tills</div>
              <div className="text-2xl font-bold text-emerald-600">{formatTaka(summary.cash_total)}</div>
              <div className="text-xs text-base-content/50 mt-0.5">Register & safe balances</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <CreditCard size={24} />
            </div>
            <div>
              <div className="text-xs text-base-content/60 font-medium">Card POS Terminals</div>
              <div className="text-2xl font-bold text-blue-600">{formatTaka(summary.card_total)}</div>
              <div className="text-xs text-base-content/50 mt-0.5">Bank terminal collections</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-500/10 rounded-xl text-pink-600">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="text-xs text-base-content/60 font-medium">bKash / Mobile Wallets</div>
              <div className="text-2xl font-bold text-pink-600">{formatTaka(summary.bkash_total)}</div>
              <div className="text-xs text-base-content/50 mt-0.5">Digital merchant accounts</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-base-200">
          <div className="tabs tabs-boxed bg-base-200">
            <button
              className={`tab gap-2 ${activeTab === 'all' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Types
            </button>
            <button
              className={`tab gap-2 ${activeTab === 'cash' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('cash')}
            >
              <Banknote size={14} /> Cash
            </button>
            <button
              className={`tab gap-2 ${activeTab === 'card' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('card')}
            >
              <CreditCard size={14} /> Card
            </button>
            <button
              className={`tab gap-2 ${activeTab === 'bkash' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('bkash')}
            >
              <Smartphone size={14} /> bKash
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-base-content/60" />
            <select
              className="select select-bordered select-sm"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="all">All Outlets</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>

            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={loadData}
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Storages Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : storages.length === 0 ? (
          <div className="text-center py-12 text-base-content/50">
            <Wallet className="mx-auto mb-2 opacity-30" size={36} />
            <p>No cash storages configured for this view.</p>
            <button className="btn btn-primary btn-sm mt-3" onClick={handleOpenAdd}>
              + Create First Storage
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra table-sm w-full">
              <thead>
                <tr>
                  <th>Storage Name</th>
                  <th>Category</th>
                  <th>Outlet / Location</th>
                  <th className="text-right">Opening Float</th>
                  <th className="text-right">Payments Collected</th>
                  <th className="text-right">Current Balance</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {storages.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(s.type)}
                        <div>
                          <div className="font-bold">{s.name}</div>
                          {s.notes && (
                            <div className="text-[11px] text-base-content/50 line-clamp-1 max-w-[200px]">
                              {s.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{getTypeBadge(s.type)}</td>
                    <td className="text-xs">
                      {s.location?.name || <span className="opacity-60">All Outlets</span>}
                    </td>
                    <td className="text-right font-medium text-xs">
                      {formatTaka(s.opening_balance)}
                    </td>
                    <td className="text-right text-xs">
                      <span className="badge badge-ghost badge-sm">{s.payments_count ?? 0} order payments</span>
                    </td>
                    <td className="text-right font-bold text-primary text-sm">
                      {formatTaka(s.current_balance)}
                    </td>
                    <td>
                      {s.is_active ? (
                        <span className="badge badge-success badge-xs text-white">Active</span>
                      ) : (
                        <span className="badge badge-ghost badge-xs">Off</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="btn btn-ghost btn-xs btn-square"
                          title="View Payments & Activity"
                          onClick={() => handleInspect(s)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs btn-square"
                          title="Edit Storage"
                          onClick={() => handleOpenEdit(s)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error btn-square"
                          title="Archive Storage"
                          onClick={() => handleDelete(s)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Cash Storage Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Wallet className="text-primary" size={20} />
              {editingStorage ? 'Edit Cash Storage' : 'Create Cash Storage'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Storage Name *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter 1 Till, Main Safe, bKash Merchant 017..."
                  className="input input-bordered w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Category *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    required
                  >
                    <option value="cash">Cash (Physical Drawer / Box)</option>
                    <option value="card">Card (POS Terminal / Bank)</option>
                    <option value="bkash">bKash (Mobile Wallet / MFS)</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Outlet / Location</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  >
                    <option value="">All Outlets (Tenant-wide)</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Opening Float / Initial Balance (৳)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input input-bordered w-full"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                />
                <span className="text-xs text-base-content/50 mt-1">
                  Starting cash amount in the drawer at setup.
                </span>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Notes</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Drawer purpose, terminal serial #, bKash SIM details, etc."
                  className="textarea textarea-bordered w-full"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span className="label-text font-medium">Active (Available for payment collection)</span>
                </label>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="loading loading-spinner loading-xs" /> Saving...
                    </>
                  ) : (
                    editingStorage ? 'Update Storage' : 'Create Storage'
                  )}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
        </div>
      )}

      {/* Inspect Storage Activity Modal */}
      {(inspectLoading || inspectStorage) && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            {inspectLoading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-md text-primary" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-base-200">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(inspectStorage.type)}
                    <div>
                      <h3 className="font-bold text-lg">{inspectStorage.name}</h3>
                      <div className="text-xs text-base-content/60">
                        {getTypeBadge(inspectStorage.type)} &bull; Balance: <strong className="text-primary">{formatTaka(inspectStorage.current_balance)}</strong>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setInspectStorage(null)}>✕</button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 bg-base-200/50 p-3 rounded-xl text-center">
                    <div>
                      <div className="text-xs text-base-content/60">Opening Float</div>
                      <div className="font-bold text-sm mt-0.5">{formatTaka(inspectStorage.opening_balance)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-base-content/60">Total Collected</div>
                      <div className="font-bold text-sm text-success mt-0.5">
                        +{formatTaka(Number(inspectStorage.current_balance) - Number(inspectStorage.opening_balance))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-base-content/60">Current Total</div>
                      <div className="font-bold text-sm text-primary mt-0.5">{formatTaka(inspectStorage.current_balance)}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">Recent Order Payments Deposited</h4>
                    {(!inspectStorage.payments || inspectStorage.payments.length === 0) ? (
                      <p className="text-xs text-base-content/50 py-4 text-center">No order payments deposited into this storage yet.</p>
                    ) : (
                      <div className="overflow-x-auto max-h-60 border border-base-200 rounded-lg">
                        <table className="table table-zebra table-xs w-full">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Order #</th>
                              <th>Method</th>
                              <th className="text-right">Amount (৳)</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inspectStorage.payments.map((p: any) => (
                              <tr key={p.id}>
                                <td className="text-base-content/60">{new Date(p.created_at).toLocaleString()}</td>
                                <td className="font-semibold">#{p.order_id}</td>
                                <td className="capitalize">{p.method}</td>
                                <td className="text-right font-bold text-success">{formatTaka(p.amount)}</td>
                                <td className="text-[11px] text-base-content/60 max-w-[150px] truncate">{p.note || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-action">
                  <button className="btn btn-sm btn-ghost" onClick={() => setInspectStorage(null)}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="modal-backdrop" onClick={() => setInspectStorage(null)} />
        </div>
      )}

      {/* Shared dialog component */}
      {dialog}
    </div>
  );
}
