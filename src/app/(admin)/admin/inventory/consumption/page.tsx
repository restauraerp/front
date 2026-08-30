'use client';
import React, { useEffect, useRef, useState } from 'react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertTriangle, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { SearchSelect } from '@/components/ui/SearchSelect';

interface StockItem { id: number; title: string; unit: string; sale_unit?: string | null; sale_units_per_purchase_unit?: string | number }
interface Outlet { id: number; name: string }

/** An item bought in one unit and used in another - see the sale_unit migration. */
const hasTwoUnits = (item?: StockItem) =>
  !!item?.sale_unit && item.sale_unit !== item.unit;

export default function ConsumptionLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /**
   * Several items written off in one submission.
   *
   * A cook closing the kitchen writes off eight things at once, and doing that
   * one form at a time - pick outlet, pick date, save, reopen - is how a
   * restaurant stops bothering and the stock figures drift.
   *
   * The outlet and the date are shared across the rows on purpose: they are
   * properties of the moment, not of each item, and asking eight times is the
   * repetition this exists to remove.
   */
  // A counter rather than Math.random: keys only have to be unique within this
  // list, and calling a random source while rendering is impure - React's lint
  // rejects it, and rightly, since a re-render would produce different keys.
  const nextRowKey = useRef(0);
  const emptyRow = () => ({ key: String(nextRowKey.current++), inventory_item_id: '', quantity: '', reason: '', entry_unit: 'purchase' });

  const [sharedFields, setSharedFields] = useState({
    location_id: '',
    consumed_at: new Date().toISOString().slice(0, 10),
  });
  const [rows, setRows] = useState<ReturnType<typeof emptyRow>[]>(() => [{ key: '0', inventory_item_id: '', quantity: '', reason: '', entry_unit: 'purchase' }]);

  // Admins can correct a log after the fact; the API adjusts the stock it moved.
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState({ quantity: '', reason: '' });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const entries = rows
      .filter(row => row.inventory_item_id && row.quantity)
      .map(row => ({
        inventory_item_id: row.inventory_item_id,
        location_id: sharedFields.location_id,
        consumed_at: sharedFields.consumed_at,
        quantity: row.quantity,
        entry_unit: row.entry_unit,
        reason: row.reason || null,
      }));

    if (entries.length === 0) {
      alert('Add at least one item with a quantity.');
      return;
    }

    setSubmitting(true);
    try {
      // One request, one transaction. Eight rows that half-saved would leave
      // stock wrong in a way nobody could see.
      await fetchApi('/consumption-logs/batch', {
        method: 'POST',
        body: JSON.stringify({ entries }),
      });
      setIsFormOpen(false);
      setRows([emptyRow()]);
      loadLogs();
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not report this consumption.'));
    } finally { setSubmitting(false); }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    setSubmitting(true);
    try {
      await fetchApi(`/consumption-logs/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: editForm.quantity, reason: editForm.reason || null }),
      });
      setEditing(null);
      loadLogs();
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not update this log.'));
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

  const columns = [
    { key: 'consumed_at', label: 'Date', render: (row: any) => row.consumed_at?.slice(0, 10) || '—' },
    { key: 'item', label: 'Item', render: (row: any) => row.inventory_item?.title || '—' },
    { key: 'location', label: 'Outlet', render: (row: any) => row.location?.name || '—' },
    {
      key: 'quantity', label: 'Quantity',
      render: (row: any) => {
        const unit = row.entry_unit === 'sale' && row.inventory_item?.sale_unit
          ? row.inventory_item.sale_unit
          : row.inventory_item?.unit || '';

        return (
          <span>
            {row.quantity} {unit}
            {row.entry_unit === 'sale' && row.stock_quantity && (
              <span className="text-base-content/50 text-xs"> ({row.stock_quantity} {row.inventory_item?.unit})</span>
            )}
          </span>
        );
      },
    },
    { key: 'reason', label: 'Reason', render: (row: any) => row.reason || <span className="text-base-content/40">—</span> },
    {
      // A corrected figure has to say so. The whole reason editing is admin-only
      // is that this number moved stock; a silent change is one nobody can
      // reconcile against when the count does not match.
      key: 'edited_at', label: 'Corrected',
      render: (row: any) => row.edited_at
        ? (
          <span className="text-xs text-warning" title={`Was ${row.original_quantity}`}>
            {row.edited_at.slice(0, 10)} by {row.edited_by_user?.name || 'an admin'}
          </span>
        )
        : <span className="text-base-content/40">—</span>,
    },
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
          <Button data-tour="consumption-add" onClick={() => setIsFormOpen(f => !f)}>
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
            <Card tour="consumption-form" title="Report Consumption" style={{ marginBottom: '2rem' }}>
              <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 flex items-start gap-2 mb-5">
                <AlertTriangle size={16} className="text-warning mt-0.5 flex-shrink-0" />
                <p className="text-sm text-base-content/80">
                  Submitting this form will immediately deduct the entered quantity from the selected outlet&apos;s stock.
                  Deleting the log later will restore it.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Shared across the rows: the outlet and the date are
                    properties of the moment, not of each item, and asking for
                    them once per row is the repetition this removes. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <SearchSelect
                    label="Outlet"
                    value={sharedFields.location_id}
                    onChange={(v) => setSharedFields(prev => ({ ...prev, location_id: String(v) }))}
                    options={(locations as Outlet[]).map((l) => ({ value: l.id, label: l.name }))}
                    placeholder="— Select outlet —"
                    searchPlaceholder="Search outlets…"
                    required
                  />
                  <Input
                    label="Date of Consumption"
                    name="consumed_at" type="date"
                    value={sharedFields.consumed_at}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSharedFields(prev => ({ ...prev, consumed_at: e.target.value }))}
                  />
                </div>

                <div className="space-y-3">
                  {rows.map((row, index) => {
                    const item = (items as StockItem[]).find((i) => String(i.id) === row.inventory_item_id);

                    return (
                      <div key={row.key} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-3 rounded-xl bg-base-200/40">
                        <div className="sm:col-span-5">
                          <SearchSelect
                            label={index === 0 ? 'Item' : undefined}
                            value={row.inventory_item_id}
                            onChange={(v) => setRows(prev => prev.map(r => r.key === row.key ? { ...r, inventory_item_id: String(v) } : r))}
                            options={(items as StockItem[]).map((i) => ({ value: i.id, label: `${i.title} (${i.unit})` }))}
                            placeholder="— Select item —"
                            searchPlaceholder="Search items…"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="label py-1">
                            <span className="label-text text-xs">{index === 0 ? 'Quantity' : ''}</span>
                            {item && !hasTwoUnits(item) && <span className="label-text-alt text-base-content/50">{item.unit}</span>}
                          </label>
                          <div className="flex gap-1">
                            <input
                              type="number" step="0.001" min="0.001"
                              className="input input-bordered input-sm w-full"
                              value={row.quantity}
                              onChange={(e) => setRows(prev => prev.map(r => r.key === row.key ? { ...r, quantity: e.target.value } : r))}
                              aria-label={`Quantity for row ${index + 1}`}
                            />
                            {/* Only for items counted in one unit and used in
                                another - rice bought by the sack, cooked by the
                                kilo. Everything else has one answer. */}
                            {item && hasTwoUnits(item) && (
                              <select
                                className="select select-bordered select-sm"
                                value={row.entry_unit}
                                onChange={(e) => setRows(prev => prev.map(r => r.key === row.key ? { ...r, entry_unit: e.target.value } : r))}
                                aria-label={`Unit for row ${index + 1}`}
                              >
                                <option value="purchase">{item.unit}</option>
                                <option value="sale">{item.sale_unit}</option>
                              </select>
                            )}
                          </div>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="label py-1"><span className="label-text text-xs">{index === 0 ? 'Reason' : ''}</span></label>
                          <input
                            className="input input-bordered input-sm w-full"
                            value={row.reason}
                            onChange={(e) => setRows(prev => prev.map(r => r.key === row.key ? { ...r, reason: e.target.value } : r))}
                            placeholder="Staff meal, spillage…"
                            aria-label={`Reason for row ${index + 1}`}
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost text-error"
                            onClick={() => setRows(prev => prev.length === 1 ? [emptyRow()] : prev.filter(r => r.key !== row.key))}
                            aria-label={`Remove row ${index + 1}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <Button type="button" variant="ghost" onClick={() => setRows(prev => [...prev, emptyRow()])} className="border border-base-300 gap-2">
                    <Plus size={14} /> Add another item
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? 'Reporting…' : `Report ${rows.filter(r => r.inventory_item_id && r.quantity).length || ''} & Deduct Stock`}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}

          <Card tour="consumption-history" title="Consumption History">
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
                                    className="btn btn-xs btn-ghost text-info hover:bg-info/10"
                                    title="Correct this log"
                                    onClick={() => { setEditing(row); setEditForm({ quantity: String(row.quantity ?? ''), reason: row.reason ?? '' }); }}
                                  >
                                    <Pencil size={13} />
                                  </button>
                                )}
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

      {editing && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-1">Correct this log</h3>
            <p className="text-sm text-base-content/60 mb-4">
              {editing.inventory_item?.title} at {editing.location?.name} on {editing.consumed_at?.slice(0, 10)}
            </p>

            <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 flex items-start gap-2 mb-4">
              <AlertTriangle size={16} className="text-warning mt-0.5 flex-shrink-0" />
              <p className="text-sm text-base-content/80">
                Changing the quantity moves stock again — the difference is added back or taken off.
                The correction is recorded against your name.
              </p>
            </div>

            <form onSubmit={submitEdit}>
              <div className="form-control w-full mb-3">
                <label className="label"><span className="label-text font-medium">Quantity</span>
                  <span className="label-text-alt text-base-content/50">{editing.inventory_item?.unit}</span>
                </label>
                <input
                  type="number" step="0.001" min="0.001"
                  className="input input-bordered w-full"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                  aria-label="Corrected quantity"
                  required
                />
              </div>

              <div className="form-control w-full mb-4">
                <label className="label"><span className="label-text font-medium">Reason</span></label>
                <input
                  className="input input-bordered w-full"
                  value={editForm.reason}
                  onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Staff meal, spillage…"
                  aria-label="Corrected reason"
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save correction'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(null)} disabled={submitting}>Cancel</Button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setEditing(null)} />
        </dialog>
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
