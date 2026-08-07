'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ImageUpload } from '@/components/ui/ImageUpload';
import styles from '@/components/ui/ui.module.css';

export default function InventoryItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sku: '',
    unit: '',
    min_stock_level: '',
    current_stock: '',
    cost_per_unit: '',
    is_sellable: false,
    selling_price: '',
    image: '',
    locations: [] as { location_id: number, quantity: number, is_active: boolean }[]
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, locRes] = await Promise.all([
        fetchApi(`/inventory-items?page=${page}`),
        fetchApi('/locations')
      ]);
      if (itemsRes?.data && Array.isArray(itemsRes.data)) {
         setItems(itemsRes.data);
         setTotalPages(itemsRes.last_page || 1);
      } else {
         setItems(itemsRes?.data?.data || itemsRes?.data || []);
         setTotalPages(itemsRes?.data?.last_page || 1);
      }
      setLocations(locRes?.data || locRes || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (locationId: number, field: string, value: any) => {
    setFormData(prev => {
      const locs = [...prev.locations];
      let existing = locs.find(l => l.location_id === locationId);
      if (!existing) {
        existing = { location_id: locationId, quantity: 0, is_active: false };
        locs.push(existing);
      }
      (existing as any)[field] = value;
      return { ...prev, locations: locs };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        // current_stock is read-only: it is the sum of what purchase orders
        // have delivered, and the API recomputes it rather than reading it.
        if (key === 'locations' || key === 'image' || key === 'current_stock' || key === 'cost_per_unit') return;
        if (key === 'is_sellable') {
          formDataToSend.append('is_sellable', formData.is_sellable ? '1' : '0');
          return;
        }
        const val = formData[key as keyof typeof formData];
        if (val !== null && val !== undefined && val !== '') formDataToSend.append(key, String(val));
      });
      formData.locations.forEach((loc, index) => {
        formDataToSend.append(`locations[${index}][location_id]`, loc.location_id.toString());
        formDataToSend.append(`locations[${index}][is_active]`, loc.is_active ? '1' : '0');
      });
      if (imageFile) formDataToSend.append('image', imageFile);

      if (editingId) {
        formDataToSend.append('_method', 'PUT');
        await fetchApi(`/inventory-items/${editingId}`, { method: 'POST', body: formDataToSend });
      } else {
        await fetchApi('/inventory-items', { method: 'POST', body: formDataToSend });
      }
      
      setIsFormOpen(false); setEditingId(null); setImageFile(null); loadData();
    } catch (err) { alert('Failed to save item'); console.error(err); } finally { setSubmitting(false); }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      title: row.title || '', description: row.description || '', sku: row.sku || '', unit: row.unit || '',
      min_stock_level: row.min_stock_level || '', current_stock: row.current_stock || '', cost_per_unit: row.cost_per_unit || '',
      is_sellable: Boolean(row.is_sellable), selling_price: row.selling_price ?? '',
      image: row.image || '',
      locations: (row.locations || []).map((loc: any) => ({
        location_id: loc.id, quantity: loc.pivot?.quantity || 0, is_active: loc.pivot ? (loc.pivot.is_active === 1 || loc.pivot.is_active === true) : false
      }))
    });
    setImageFile(null); setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Delete ${row.title}?`)) {
      try { await fetchApi(`/inventory-items/${row.id}`, { method: 'DELETE' }); loadData(); } catch (err) { console.error(err); alert('Failed to delete'); }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'image', label: 'Image', render: (row: any) => row.image ? (
        <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden' }}><img src={`/storage/${row.image}`} alt={row.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
      ) : <div style={{ width: '40px', height: '40px', backgroundColor: '#e5e7eb', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>No Img</div>
    },
    { key: 'title', label: 'Title', render: (row: any) => row.title },
    { key: 'sku', label: 'SKU' },
    { key: 'unit', label: 'Unit' },
    { key: 'current_stock', label: 'Global Stock' },
    {
      key: 'is_sellable',
      label: 'On till',
      render: (row: any) => row.is_sellable
        ? <span className="badge badge-success text-white px-3 py-1 h-auto rounded-full">Sellable</span>
        : <span className="text-base-content/30">—</span>
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 className="text-2xl font-bold">Inventory Items</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen); setEditingId(null); setImageFile(null);
          setFormData({ title: '', description: '', sku: '', unit: '', min_stock_level: '', current_stock: '', cost_per_unit: '', is_sellable: false, selling_price: '', image: '', locations: locations.map(l => ({ location_id: l.id, quantity: 0, is_active: true })) });
        }}>
          {isFormOpen ? 'Close Form' : '+ New Item'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Item' : 'New Item'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Title" name="title" value={formData.title} onChange={handleInputChange} required />
            <div className="form-control w-full sm:col-span-2">
              <label className="label"><span className="label-text font-medium">Description</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="What this is, grade, pack size — anything that tells two similar items apart"
              />
            </div>
            <Input label="SKU" name="sku" value={formData.sku} onChange={handleInputChange} required />
            <Input label="Unit (e.g. kg, L)" name="unit" value={formData.unit} onChange={handleInputChange} required />
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Cost per unit</span></label>
              <div className="input input-bordered flex items-center justify-between bg-base-200/50">
                <span className="font-medium">
                  {formData.cost_per_unit !== '' && formData.cost_per_unit !== null
                    ? Number(formData.cost_per_unit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : <span className="text-content-muted">Not purchased yet</span>}
                </span>
                <span className="text-xs text-content-muted">from last delivery</span>
              </div>
            </div>
            <Input label="Min Stock Level" name="min_stock_level" type="number" step="0.01" value={formData.min_stock_level} onChange={handleInputChange} />
            
            <div style={{ gridColumn: '1 / -1' }}>
              <ImageUpload
                label="Item Image"
                currentUrl={formData.image ? `/storage/${formData.image}` : ''}
                file={imageFile}
                onFileChange={setImageFile}
                disabled={submitting}
              />
            </div>

            <div className="rounded-[var(--radius-field)] border border-base-300 p-4 sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary mt-0.5"
                  checked={formData.is_sellable}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_sellable: e.target.checked }))}
                  disabled={submitting}
                />
                <span>
                  <span className="font-medium">Sell this item at the till</span>
                  <span className="block text-sm text-content-muted">
                    For stock sold exactly as it was bought — a bottle, a packet, a can. It appears in POS and in
                    the product catalog, and selling one takes it off this outlet&apos;s shelf.
                  </span>
                </span>
              </label>

              {formData.is_sellable && (
                <div className="mt-4 max-w-xs">
                  <Input
                    label="Selling price"
                    name="selling_price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.selling_price}
                    onChange={handleInputChange}
                  />
                  {formData.cost_per_unit !== '' && formData.selling_price !== '' && (
                    <p className="mt-1 text-xs text-content-muted">
                      Cost {Number(formData.cost_per_unit).toFixed(2)} · margin{' '}
                      {(Number(formData.selling_price) - Number(formData.cost_per_unit)).toFixed(2)} per {formData.unit || 'unit'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="form-control w-full" style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <label className="label" style={{ marginBottom: '0.25rem', display: 'block', fontWeight: 600 }}>Outlets & stock on hand</label>
              <p className="mb-3 text-sm text-content-muted">
                Tick the outlets that carry this item. Stock levels are not typed in here — they come from
                the purchase orders that delivered the goods.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flexDirection: 'column' }}>
                {locations.map(loc => {
                  const locData = formData.locations.find(l => l.location_id === loc.id) || { quantity: 0, is_active: false };
                  return (
                    <div key={loc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-base-200/50 px-4 py-2">
                      <label className="flex min-w-40 cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={locData.is_active} onChange={(e) => handleLocationChange(loc.id, 'is_active', e.target.checked)} className="checkbox checkbox-sm checkbox-primary" />
                        <span className="font-medium">{loc.name}</span>
                      </label>
                      <span className="text-sm">
                        <span className="text-content-muted">On hand</span>
                        <span className="ml-2 font-semibold text-base-content">
                          {Number(locData.quantity || 0).toLocaleString()} {formData.unit}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <a href="/admin/inventory/purchase-orders" className="mt-3 text-sm font-medium text-primary">
                Record a delivery in Purchase Orders &rarr;
              </a>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Saving...' : (editingId ? 'Update' : 'Create')}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary"></span></div> : (
          <>
            <Table columns={columns} data={items} onEdit={handleEdit} onDelete={handleDelete} />
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
