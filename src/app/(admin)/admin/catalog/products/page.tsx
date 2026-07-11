'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from '@/components/ui/ui.module.css';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    type: 'food',
    is_active: 1,
    image_url: '',
    locations: [] as { location_id: number, is_available: boolean }[]
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [productRecipes, setProductRecipes] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, setRes, locRes] = await Promise.all([
        fetchApi(`/products?page=${page}`),
        fetchApi('/product-categories?nopaginate=1'),
        fetchApi('/website-settings'),
        fetchApi('/locations')
      ]);
      
      if (prodRes && prodRes.data && Array.isArray(prodRes.data)) {
         setProducts(prodRes.data);
         setTotalPages(prodRes.last_page || 1);
      } else if (prodRes && prodRes.data && prodRes.data.data && Array.isArray(prodRes.data.data)) {
         setProducts(prodRes.data.data);
         setTotalPages(prodRes.data.last_page || 1);
      } else {
         setProducts(prodRes.data || prodRes || []);
         setTotalPages(1);
      }
      
      setCategories(catRes.data || catRes || []);
      setLocations(locRes.data || locRes || []);
      
      const map: Record<string, string> = {};
      (setRes.data || setRes || []).forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        category_id: formData.category_id ? parseInt(formData.category_id as string) : null,
        is_active: parseInt(formData.is_active as unknown as string)
      };

      const formDataToSend = new FormData();
      Object.keys(payload).forEach(key => {
        if (key === 'locations') return;
        if (payload[key as keyof typeof payload] !== null && payload[key as keyof typeof payload] !== undefined) {
          formDataToSend.append(key, String(payload[key as keyof typeof payload]));
        }
      });

      payload.locations.forEach((loc, index) => {
        formDataToSend.append(`locations[${index}][location_id]`, loc.location_id.toString());
        formDataToSend.append(`locations[${index}][is_available]`, loc.is_available ? '1' : '0');
      });
      
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      if (editingId) {
        formDataToSend.append('_method', 'PUT');
        await fetchApi(`/products/${editingId}`, {
          method: 'POST',
          body: formDataToSend,
        });
      } else {
        await fetchApi('/products', {
          method: 'POST',
          body: formDataToSend,
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setImageFile(null);
      setFormData({ name: '', description: '', price: '', category_id: '', type: 'food', is_active: 1, image_url: '', locations: [] });
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
      is_active: row.is_active !== undefined ? row.is_active : 1,
      image_url: row.images && row.images.length > 0 ? row.images[0].url : '',
      locations: (row.locations || []).map((loc: any) => ({
        location_id: loc.id,
        is_available: loc.pivot ? loc.pivot.is_available === 1 || loc.pivot.is_available === true : true
      }))
    });
    setImageFile(null);
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

  const columns = [
    { key: 'id', label: 'ID' },
    { 
      key: 'image', 
      label: 'Image',
      render: (row: any) => row.images && row.images.length > 0 ? (
        <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden' }}>
          <img 
            src={`/storage/${row.images[0].url}`} 
            alt={row.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      ) : (
        <div style={{ width: '40px', height: '40px', backgroundColor: '#e5e7eb', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>No Img</div>
      )
    },
    { key: 'name', label: 'Name' },
    { key: 'price', label: `Price (${settings.currency_symbol || '৳'})` },
    { key: 'type', label: 'Type' },
    { key: 'is_active', label: 'Active', render: (row: any) => (
      <span className={`badge ${row.is_active ? 'badge-success text-white' : 'badge-ghost'} px-3 py-1 h-auto rounded-full`}>
        {row.is_active ? 'Active' : 'Inactive'}
      </span>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Product Management</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
          setImageFile(null);
          setFormData({ 
            name: '', description: '', price: '', category_id: '', type: 'food', is_active: 1, image_url: '',
            locations: locations.map(l => ({ location_id: l.id, is_available: true }))
          });
        }}>
          {isFormOpen ? 'Close Form' : '+ New Product'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Product' : 'New Product'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

            <div className="form-control w-full" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Image Upload</label>
              <input 
                className="input input-bordered w-full"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {formData.image_url && !imageFile && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'gray', marginBottom: '4px' }}>Current image:</p>
                  <img 
                    src={`/storage/${formData.image_url}`} 
                    alt="Current product" 
                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} 
                  />
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

            {editingId && (
              <div className="form-control w-full" style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <label className="label" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Recipe / BOM</span>
                  <a href={`/admin/inventory/recipes?product_id=${editingId}&action=new`} target="_blank" style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 'normal' }}>Manage Recipes &rarr;</a>
                </label>
                {productRecipes.length > 0 ? (
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {productRecipes.map(r => (
                      <li key={r.id}>{r.inventory_item?.name} - {r.quantity_required} {r.inventory_item?.unit}</li>
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
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary"></span></div> : (
          <>
            <Table columns={columns} data={products} onEdit={handleEdit} onDelete={handleDelete} />
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