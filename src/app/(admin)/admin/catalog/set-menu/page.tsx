'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MultiImageUpload, ExistingImage } from '@/components/ui/MultiImageUpload';
import { Star } from 'lucide-react';
import { SearchSelect } from '@/components/ui/SearchSelect';

export default function SetMenuPage() {
  const [combos, setCombos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage, setPerPage] = useState(15);

  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sale_price: '',
    category_id: '',
    is_active: 1,
    locations: [] as { location_id: number; is_available: boolean }[],
  });

  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null);
  const [featuredNewIndex, setFeaturedNewIndex] = useState<number | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [comboItems, setComboItems] = useState<{ product_id?: number | null; inventory_item_id?: number | null; quantity: number }[]>([]);
  const [allProductsList, setAllProductsList] = useState<any[]>([]);
  const [inventoryItemsList, setInventoryItemsList] = useState<any[]>([]);

  const buildQuery = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), type: 'combo' });
    if (search) q.set('search', search);
    if (filterActive !== '') q.set('is_active', filterActive);
    if (filterCategory) q.set('category_id', filterCategory);
    if (sortField) { q.set('sort', sortField); q.set('direction', sortDir); }
    return q.toString();
  }, [page, search, filterActive, filterCategory, sortField, sortDir]);

  useEffect(() => { loadData(); }, [buildQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, setRes, locRes, allProdRes, invRes] = await Promise.all([
        fetchApi(`/products?${buildQuery()}`),
        fetchApi('/product-categories?nopaginate=1'),
        fetchApi('/website-settings'),
        fetchApi('/locations'),
        fetchApi('/products?nopaginate=1'),
        fetchApi('/inventory-items?nopaginate=1&is_sellable=1'),
      ]);

      if (prodRes?.data && Array.isArray(prodRes.data)) {
        setCombos(prodRes.data);
        setTotalPages(prodRes.last_page || 1);
        setTotalItems(prodRes.total || prodRes.data.length);
        setPerPage(prodRes.per_page || 15);
      } else if (prodRes?.data?.data && Array.isArray(prodRes.data.data)) {
        setCombos(prodRes.data.data);
        setTotalPages(prodRes.data.last_page || 1);
        setTotalItems(prodRes.data.total || prodRes.data.data.length);
        setPerPage(prodRes.data.per_page || 15);
      } else {
        setCombos(prodRes?.data || prodRes || []);
        setTotalPages(1);
        setTotalItems((prodRes?.data || prodRes || []).length);
        setPerPage(15);
      }

      const cats = catRes?.data || catRes || [];
      const locs = locRes?.data || locRes || [];
      setCategories(cats);
      setLocations(locs);
      setAllProductsList((allProdRes?.data || allProdRes || []).filter((p: any) => p.type !== 'combo'));
      const invData = invRes?.data || invRes || [];
      setInventoryItemsList(Array.isArray(invData) ? invData.filter((i: any) => i.is_sellable === 1 || i.is_sellable === true) : []);

      const map: Record<string, string> = {};
      (setRes?.data || setRes || []).forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (locs: any[] = locations) => {
    setFormData({
      name: '', description: '', price: '', sale_price: '', category_id: '',
      is_active: 1,
      locations: locs.map(l => ({ location_id: l.id, is_available: true })),
    });
    setExistingImages([]);
    setRemovedImageIds([]);
    setNewImageFiles([]);
    setFeaturedImageId(null);
    setFeaturedNewIndex(null);
    setEditingId(null);
    setComboItems([{ product_id: null, inventory_item_id: null, quantity: 1 }]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationToggle = (locationId: number) => {
    setFormData(prev => {
      const locs = [...prev.locations];
      const existing = locs.find(l => l.location_id === locationId);
      if (existing) {
        existing.is_available = !existing.is_available;
      } else {
        locs.push({ location_id: locationId, is_available: true });
      }
      return { ...prev, locations: locs };
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('description', formData.description);
      fd.append('price', formData.price);
      if (formData.sale_price) fd.append('sale_price', formData.sale_price);
      if (formData.category_id) fd.append('category_id', formData.category_id);
      fd.append('type', 'combo');
      fd.append('is_active', String(formData.is_active));

      formData.locations.forEach((loc, i) => {
        fd.append(`locations[${i}][location_id]`, loc.location_id.toString());
        fd.append(`locations[${i}][is_available]`, loc.is_available ? '1' : '0');
      });

      comboItems.forEach((ci, i) => {
        if (ci.product_id) fd.append(`combo_items[${i}][product_id]`, String(ci.product_id));
        if (ci.inventory_item_id) fd.append(`combo_items[${i}][inventory_item_id]`, String(ci.inventory_item_id));
        fd.append(`combo_items[${i}][quantity]`, String(ci.quantity));
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
        await fetchApi(`/products/${editingId}`, { method: 'POST', body: fd });
      } else {
        await fetchApi('/products', { method: 'POST', body: fd });
      }

      setIsFormOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save set menu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (row: any) => {
    setEditingId(row.id);
    setFormData({
      name: row.name || '',
      description: row.description || '',
      price: row.price || '',
      sale_price: row.sale_price || '',
      category_id: row.category_id || '',
      is_active: row.is_active !== undefined ? row.is_active : 1,
      locations: (row.locations || []).map((loc: any) => ({
        location_id: loc.id,
        is_available: loc.pivot ? loc.pivot.is_available === 1 || loc.pivot.is_available === true : true,
      })),
    });

    if (row.combo_items && row.combo_items.length > 0) {
      setComboItems(row.combo_items.map((ci: any) => ({
        product_id: ci.product_id || null,
        inventory_item_id: ci.inventory_item_id || null,
        quantity: ci.quantity || 1,
      })));
    } else {
      setComboItems([{ product_id: null, inventory_item_id: null, quantity: 1 }]);
    }

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
    if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
      try {
        await fetchApi(`/products/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete set menu');
      }
    }
  };

  const sortIndicator = (field: string) =>
    sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const currency = settings.currency_symbol || '৳';

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'image',
      label: 'Image',
      render: (row: any) => {
        const featured = (row.images || []).find((i: any) => i.is_featured) || row.images?.[0];
        return featured ? (
          <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden' }}>
            <img
              src={featured.url?.startsWith('http') ? featured.url : `/storage/${featured.url}`}
              alt={row.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div style={{ width: '40px', height: '40px', backgroundColor: '#e5e7eb', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>No Img</div>
        );
      },
    },
    {
      key: 'name',
      label: `Name${sortIndicator('name')}`,
      render: (row: any) => (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>{row.name}</span>
      ),
    },
    {
      key: 'combo_items',
      label: 'Includes',
      render: (row: any) => {
        const items = row.combo_items || [];
        if (items.length === 0) return <span className="text-base-content/40 text-sm">No items</span>;
        return (
          <div className="space-y-0.5">
            {items.map((ci: any, i: number) => (
              <div key={i} className="text-xs text-base-content/70">
                {ci.quantity > 1 ? `${ci.quantity}× ` : ''}{ci.product?.name || ci.inventory_item?.title || 'Item'}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: 'price',
      label: `Price${sortIndicator('price')}`,
      render: (row: any) => (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('price')}>
          {row.sale_price && Number(row.sale_price) < Number(row.price) ? (
            <>
              <span className="line-through text-base-content/40 mr-1">{currency}{row.price}</span>
              <span className="font-semibold text-success">{currency}{row.sale_price}</span>
            </>
          ) : (
            <span>{currency}{row.price}</span>
          )}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: any) => (
        <span className={`badge ${row.is_active ? 'badge-success text-white' : 'badge-ghost'} px-3 py-1 h-auto rounded-full`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const keptExisting = existingImages.filter(img => !removedImageIds.includes(img.id));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Set Menu / Combos</h1>
        <Button onClick={() => {
          if (isFormOpen) { setIsFormOpen(false); resetForm(); }
          else { resetForm(); setIsFormOpen(true); }
        }}>
          {isFormOpen ? 'Close Form' : '+ New Set Menu'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Set Menu' : 'New Set Menu'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Set Menu Name" name="name" value={formData.name} onChange={handleInputChange} required />

            <SearchSelect
              label="Category"
              value={formData.category_id}
              onChange={(v) => setFormData(prev => ({ ...prev, category_id: String(v) }))}
              options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
              placeholder="Select a category"
              searchPlaceholder="Search categories…"
            />

            <Input label={`Price (${currency})`} name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} required />
            <Input label={`Sale Price (${currency})`} name="sale_price" type="number" step="0.01" value={formData.sale_price} onChange={handleInputChange} />

            {/* Combo items builder */}
            <div className="sm:col-span-2 bg-base-200/50 border border-base-300 rounded-xl p-4 space-y-3">
              <div>
                <h4 className="font-bold text-sm flex items-center gap-1.5">
                  Items in this Set Menu
                </h4>
                <p className="text-xs text-base-content/60">
                  Add the products and inventory items that make up this set menu. Customers will see these as the combo breakdown.
                </p>
              </div>

              {comboItems.length === 0 ? (
                <div className="text-center py-4 text-xs opacity-60 border border-dashed border-base-300 rounded-lg">
                  No items added yet. Click &quot;+ Add Item&quot; below to start building the set menu.
                </div>
              ) : (
                <div className="space-y-2">
                  {comboItems.map((item, idx) => {
                    const itemType = item.inventory_item_id ? 'inventory' : 'product';
                    return (
                      <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-base-100 p-2.5 rounded-lg border border-base-200">
                        <select
                          className="select select-sm select-bordered w-28 text-xs"
                          value={itemType}
                          onChange={(e) => {
                            const val = e.target.value;
                            setComboItems(prev => prev.map((ci, i) => i === idx ? (
                              val === 'product'
                                ? { product_id: allProductsList[0]?.id || null, inventory_item_id: null, quantity: ci.quantity }
                                : { product_id: null, inventory_item_id: inventoryItemsList[0]?.id || null, quantity: ci.quantity }
                            ) : ci));
                          }}
                        >
                          <option value="product">Product</option>
                          <option value="inventory">Stock Item</option>
                        </select>

                        {itemType === 'product' ? (
                          <SearchSelect
                            label=""
                            value={item.product_id || ''}
                            onChange={(v) => {
                              setComboItems(prev => prev.map((ci, i) => i === idx ? { ...ci, product_id: Number(v), inventory_item_id: null } : ci));
                            }}
                            options={allProductsList.filter(p => p.id !== editingId).map(p => ({
                              value: p.id,
                              label: p.name,
                              hint: `${currency}${p.price}${p.needs_cooking ? ' · Cookable' : ''}`,
                            }))}
                            placeholder="Select Product"
                            searchPlaceholder="Search product..."
                          />
                        ) : (
                          <SearchSelect
                            label=""
                            value={item.inventory_item_id || ''}
                            onChange={(v) => {
                              setComboItems(prev => prev.map((ci, i) => i === idx ? { ...ci, inventory_item_id: Number(v), product_id: null } : ci));
                            }}
                            options={inventoryItemsList.map(inv => ({
                              value: inv.id,
                              label: inv.title || inv.description || `Item #${inv.id}`,
                              hint: inv.unit ? `Unit: ${inv.unit}` : '',
                            }))}
                            placeholder="Select Inventory Item"
                            searchPlaceholder="Search inventory item..."
                          />
                        )}

                        <div className="flex items-center gap-1.5 w-32 shrink-0">
                          <span className="text-xs font-medium opacity-70">Qty:</span>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            className="input input-sm input-bordered w-full text-xs"
                            value={item.quantity}
                            onChange={(e) => {
                              const q = parseFloat(e.target.value) || 1;
                              setComboItems(prev => prev.map((ci, i) => i === idx ? { ...ci, quantity: q } : ci));
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          className="btn btn-xs btn-ghost text-error"
                          onClick={() => setComboItems(prev => prev.filter((_, i) => i !== idx))}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline btn-primary gap-1"
                  onClick={() => setComboItems(prev => [...prev, { product_id: allProductsList[0]?.id || null, inventory_item_id: null, quantity: 1 }])}
                >
                  + Add Item
                </button>
              </div>
            </div>

            <div className="form-control w-full sm:col-span-2">
              <label className="label"><span className="label-text font-medium">Description</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Describe what this set menu includes and any special notes…"
              />
            </div>

            {/* Multi-image upload */}
            <div style={{ gridColumn: '1 / -1' }}>
              <MultiImageUpload
                label="Set Menu Images"
                existing={existingImages}
                removedIds={removedImageIds}
                onRemoveExisting={(id) => {
                  setRemovedImageIds(prev => [...prev, id]);
                  if (featuredImageId === id) setFeaturedImageId(keptExisting.find(i => i.id !== id)?.id ?? null);
                }}
                files={newImageFiles}
                onFilesChange={setNewImageFiles}
                disabled={submitting}
                hint="Drag set menu photos here · PNG, JPG or WEBP · up to 5 MB each"
              />

              {(keptExisting.length + newImageFiles.length) > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Featured image <span className="text-base-content/50 font-normal">(shown in POS and menu)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {keptExisting.map(img => {
                      const isFeatured = featuredImageId === img.id && featuredNewIndex === null;
                      return (
                        <button
                          key={`feat-exist-${img.id}`}
                          type="button"
                          onClick={() => { setFeaturedImageId(img.id); setFeaturedNewIndex(null); }}
                          className={`relative rounded-lg border-2 overflow-hidden transition-all ${isFeatured ? 'border-primary shadow-md' : 'border-base-300 opacity-70 hover:opacity-100'}`}
                          style={{ width: 56, height: 56 }}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          {isFeatured && (
                            <span className="absolute bottom-0.5 right-0.5 bg-primary rounded-full p-0.5">
                              <Star size={10} className="text-primary-content fill-primary-content" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {newImageFiles.map((file, idx) => {
                      const isFeatured = featuredNewIndex === idx && featuredImageId === null;
                      const url = URL.createObjectURL(file);
                      return (
                        <button
                          key={`feat-new-${idx}`}
                          type="button"
                          onClick={() => { setFeaturedNewIndex(idx); setFeaturedImageId(null); }}
                          className={`relative rounded-lg border-2 overflow-hidden transition-all ${isFeatured ? 'border-primary shadow-md' : 'border-base-300 opacity-70 hover:opacity-100'}`}
                          style={{ width: 56, height: 56 }}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {isFeatured && (
                            <span className="absolute bottom-0.5 right-0.5 bg-primary rounded-full p-0.5">
                              <Star size={10} className="text-primary-content fill-primary-content" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Status</span></label>
              <select className="select select-bordered w-full" name="is_active" value={formData.is_active} onChange={handleInputChange}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>

            {/* Location availability — hidden when only one location */}
            {locations.length > 1 && (
              <div className="form-control w-full" style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <label className="label" style={{ marginBottom: '0.75rem', display: 'block', fontWeight: 600 }}>Location Availability</label>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {locations.map(loc => {
                    const isAvailable = formData.locations.find(l => l.location_id === loc.id)?.is_available ?? false;
                    return (
                      <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={isAvailable}
                          onChange={() => handleLocationToggle(loc.id)}
                          className="checkbox checkbox-sm checkbox-primary"
                        />
                        {loc.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : (editingId ? 'Update Set Menu' : 'Create Set Menu')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setIsFormOpen(false); resetForm(); }} disabled={submitting}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search + Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <Input
            label="Search"
            placeholder="Search by name…"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Status</span></label>
          <select className="select select-bordered select-sm" value={filterActive} onChange={e => { setFilterActive(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        <div className="form-control min-w-[160px]">
          <SearchSelect
            label=""
            value={filterCategory}
            onChange={(v) => { setFilterCategory(String(v)); setPage(1); }}
            options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
            placeholder="All Categories"
            searchPlaceholder="Search categories…"
            clearable
          />
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Sort By</span></label>
          <select className="select select-bordered select-sm" value={sortField ? `${sortField}_${sortDir}` : ''} onChange={e => {
            const val = e.target.value;
            if (!val) { setSortField(''); return; }
            const [f, d] = val.split('_');
            setSortField(f);
            setSortDir(d as 'asc' | 'desc');
            setPage(1);
          }}>
            <option value="">Default</option>
            <option value="name_asc">Name A→Z</option>
            <option value="name_desc">Name Z→A</option>
            <option value="price_asc">Price Low→High</option>
            <option value="price_desc">Price High→Low</option>
          </select>
        </div>
      </div>

      <Card>
        {loading ? <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary"></span></div> : (
          <>
            <Table columns={columns} data={combos} onEdit={handleEdit} onDelete={handleDelete} />
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pb-2 gap-3">
              <span className="text-sm text-base-content/50">
                {totalItems > 0
                  ? `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalItems)} of ${totalItems} set menus`
                  : 'No set menus found'}
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
