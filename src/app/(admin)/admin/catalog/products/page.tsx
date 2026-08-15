'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MultiImageUpload, ExistingImage } from '@/components/ui/MultiImageUpload';
import styles from '@/components/ui/ui.module.css';
import { Star } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage, setPerPage] = useState(15);

  // Search / filter / sort state
  const [search, setSearch] = useState('');
  const [filterCookable, setFilterCookable] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    type: 'food',
    needs_cooking: false,
    is_active: 1,
    locations: [] as { location_id: number, is_available: boolean }[],
  });

  // Multi-image state
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null); // existing image id
  const [featuredNewIndex, setFeaturedNewIndex] = useState<number | null>(null); // index in newImageFiles

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [productRecipes, setProductRecipes] = useState<any[]>([]);

  const buildQuery = useCallback(() => {
    const q = new URLSearchParams({ page: String(page) });
    if (search) q.set('search', search);
    if (filterCookable !== '') q.set('needs_cooking', filterCookable);
    if (filterActive !== '') q.set('is_active', filterActive);
    if (filterCategory) q.set('category_id', filterCategory);
    if (sortField) { q.set('sort', sortField); q.set('direction', sortDir); }
    return q.toString();
  }, [page, search, filterCookable, filterActive, filterCategory, sortField, sortDir]);

  useEffect(() => { loadData(); }, [buildQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, setRes, locRes] = await Promise.all([
        fetchApi(`/products?${buildQuery()}`),
        fetchApi('/product-categories?nopaginate=1'),
        fetchApi('/website-settings'),
        fetchApi('/locations'),
      ]);

      if (prodRes?.data && Array.isArray(prodRes.data)) {
        setProducts(prodRes.data);
        setTotalPages(prodRes.last_page || 1);
        setTotalItems(prodRes.total || prodRes.data.length);
        setPerPage(prodRes.per_page || 15);
      } else if (prodRes?.data?.data && Array.isArray(prodRes.data.data)) {
        setProducts(prodRes.data.data);
        setTotalPages(prodRes.data.last_page || 1);
        setTotalItems(prodRes.data.total || prodRes.data.data.length);
        setPerPage(prodRes.data.per_page || 15);
      } else {
        setProducts(prodRes?.data || prodRes || []);
        setTotalPages(1);
        setTotalItems((prodRes?.data || prodRes || []).length);
        setPerPage(15);
      }

      setCategories(catRes?.data || catRes || []);
      setLocations(locRes?.data || locRes || []);

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
      name: '', description: '', price: '', category_id: '', type: 'food',
      needs_cooking: false, is_active: 1,
      locations: locs.map(l => ({ location_id: l.id, is_available: true })),
    });
    setExistingImages([]);
    setRemovedImageIds([]);
    setNewImageFiles([]);
    setFeaturedImageId(null);
    setFeaturedNewIndex(null);
    setEditingId(null);
    setProductRecipes([]);
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
      if (formData.category_id) fd.append('category_id', formData.category_id);
      fd.append('type', formData.type);
      fd.append('needs_cooking', formData.needs_cooking ? '1' : '0');
      fd.append('is_active', String(formData.is_active));

      formData.locations.forEach((loc, i) => {
        fd.append(`locations[${i}][location_id]`, loc.location_id.toString());
        fd.append(`locations[${i}][is_available]`, loc.is_available ? '1' : '0');
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
      alert('Failed to save product');
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
      category_id: row.category_id || '',
      type: row.type || 'food',
      needs_cooking: Boolean(row.needs_cooking),
      is_active: row.is_active !== undefined ? row.is_active : 1,
      locations: (row.locations || []).map((loc: any) => ({
        location_id: loc.id,
        is_available: loc.pivot ? loc.pivot.is_available === 1 || loc.pivot.is_available === true : true,
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

    try {
      const res = await fetchApi(`/recipes?product_id=${row.id}`);
      setProductRecipes(res.data?.data || res.data || res || []);
    } catch (err) {
      console.error('Failed to load recipes', err);
    }
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete ${row.name}?`)) {
      try {
        await fetchApi(`/products/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete product');
      }
    }
  };

  const sortIndicator = (field: string) =>
    sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

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
      key: 'price',
      label: `Price (${settings.currency_symbol || '৳'})${sortIndicator('price')}`,
      render: (row: any) => (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('price')}>{row.price}</span>
      ),
    },
    { key: 'type', label: 'Type' },
    {
      key: 'needs_cooking',
      label: 'Cookable',
      render: (row: any) => (
        <span className={`badge ${row.needs_cooking ? 'badge-info text-white' : 'badge-ghost'} px-3 py-1 h-auto rounded-full`}>
          {row.needs_cooking ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Active',
      render: (row: any) => (
        <span className={`badge ${row.is_active ? 'badge-success text-white' : 'badge-ghost'} px-3 py-1 h-auto rounded-full`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  // Derived list of kept existing images for featured picker
  const keptExisting = existingImages.filter(img => !removedImageIds.includes(img.id));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Product Management</h1>
        <Button onClick={() => {
          if (isFormOpen) { setIsFormOpen(false); resetForm(); }
          else { resetForm(); setIsFormOpen(true); }
        }}>
          {isFormOpen ? 'Close Form' : '+ New Product'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Product' : 'New Product'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name" name="name" value={formData.name} onChange={handleInputChange} required />
            <Input label="Price" name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} required />

            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Category</span></label>
              <select className="select select-bordered w-full" name="category_id" value={formData.category_id} onChange={handleInputChange}>
                <option value="">Select a category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Type</span></label>
              <select className="select select-bordered w-full" name="type" value={formData.type} onChange={handleInputChange}>
                <option value="food">Food</option>
                <option value="beverage">Beverage</option>
                <option value="merchandise">Merchandise</option>
              </select>
            </div>

            <div className="form-control w-full sm:col-span-2">
              <label className="label"><span className="label-text font-medium">Description</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            {/* Multi-image upload */}
            <div style={{ gridColumn: '1 / -1' }}>
              <MultiImageUpload
                label="Product Images"
                existing={existingImages}
                removedIds={removedImageIds}
                onRemoveExisting={(id) => {
                  setRemovedImageIds(prev => [...prev, id]);
                  if (featuredImageId === id) setFeaturedImageId(keptExisting.find(i => i.id !== id)?.id ?? null);
                }}
                files={newImageFiles}
                onFilesChange={setNewImageFiles}
                disabled={submitting}
                hint="Drag product photos here · PNG, JPG or WEBP · up to 5 MB each"
              />

              {/* Featured image picker */}
              {(keptExisting.length + newImageFiles.length) > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Featured image <span className="text-base-content/50 font-normal">(shown in POS and product list)</span></p>
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

            <div className="rounded-[var(--radius-field)] border border-base-300 p-4 sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary mt-0.5"
                  checked={formData.needs_cooking}
                  onChange={(e) => setFormData(prev => ({ ...prev, needs_cooking: e.target.checked }))}
                  disabled={submitting}
                />
                <span>
                  <span className="font-medium">Needs to cook</span>
                  <span className="block text-sm text-content-muted">
                    Dishes prepared to order go to the kitchen display and start at Cooking. Leave this unticked for
                    anything handed over as it is — bottled drinks, packaged snacks — and orders made only of those
                    skip the kitchen and open at Ready to Serve.
                  </span>
                </span>
              </label>
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

            {editingId && (
              <div className="form-control w-full" style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <label className="label" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Recipe</span>
                  <a href={`/admin/inventory/recipes?product_id=${editingId}&action=new`} target="_blank" style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 'normal' }}>Manage Recipes →</a>
                </label>
                {productRecipes.length > 0 ? (
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {productRecipes.map(r => (
                      <li key={r.id}>
                        {r.inventory_item?.images?.[0] && (
                          <img
                            src={r.inventory_item.images[0].url?.startsWith('http') ? r.inventory_item.images[0].url : `/storage/${r.inventory_item.images[0].url}`}
                            alt=""
                            style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 3, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }}
                          />
                        )}
                        {r.inventory_item?.title} — {r.quantity_required} {r.inventory_item?.unit}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: 'gray' }}>No recipe defined for this product.</p>
                )}
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : (editingId ? 'Update Product' : 'Create Product')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setIsFormOpen(false); resetForm(); }} disabled={submitting}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search + Filter + Sort bar */}
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
          <label className="label py-1"><span className="label-text text-xs">Cookable</span></label>
          <select className="select select-bordered select-sm" value={filterCookable} onChange={e => { setFilterCookable(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Status</span></label>
          <select className="select select-bordered select-sm" value={filterActive} onChange={e => { setFilterActive(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Category</span></label>
          <select className="select select-bordered select-sm" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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
            <Table columns={columns} data={products} onEdit={handleEdit} onDelete={handleDelete} />
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pb-2 gap-3">
              <span className="text-sm text-base-content/50">
                {totalItems > 0
                  ? `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalItems)} of ${totalItems} products`
                  : 'No products found'}
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
