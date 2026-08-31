'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { MultiImageUpload, ExistingImage } from '@/components/ui/MultiImageUpload';
import { Plus, Trash2, Paperclip } from 'lucide-react';

type LineItem = {
  inventory_item_id: number | '';
  quantity: string;
  price: string;
};

const emptyLine = (): LineItem => ({ inventory_item_id: '', quantity: '', price: '' });

const STATUSES = ['pending', 'approved', 'received', 'cancelled'];

/** One line row: item, quantity, unit price, total, remove. Stacks on mobile. */
const LINE_GRID = 'grid sm:grid-cols-[minmax(0,1fr)_8rem_10rem_8rem_3rem]';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    supplier_id: '' as number | '',
    location_id: '' as number | '',
    status: 'received',
    notes: '',
  });
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<ExistingImage[]>([]);
  const [removedReceiptIds, setRemovedReceiptIds] = useState<number[]>([]);

  const currency = settings.currency_symbol || '৳';

  useEffect(() => {
    loadOrders();
  }, [page]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/purchase-orders?page=${page}`);
      setOrders(res.data || res || []);
      setTotalPages(res.last_page || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [supRes, locRes, itemRes, setRes] = await Promise.all([
        fetchApi('/suppliers?nopaginate=1'),
        fetchApi('/locations'),
        fetchApi('/inventory-items?nopaginate=1'),
        fetchApi('/website-settings'),
      ]);

      setSuppliers(supRes.data || supRes || []);
      setLocations(locRes.data || locRes || []);
      setInventoryItems(itemRes.data || itemRes || []);

      const map: Record<string, string> = {};
      (setRes.data || setRes || []).forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
    } catch (err) {
      console.error(err);
    }
  };

  const supplierOptions = useMemo(
    () => suppliers.map((s: any) => ({
      value: s.id,
      label: s.name || `Supplier #${s.id}`,
      hint: [s.contact_name, s.phone].filter(Boolean).join(' · '),
    })),
    [suppliers],
  );

  const locationOptions = useMemo(
    () => locations.map((l: any) => ({ value: l.id, label: l.name || `Outlet #${l.id}` })),
    [locations],
  );

  const itemOptions = useMemo(
    () => inventoryItems.map((i: any) => ({
      value: i.id,
      label: i.title || `Item #${i.id}`,
      hint: [i.sku, i.unit && `per ${i.unit}`].filter(Boolean).join(' · '),
    })),
    [inventoryItems],
  );

  const itemById = (id: number | '') => inventoryItems.find((i: any) => i.id === Number(id));

  const lineTotal = (line: LineItem) => (parseFloat(line.quantity) || 0) * (parseFloat(line.price) || 0);
  const grandTotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const money = (amount: number) => `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      location_id: locations[0]?.id ?? '',
      status: 'received',
      notes: '',
    });
    setLines([emptyLine()]);
    setReceiptFiles([]);
    setSavedReceipts([]);
    setRemovedReceiptIds([]);
    setFormError('');
  };

  const openCreateForm = () => {
    setEditingId(null);
    resetForm();
    setIsFormOpen(true);
  };

  const updateLine = (index: number, patch: Partial<LineItem>) => {
    setLines(prev => prev.map((line, current) => (current === index ? { ...line, ...patch } : line)));
  };

  const chooseItem = (index: number, itemId: number | '') => {
    const item = itemById(itemId);
    // The last price paid is the best guess at this one; still editable, since
    // supplier prices move.
    const price = item?.cost_per_unit != null ? String(item.cost_per_unit) : lines[index].price;
    updateLine(index, { inventory_item_id: itemId, price });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const filled = lines.filter(line => line.inventory_item_id !== '' && parseFloat(line.quantity) > 0);

    if (filled.length === 0) {
      setFormError('Add at least one line with an item and a quantity.');
      return;
    }

    setSubmitting(true);

    try {
      const body = new FormData();
      body.append('supplier_id', String(formData.supplier_id));
      body.append('location_id', String(formData.location_id));
      body.append('status', formData.status);
      if (formData.notes) body.append('notes', formData.notes);

      filled.forEach((line, index) => {
        body.append(`items[${index}][inventory_item_id]`, String(line.inventory_item_id));
        body.append(`items[${index}][quantity]`, String(parseFloat(line.quantity)));
        body.append(`items[${index}][price]`, String(parseFloat(line.price) || 0));
      });

      receiptFiles.forEach(file => body.append('receipts[]', file));
      removedReceiptIds.forEach(id => body.append('remove_receipt_ids[]', String(id)));

      if (editingId) {
        // Laravel reads multipart bodies on POST only, so an update is a POST
        // carrying its real verb.
        body.append('_method', 'PUT');
        await fetchApi(`/purchase-orders/${editingId}`, { method: 'POST', body });
      } else {
        await fetchApi('/purchase-orders', { method: 'POST', body });
      }

      setIsFormOpen(false);
      setEditingId(null);
      resetForm();
      loadOrders();
    } catch (err) {
      console.error(err);
      setFormError(apiErrorMessage(err, 'Failed to save this purchase order.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (row: any) => {
    try {
      const order = await fetchApi(`/purchase-orders/${row.id}`);

      setEditingId(order.id);
      setFormData({
        supplier_id: order.supplier_id ?? '',
        location_id: order.location_id ?? '',
        status: order.status || 'received',
        notes: order.notes || '',
      });
      setLines(
        (order.items || []).length > 0
          ? order.items.map((item: any) => ({
              inventory_item_id: item.inventory_item_id,
              quantity: String(item.quantity ?? ''),
              price: String(item.price ?? ''),
            }))
          : [emptyLine()],
      );
      setSavedReceipts((order.receipts || []).map((image: any) => ({ id: image.id, url: `/storage/${image.url}` })));
      setReceiptFiles([]);
      setRemovedReceiptIds([]);
      setFormError('');
      setIsFormOpen(true);
    } catch (err) {
      console.error(err);
      alert(apiErrorMessage(err, 'Could not open that purchase order.'));
    }
  };

  const handleDelete = async (row: any) => {
    if (!confirm(`Delete purchase order #${row.id}? The stock it delivered will be taken back out of inventory.`)) return;

    try {
      await fetchApi(`/purchase-orders/${row.id}`, { method: 'DELETE' });
      loadOrders();
    } catch (err) {
      console.error(err);
      alert(apiErrorMessage(err, 'Failed to delete this purchase order.'));
    }
  };

  const columns = [
    { key: 'id', label: 'PO #', render: (row: any) => <span className="font-medium">#{row.id}</span> },
    {
      key: 'created_at',
      label: 'Date',
      render: (row: any) => (row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'),
    },
    { key: 'supplier', label: 'Supplier', render: (row: any) => row.supplier?.name || '—' },
    { key: 'location', label: 'Outlet', render: (row: any) => row.location?.name || '—' },
    {
      key: 'items',
      label: 'Items',
      render: (row: any) => {
        const items = row.items || [];
        if (items.length === 0) return <span className="text-base-content/30">—</span>;
        const first = items[0]?.inventory_item?.title || 'Item';
        return (
          <span className="text-sm">
            {first}
            {items.length > 1 && <span className="text-content-muted"> +{items.length - 1} more</span>}
          </span>
        );
      },
    },
    {
      key: 'total_amount',
      label: 'Total',
      render: (row: any) => <span className="font-medium">{money(parseFloat(row.total_amount) || 0)}</span>,
    },
    { key: 'status', label: 'Status' },
    {
      key: 'receipts',
      label: 'Receipts',
      render: (row: any) =>
        (row.receipts || []).length > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm text-content-muted">
            <Paperclip size={13} /> {row.receipts.length}
          </span>
        ) : (
          <span className="text-base-content/30">—</span>
        ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Purchase Orders</h1>
        <Button data-tour="po-create" onClick={() => (isFormOpen ? setIsFormOpen(false) : openCreateForm())}>
          {isFormOpen ? 'Close Form' : '+ Create PO'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? `Edit Purchase Order #${editingId}` : 'Create Purchase Order'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* A plain wrapper, not `display: contents` - the walkthrough measures
                this element to draw a ring around it, and a contents box has no
                measurements. It occupies the one grid cell SearchSelect did. */}
            <div data-tour="po-supplier">
            <SearchSelect
              label="Supplier"
              required
              value={formData.supplier_id}
              onChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value as number }))}
              options={supplierOptions}
              placeholder="Select a supplier"
              searchPlaceholder="Search suppliers by name or contact…"
              emptyText="No supplier matches that search."
              disabled={submitting}
            />
            </div>

            {/* One outlet means one possible answer, and resetForm has
                already filled it in - asking is busywork. The field returns by
                itself when a second outlet is opened. */}
            {locations.length > 1 && (
              <SearchSelect
                label="Outlet receiving the delivery"
                required
                value={formData.location_id}
                onChange={(value) => setFormData(prev => ({ ...prev, location_id: value as number }))}
                options={locationOptions}
                placeholder="Select an outlet"
                searchPlaceholder="Search outlets…"
                emptyText="No outlet matches that search."
                disabled={submitting}
              />
            )}

            <div className="form-control w-full sm:col-span-2">
              <label className="label"><span className="label-text font-medium">Items</span></label>

              {/* Laid out as a grid rather than a <table>: a table needs a
                  horizontal scroll container on small screens, and that
                  container clips the item dropdown the moment it opens. */}
              <div data-tour="po-lines" className="rounded-[var(--radius-field)] border border-base-300">
                <div className={`${LINE_GRID} hidden border-b border-base-200 px-3 py-2 sm:grid`}>
                  <span className="text-xs font-semibold uppercase text-base-content/60">Inventory item</span>
                  <span className="text-xs font-semibold uppercase text-base-content/60">Quantity</span>
                  <span className="text-xs font-semibold uppercase text-base-content/60">Unit price</span>
                  <span className="text-right text-xs font-semibold uppercase text-base-content/60">Line total</span>
                  <span />
                </div>

                {lines.map((line, index) => {
                  const item = itemById(line.inventory_item_id);
                  return (
                    <div
                      key={index}
                      className={`${LINE_GRID} grid-cols-1 gap-3 border-b border-base-200 px-3 py-3 last:border-b-0 sm:items-center sm:gap-3`}
                    >
                      <SearchSelect
                        value={line.inventory_item_id}
                        onChange={(value) => chooseItem(index, value as number)}
                        options={itemOptions}
                        placeholder="Select an item"
                        searchPlaceholder="Search items by name or SKU…"
                        emptyText="No inventory item matches that search."
                        disabled={submitting}
                      />

                      <div className="form-control w-full">
                        <label className="label py-1 sm:hidden"><span className="label-text text-xs">Quantity</span></label>
                        <label className="input input-bordered flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            className="w-full min-w-0 bg-transparent outline-none"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, { quantity: e.target.value })}
                            disabled={submitting}
                          />
                          {item?.unit && <span className="shrink-0 text-xs text-content-muted">{item.unit}</span>}
                        </label>
                      </div>

                      <div className="form-control w-full">
                        <label className="label py-1 sm:hidden"><span className="label-text text-xs">Unit price</span></label>
                        <label className="input input-bordered flex items-center gap-1">
                          <span className="shrink-0 text-xs text-content-muted">{currency}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full min-w-0 bg-transparent outline-none"
                            value={line.price}
                            onChange={(e) => updateLine(index, { price: e.target.value })}
                            disabled={submitting}
                          />
                        </label>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end">
                        <span className="text-xs text-content-muted sm:hidden">Line total</span>
                        <span className="font-medium">{money(lineTotal(line))}</span>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          aria-label="Remove this line"
                          className="btn btn-sm btn-ghost btn-square text-error"
                          disabled={submitting || lines.length === 1}
                          onClick={() => setLines(prev => prev.filter((_, current) => current !== index))}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 px-3 py-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost gap-1.5 text-primary"
                    onClick={() => setLines(prev => [...prev, emptyLine()])}
                    disabled={submitting}
                  >
                    <Plus size={14} /> Add line
                  </button>
                  <div className="text-sm">
                    <span className="text-content-muted">Order total</span>
                    <span className="ml-2 text-base font-semibold text-base-content">{money(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div data-tour="po-status" className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Status</span></label>
              <select
                className="select select-bordered w-full"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                disabled={submitting}
              >
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>
                ))}
              </select>
              <span className="mt-1 text-xs text-content-muted">
                {formData.status === 'cancelled'
                  ? 'Cancelled orders are kept for the record but hold no stock.'
                  : 'Saving adds these quantities to the outlet’s inventory.'}
              </span>
            </div>

            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Notes</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Delivery note number, driver, anything worth remembering"
                disabled={submitting}
              />
            </div>

            <div className="sm:col-span-2">
              <MultiImageUpload
                label="Receipts & delivery notes"
                existing={savedReceipts}
                removedIds={removedReceiptIds}
                onRemoveExisting={(id) => setRemovedReceiptIds(prev => [...prev, id])}
                files={receiptFiles}
                onFilesChange={setReceiptFiles}
                disabled={submitting}
              />
            </div>

            {formError && (
              <div className="alert alert-error sm:col-span-2" role="alert">
                <span className="text-sm">{formError}</span>
              </div>
            )}

            <div className="flex gap-4 sm:col-span-2">
              <Button data-tour="po-save" type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : (editingId ? 'Update PO' : 'Create PO')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary"></span></div>
        ) : (
          <>
            <Table columns={columns} data={orders} onEdit={handleEdit} onDelete={handleDelete} />
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
        )}
      </Card>
    </div>
  );
}
