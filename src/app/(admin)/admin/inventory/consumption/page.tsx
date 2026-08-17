'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertTriangle, Trash2, RotateCcw } from 'lucide-react';
import { SearchSelect } from '@/components/ui/SearchSelect';

export default function ConsumptionLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    inventory_item_id: '',
    location_id: '',
    quantity: '',
    reason: '',
    consumed_at: new Date().toISOString().slice(0, 10),
  });

  const [activeTab, setActiveTab] = useState<'history' | 'trashed'>('history');
  const [isAdmin, setIsAdmin] = useState(false);
  const [trashedLogs, setTrashedLogs] = useState<any[]>([]);
  const [trashedPage, setTrashedPage] = useState(1);
  const [trashedTotalPages, setTrashedTotalPages] = useState(1);
  const [trashedLoading, setTrashedLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    type: 'trash' | 'restore';
    log: any;
  } | null>(null);
  const [confirmProcessing, setConfirmProcessing] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchApi('/inventory-items?nopaginate=1'),
      fetchApi('/locations'),
      fetchApi('/auth/me'),
    ]).then(([itemsRes, locRes, meRes]) => {
      setItems(itemsRes?.data || itemsRes || []);
      setLocations(locRes?.data || locRes || []);
      const roles = meRes?.data?.roles || meRes?.roles || [];
      setIsAdmin(roles.some((r: any) => ['restaurant_admin', 'super_admin'].includes(r.name || r)));
    }).catch(console.error);
  }, []);

  useEffect(() => { loadLogs(); }, [page]);

  useEffect(() => {
    if (activeTab === 'trashed' && isAdmin) loadTrashedLogs();
  }, [activeTab, trashedPage, isAdmin]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/consumption-logs?page=${page}`);
      setLogs(res?.data?.data || res?.data || []);
      setTotalPages(res?.data?.last_page || res?.last_page || 1);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadTrashedLogs = async () => {
    try {
      setTrashedLoading(true);
      const res = await fetchApi(`/consumption-logs-trashed?page=${trashedPage}`);
      setTrashedLogs(res?.data?.data || res?.data || []);
      setTrashedTotalPages(res?.data?.last_page || res?.last_page || 1);
    } catch (err) { console.error(err); } finally { setTrashedLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchApi('/consumption-logs', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsFormOpen(false);
      setFormData({ inventory_item_id: '', location_id: '', quantity: '', reason: '', consumed_at: new Date().toISOString().slice(0, 10) });
      loadLogs();
    } catch (err) {
      console.error(err);
      alert('Failed to log consumption.');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (row: any) => {
    if (!confirm('Delete this log? This will restore the consumed stock.')) return;
    try {
      await fetchApi(`/consumption-logs/${row.id}`, { method: 'DELETE' });
      loadLogs();
    } catch (err) { console.error(err); alert('Failed to delete log.'); }
  };

  const executeConfirmAction = async () => {
    if (!confirmModal) return;
    setConfirmProcessing(true);
    try {
      if (confirmModal.type === 'trash') {
        await fetchApi(`/consumption-logs/${confirmModal.log.id}/trash`, { method: 'POST' });
        loadLogs();
      } else {
        await fetchApi(`/consumption-logs-trashed/${confirmModal.log.id}/restore`, { method: 'POST' });
        loadTrashedLogs();
      }
      setConfirmModal(null);
    } catch (err) {
      console.error(err);
      alert(`Failed to ${confirmModal.type} consumption log.`);
    } finally { setConfirmProcessing(false); }
  };

  const selectedItem = items.find((i: any) => String(i.id) === formData.inventory_item_id);

  const columns = [
    { key: 'consumed_at', label: 'Date', render: (row: any) => row.consumed_at?.slice(0, 10) || '—' },
    { key: 'item', label: 'Item', render: (row: any) => row.inventory_item?.title || '—' },
    { key: 'location', label: 'Outlet', render: (row: any) => row.location?.name || '—' },
    {
      key: 'quantity', label: 'Quantity',
      render: (row: any) => `${row.quantity} ${row.inventory_item?.unit || ''}`,
    },
    { key: 'reason', label: 'Reason', render: (row: any) => row.reason || <span className="text-base-content/40">—</span> },
  ];

  const trashedColumns = [
    ...columns,
    { key: 'trashed_by', label: 'Trashed By', render: (row: any) => row.trashed_by_user?.name || '—' },
    { key: 'deleted_at', label: 'Trashed At', render: (row: any) => row.deleted_at?.slice(0, 10) || '—' },
  ];

  const renderPagination = (currentPage: number, total: number, onPageChange: (p: number) => void) => (
    total > 1 && (
      <div className="flex justify-center mt-6 pb-2">
        <div className="join">
          <button className="join-item btn btn-sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>«</button>
          <button className="join-item btn btn-sm bg-base-100 cursor-default">Page {currentPage} of {total}</button>
          <button className="join-item btn btn-sm" onClick={() => onPageChange(Math.min(total, currentPage + 1))} disabled={currentPage === total}>»</button>
        </div>
      </div>
    )
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Consumption Log</h1>
          <p className="text-sm text-base-content/60 mt-1">
            Record inventory used outside of orders — staff meals, tasting, spillage, cleaning supplies, etc.
            Each entry reduces stock immediately.
          </p>
        </div>
        {activeTab === 'history' && (
          <Button onClick={() => setIsFormOpen(f => !f)}>
            {isFormOpen ? 'Close' : '+ Log Consumption'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered mb-4">
        <button
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Consumption History
        </button>
        {isAdmin && (
          <button
            className={`tab ${activeTab === 'trashed' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('trashed')}
          >
            Trashed
          </button>
        )}
      </div>

      {activeTab === 'history' && (
        <>
          {isFormOpen && (
            <Card title="Report Consumption" style={{ marginBottom: '2rem' }}>
              <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 flex items-start gap-2 mb-5">
                <AlertTriangle size={16} className="text-warning mt-0.5 flex-shrink-0" />
                <p className="text-sm text-base-content/80">
                  Submitting this form will immediately deduct the entered quantity from the selected outlet&apos;s stock.
                  Deleting the log later will restore it.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SearchSelect
                  label="Inventory Item"
                  value={formData.inventory_item_id}
                  onChange={(v) => setFormData(prev => ({ ...prev, inventory_item_id: String(v) }))}
                  options={items.map((i: any) => ({ value: i.id, label: `${i.title} (${i.unit})` }))}
                  placeholder="— Select item —"
                  searchPlaceholder="Search items…"
                  required
                />

                <SearchSelect
                  label="Outlet"
                  value={formData.location_id}
                  onChange={(v) => setFormData(prev => ({ ...prev, location_id: String(v) }))}
                  options={locations.map((l: any) => ({ value: l.id, label: l.name }))}
                  placeholder="— Select outlet —"
                  searchPlaceholder="Search outlets…"
                  required
                />

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">Quantity</span>
                    {selectedItem && <span className="label-text-alt text-base-content/50">in {selectedItem.unit}</span>}
                  </label>
                  <input
                    type="number" step="0.001" min="0.001"
                    className="input input-bordered w-full"
                    name="quantity" value={formData.quantity} onChange={handleChange} required
                  />
                </div>

                <Input
                  label="Date of Consumption"
                  name="consumed_at" type="date"
                  value={formData.consumed_at} onChange={handleChange}
                />

                <div className="form-control w-full sm:col-span-2">
                  <label className="label"><span className="label-text font-medium">Reason <span className="font-normal text-base-content/50">(optional)</span></span></label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    name="reason" rows={2}
                    value={formData.reason} onChange={handleChange}
                    placeholder="Staff meal, tasting, spillage, cleaning…"
                  />
                </div>

                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? 'Logging…' : 'Log & Deduct Stock'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}

          <Card title="Consumption History">
            {loading
              ? <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary"></span></div>
              : (
                <>
                  <div className="overflow-x-auto">
                    <table className="table table-sm w-full">
                      <thead>
                        <tr>
                          {columns.map(col => <th key={col.key}>{col.label}</th>)}
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.length === 0 ? (
                          <tr><td colSpan={columns.length + 1} className="text-center py-8 text-base-content/40">No consumption logs yet.</td></tr>
                        ) : logs.map((row: any) => (
                          <tr key={row.id}>
                            {columns.map(col => <td key={col.key}>{col.render(row)}</td>)}
                            <td className="text-right">
                              <div className="flex justify-end gap-1">
                                {isAdmin && (
                                  <button
                                    className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                                    title="Trash"
                                    onClick={() => setConfirmModal({ type: 'trash', log: row })}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination(page, totalPages, setPage)}
                </>
              )
            }
          </Card>
        </>
      )}

      {activeTab === 'trashed' && isAdmin && (
        <Card title="Trashed Consumption Logs">
          {trashedLoading
            ? <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary"></span></div>
            : (
              <>
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        {trashedColumns.map(col => <th key={col.key}>{col.label}</th>)}
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trashedLogs.length === 0 ? (
                        <tr><td colSpan={trashedColumns.length + 1} className="text-center py-8 text-base-content/40">No trashed consumption logs.</td></tr>
                      ) : trashedLogs.map((row: any) => (
                        <tr key={row.id}>
                          {trashedColumns.map(col => <td key={col.key}>{col.render(row)}</td>)}
                          <td className="text-right">
                            <button
                              className="btn btn-xs btn-ghost text-success hover:bg-success/10"
                              title="Restore"
                              onClick={() => setConfirmModal({ type: 'restore', log: row })}
                            >
                              <RotateCcw size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination(trashedPage, trashedTotalPages, setTrashedPage)}
              </>
            )
          }
        </Card>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <div className="flex items-center gap-3 mb-4">
              {confirmModal.type === 'trash'
                ? <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center"><AlertTriangle className="text-error" size={20} /></div>
                : <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center"><RotateCcw className="text-success" size={20} /></div>
              }
              <div>
                <h3 className="font-bold text-lg">
                  {confirmModal.type === 'trash' ? 'Trash Consumption Log?' : 'Restore Consumption Log?'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {confirmModal.log.inventory_item?.title || 'Item'} — {confirmModal.log.quantity} {confirmModal.log.inventory_item?.unit || ''}
                </p>
              </div>
            </div>
            <p className="text-sm text-base-content/70 mb-6">
              {confirmModal.type === 'trash'
                ? 'Trashing this log will restore the consumed stock back to inventory. The log can be restored later by an admin.'
                : 'Restoring this log will deduct the stock from inventory again, as if the consumption was logged fresh.'
              }
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setConfirmModal(null)} disabled={confirmProcessing}>Cancel</button>
              <button
                className={`btn ${confirmModal.type === 'trash' ? 'btn-error' : 'btn-success'}`}
                onClick={executeConfirmAction}
                disabled={confirmProcessing}
              >
                {confirmProcessing && <span className="loading loading-spinner loading-xs" />}
                {confirmModal.type === 'trash' ? 'Trash' : 'Restore'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => !confirmProcessing && setConfirmModal(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
