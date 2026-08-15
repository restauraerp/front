'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertTriangle } from 'lucide-react';

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

  useEffect(() => {
    Promise.all([
      fetchApi('/inventory-items?nopaginate=1'),
      fetchApi('/locations'),
    ]).then(([itemsRes, locRes]) => {
      setItems(itemsRes?.data || itemsRes || []);
      setLocations(locRes?.data || locRes || []);
    }).catch(console.error);
  }, []);

  useEffect(() => { loadLogs(); }, [page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/consumption-logs?page=${page}`);
      setLogs(res?.data?.data || res?.data || []);
      setTotalPages(res?.data?.last_page || res?.last_page || 1);
    } catch (err) { console.error(err); } finally { setLoading(false); }
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
        <Button onClick={() => setIsFormOpen(f => !f)}>
          {isFormOpen ? 'Close' : '+ Log Consumption'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title="Report Consumption" style={{ marginBottom: '2rem' }}>
          <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 flex items-start gap-2 mb-5">
            <AlertTriangle size={16} className="text-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm text-base-content/80">
              Submitting this form will immediately deduct the entered quantity from the selected outlet's stock.
              Deleting the log later will restore it.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Inventory Item</span></label>
              <select className="select select-bordered w-full" name="inventory_item_id" value={formData.inventory_item_id} onChange={handleChange} required>
                <option value="">— Select item —</option>
                {items.map((i: any) => (
                  <option key={i.id} value={i.id}>{i.title} ({i.unit})</option>
                ))}
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Outlet</span></label>
              <select className="select select-bordered w-full" name="location_id" value={formData.location_id} onChange={handleChange} required>
                <option value="">— Select outlet —</option>
                {locations.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

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
              <Table columns={columns} data={logs} onEdit={undefined} onDelete={handleDelete} />
              {totalPages > 1 && (
                <div className="flex justify-center mt-6 pb-2">
                  <div className="join">
                    <button className="join-item btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>«</button>
                    <button className="join-item btn btn-sm bg-base-100 cursor-default">Page {page} of {totalPages}</button>
                    <button className="join-item btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>»</button>
                  </div>
                </div>
              )}
            </>
          )
        }
      </Card>
    </div>
  );
}
