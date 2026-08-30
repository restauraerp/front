'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MultiImageUpload, ExistingImage } from '@/components/ui/MultiImageUpload';
import { Star } from 'lucide-react';

export default function InventoryItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage, setPerPage] = useState(15);

  // Search / filter / sort
  const [search, setSearch] = useState('');
  const [filterSellable, setFilterSellable] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sku: '',
    unit: '',
    sale_unit: '',
    sale_units_per_purchase_unit: '1',
    min_stock_level: '',
    current_stock: '',
    cost_per_unit: '',
    is_sellable: false,
    selling_price: '',
    locations: [] as { location_id: number, quantity: number, is_active: boolean }[],
  });

  // Multi-image state
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null);
  const [featuredNewIndex, setFeaturedNewIndex] = useState<number | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const buildQuery = useCallback(() => {
    const q = new URLSearchParams({ page: String(page) });
    if (search) q.set('search', search);
    if (filterSellable !== '') q.set('is_sellable', filterSellable);
    if (sortField) { q.set('sort', sortField); q.set('direction', sortDir); }
    return q.toString();
  }, [page, search, filterSellable, sortField, sortDir]);

  useEffect(() => { loadData(); }, [buildQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, locRes] = await Promise.all([
        fetchApi(`/inventory-items?${buildQuery()}`),
        fetchApi('/locations'),
      ]);
      if (itemsRes?.data && Array.isArray(itemsRes.data)) {
        setItems(itemsRes.data);
        setTotalPages(itemsRes.last_page || 1);
        setTotalItems(itemsRes.total || itemsRes.data.length);
        setPerPage(itemsRes.per_page || 15);
      } else {
        setItems(itemsRes?.data?.data || itemsRes?.data || []);
        setTotalPages(itemsRes?.data?.last_page || 1);
        setTotalItems(itemsRes?.data?.total || (itemsRes?.data?.data || itemsRes?.data || []).length);
        setPerPage(itemsRes?.data?.per_page || 15);
      }
      setLocations(locRes?.data || locRes || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const resetForm = (locs: any[] = locations) => {
    setFormData({
      title: '', description: '', sku: '', unit: '', sale_unit: '', sale_units_per_purchase_unit: '1', min_stock_level: '',
      current_stock: '', cost_per_unit: '', is_sellable: false, selling_price: '',
      locations: locs.map(l => ({ location_id: l.id, quantity: 0, is_active: true })),
    });
    setExistingImages([]);
    setRemovedImageIds([]);
    setNewImageFiles([]);
    setFeaturedImageId(null);
    setFeaturedNewIndex(null);
    setEditingId(null);
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
      const fd = new FormData();
      fd.append('title', formData.title);
      if (formData.description) fd.append('description', formData.description);
      fd.append('sku', formData.sku);
      fd.append('unit', formData.unit);
      fd.append('sale_unit', formData.sale_unit || '');
      fd.append('sale_units_per_purchase_unit', formData.sale_units_per_purchase_unit || '1');
      if (formData.min_stock_level) fd.append('min_stock_level', formData.min_stock_level);
      fd.append('is_sellable', formData.is_sellable ? '1' : '0');
      if (formData.is_sellable && formData.selling_price) fd.append('selling_price', formData.selling_price);

      formData.locations.forEach((loc, i) => {
        fd.append(`locations[${i}][location_id]`, loc.location_id.toString());
        fd.append(`locations[${i}][is_active]`, loc.is_active ? '1' : '0');
      });

      newImageFiles.forEach((file, i) => fd.append(`images[${i}]`, file));
      removedImageIds.forEach((id, i) => fd.append(`remove_images[${i}]`, String(id)));

      if (featuredImageId !== null) {
        fd.append('featured_image_id', String(featuredImageId));
      } else if (featuredNewIndex !== null) {
        fd.append('featured_image_index', String(featuredNewIndex));
      }

      if (editingId) {
        fd.append('_method', 'PUT');
        await fetchApi(`/inventory-items/${editingId}`, { method: 'POST', body: fd });
      } else {
        await fetchApi('/inventory-items', { method: 'POST', body: fd });
      }

      setIsFormOpen(false);
      resetForm();
      loadData();
    } catch (err) { alert('Failed to save item'); console.error(err); } finally { setSubmitting(false); }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      title: row.title || '', description: row.description || '', sku: row.sku || '', unit: row.unit || '',
      sale_unit: row.sale_unit || '', sale_units_per_purchase_unit: String(row.sale_units_per_purchase_unit ?? '1'),
      min_stock_level: row.min_stock_level || '', current_stock: row.current_stock || '', cost_per_unit: row.cost_per_unit || '',
      is_sellable: Boolean(row.is_sellable), selling_price: row.selling_price ?? '',
      locations: (row.locations || []).map((loc: any) => ({
        location_id: loc.id, quantity: loc.pivot?.quantity || 0,
        is_active: loc.pivot ? (loc.pivot.is_active === 1 || loc.pivot.is_active === true) : false,
      })),
    });

    const imgs: ExistingImage[] = (row.images || []).map((img: any) => ({
      id: img.id,
      url: img.url?.startsWith('http') ? img.url : `/storage/${img.url}`,
    }));
    setExistingImages(imgs);
    setRemovedImageIds([]);
    setNewImageFiles([]);

    const featured = (row.images || []).find((img: any) => img.is_featured);
    setFeaturedImageId(featured ? featured.id : (imgs[0]?.id ?? null));
    setFeaturedNewIndex(null);

    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Delete ${row.title}?`)) {
      try { await fetchApi(`/inventory-items/${row.id}`, { method: 'DELETE' }); loadData(); }
      catch (err) { console.error(err); alert('Failed to delete'); }
    }
  };

  const keptExisting = existingImages.filter(img => !removedImageIds.includes(img.id));

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'image', label: 'Image',
      render: (row: any) => {
        const featured = (row.images || []).find((i: any) => i.is_featured) || row.images?.[0];
        const src = featured ? (featured.url?.startsWith('http') ? featured.url : `/storage/${featured.url}`) : null;
        return src
          ? <div style={{ width: 40, height: 40, borderRadius: 4, overflow: 'hidden' }}><img src={src} alt={row.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
          : <div style={{ width: 40, height: 40, background: '#e5e7eb', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>No Img</div>;
      },
    },
    { key: 'title', label: 'Title', render: (row: any) => row.title },
    { key: 'sku', label: 'SKU' },
    {
      key: 'unit', label: 'Unit',
      render: (row: { unit?: string; sale_unit?: string | null; sale_units_per_purchase_unit?: string | number }) => row.sale_unit && row.sale_unit !== row.unit
        ? <span>{row.unit} <span className="text-base-content/50 text-xs">(1 = {row.sale_units_per_purchase_unit} {row.sale_unit})</span></span>
        : row.unit,
    },
    { key: 'current_stock', label: 'Global Stock' },
    {
      key: 'is_sellable', label: 'Directly Sellable',
      render: (row: any) => row.is_sellable
        ? <span className="badge badge-success text-white px-3 py-1 h-auto rounded-full">Yes</span>
        : <span className="badge badge-ghost px-3 py-1 h-auto rounded-full">No</span>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 className="text-2xl font-bold">Inventory Items</h1>
        <Button data-tour="item-add" onClick={() => {
          if (isFormOpen) { setIsFormOpen(false); resetForm(); }
          else { resetForm(); setIsFormOpen(true); }
        }}>
          {isFormOpen ? 'Close Form' : '+ New Item'}
        </Button>
      </div>

      {isFormOpen && (
        <Card tour="item-form" title={editingId ? 'Edit Item' : 'New Item'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Title" name="title" value={formData.title} onChange={handleInputChange} required />
            <div className="form-control w-full sm:col-span-2">
              <label className="label"><span className="label-text font-medium">Description</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                name="description" rows={2}
                value={formData.description} onChange={handleInputChange}
                placeholder="Grade, pack size, or anything that distinguishes similar items"
              />
            </div>
            <Input label="SKU" name="sku" value={formData.sku} onChange={handleInputChange} required />
            <Input label="Bought in (e.g. sack, drum, kg)" name="unit" value={formData.unit} onChange={handleInputChange} required />

            {/* Stock is counted and valued in the purchase unit above. These two
                are only for items the kitchen measures differently - rice
                arrives in 50kg sacks and leaves the store in kilos. Left blank,
                the item behaves exactly as it always has. */}
            <Input
              label="Used in (optional)"
              name="sale_unit"
              value={formData.sale_unit}
              onChange={handleInputChange}
              placeholder="e.g. kg, litre — leave blank if the same"
            />
            {formData.sale_unit && formData.sale_unit !== formData.unit && (
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">
                    How many {formData.sale_unit} in one {formData.unit || 'purchase unit'}?
                  </span>
                </label>
                <input
                  type="number" step="0.0001" min="0.0001"
                  className="input input-bordered w-full"
                  name="sale_units_per_purchase_unit"
                  value={formData.sale_units_per_purchase_unit}
                  onChange={handleInputChange}
                  aria-label="Units per purchase unit"
                />
                <span className="label-text-alt text-base-content/50 mt-1">
                  Stock stays counted in {formData.unit || 'the purchase unit'}; the kitchen can report in {formData.sale_unit}.
                </span>
              </div>
            )}
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

            {/* Multi-image upload */}
            <div style={{ gridColumn: '1 / -1' }}>
              <MultiImageUpload
                label="Item Images"
                existing={existingImages}
                removedIds={removedImageIds}
                onRemoveExisting={(id) => {
                  setRemovedImageIds(prev => [...prev, id]);
                  if (featuredImageId === id) setFeaturedImageId(keptExisting.find(i => i.id !== id)?.id ?? null);
                }}
                files={newImageFiles}
                onFilesChange={setNewImageFiles}
                disabled={submitting}
                hint="Drag item photos here · PNG, JPG or WEBP · up to 5 MB each"
              />
              {(keptExisting.length + newImageFiles.length) > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Featured image <span className="text-base-content/50 font-normal">(shown in list and POS)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {keptExisting.map(img => {
                      const isFeatured = featuredImageId === img.id && featuredNewIndex === null;
                      return (
                        <button key={`feat-exist-${img.id}`} type="button"
                          onClick={() => { setFeaturedImageId(img.id); setFeaturedNewIndex(null); }}
                          className={`relative rounded-lg border-2 overflow-hidden transition-all ${isFeatured ? 'border-primary shadow-md' : 'border-base-300 opacity-70 hover:opacity-100'}`}
                          style={{ width: 56, height: 56 }}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          {isFeatured && <span className="absolute bottom-0.5 right-0.5 bg-primary rounded-full p-0.5"><Star size={10} className="text-primary-content fill-primary-content" /></span>}
                        </button>
                      );
                    })}
                    {newImageFiles.map((file, idx) => {
                      const isFeatured = featuredNewIndex === idx && featuredImageId === null;
                      const url = URL.createObjectURL(file);
                      return (
                        <button key={`feat-new-${idx}`} type="button"
                          onClick={() => { setFeaturedNewIndex(idx); setFeaturedImageId(null); }}
                          className={`relative rounded-lg border-2 overflow-hidden transition-all ${isFeatured ? 'border-primary shadow-md' : 'border-base-300 opacity-70 hover:opacity-100'}`}
                          style={{ width: 56, height: 56 }}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {isFeatured && <span className="absolute bottom-0.5 right-0.5 bg-primary rounded-full p-0.5"><Star size={10} className="text-primary-content fill-primary-content" /></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Directly Sellable */}
            <div data-tour="item-sellable" className="rounded-[var(--radius-field)] border border-base-300 p-4 sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox" className="checkbox checkbox-primary mt-0.5"
                  checked={formData.is_sellable}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_sellable: e.target.checked }))}
                  disabled={submitting}
                />
                <span>
                  <span className="font-medium">Directly Sellable</span>
                  <span className="block text-sm text-content-muted">
                    For stock sold exactly as bought — a bottle, a packet, a can. Appears in a dedicated
                    Inventory tab in the POS and selling one takes it off this outlet's shelf.
                  </span>
                </span>
              </label>
              {formData.is_sellable && (
                <div className="mt-4 max-w-xs">
                  <Input
                    label="Selling price"
                    name="selling_price" type="number" step="0.01" min="0" required
                    value={formData.selling_price} onChange={handleInputChange}
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

            {/* Outlets */}
            <div className="form-control w-full" style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <label className="label" style={{ marginBottom: '0.25rem', display: 'block', fontWeight: 600 }}>Outlets & stock on hand</label>
              <p className="mb-3 text-sm text-content-muted">
                Tick the outlets that carry this item. Stock comes from purchase orders.
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
                        <span className="ml-2 font-semibold text-base-content">{Number(locData.quantity || 0).toLocaleString()} {formData.unit}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <a href="/admin/inventory/purchase-orders" className="mt-3 text-sm font-medium text-primary">Record a delivery in Purchase Orders →</a>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Saving...' : (editingId ? 'Update' : 'Create')}</Button>
              <Button type="button" variant="secondary" onClick={() => { setIsFormOpen(false); resetForm(); }} disabled={submitting}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search / filter / sort bar */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <Input label="Search" placeholder="Search by title…" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }} />
        </div>

        {/* Sellable filter as styled tab chips */}
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Type</span></label>
          <div className="flex gap-1">
            {[
              { value: '', label: 'All Items', color: filterSellable === '' ? 'btn-neutral' : 'btn-ghost btn-outline' },
              { value: '0', label: 'Ingredients', color: filterSellable === '0' ? 'btn-primary' : 'btn-ghost btn-outline' },
              { value: '1', label: 'Directly Sellable', color: filterSellable === '1' ? 'btn-warning' : 'btn-ghost btn-outline border-warning/50 text-warning hover:bg-warning/10 hover:border-warning' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`btn btn-xs ${opt.color}`}
                onClick={() => { setFilterSellable(opt.value); setPage(1); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Sort By</span></label>
          <select className="select select-bordered select-sm" value={sortField ? `${sortField}_${sortDir}` : ''} onChange={e => {
            const val = e.target.value;
            if (!val) { setSortField(''); return; }
            const [f, d] = val.split('_');
            setSortField(f); setSortDir(d as 'asc' | 'desc'); setPage(1);
          }}>
            <option value="">Default</option>
            <option value="title_asc">Title A→Z</option>
            <option value="title_desc">Title Z→A</option>
          </select>
        </div>
      </div>

      <Card tour="items-table">
        {loading ? <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary"></span></div> : (
          <>
            <Table columns={columns} data={items} onEdit={handleEdit} onDelete={handleDelete} />
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pb-2 gap-3">
              <span className="text-sm text-base-content/50">
                {totalItems > 0
                  ? `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalItems)} of ${totalItems} items`
                  : 'No items found'}
              </span>
              {totalPages > 1 && (
                <div className="join">
                  <button className="join-item btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>«</button>
                  <button className="join-item btn btn-sm bg-base-100 cursor-default">Page {page} of {totalPages}</button>
                  <button className="join-item btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>»</button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
