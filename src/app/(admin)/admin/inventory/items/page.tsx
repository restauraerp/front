'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
    name: '',
    sku: '',
    unit: '',
    min_stock_level: '',
    current_stock: '',
    cost_per_unit: '',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
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
        if (key === 'locations' || key === 'image') return;
        const val = formData[key as keyof typeof formData];
        if (val !== null && val !== undefined && val !== '') formDataToSend.append(key, String(val));
      });
      formData.locations.forEach((loc, index) => {
        formDataToSend.append(`locations[${index}][location_id]`, loc.location_id.toString());
        formDataToSend.append(`locations[${index}][quantity]`, loc.quantity.toString());
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
      title: row.title || '', name: row.name || '', sku: row.sku || '', unit: row.unit || '',
      min_stock_level: row.min_stock_level || '', current_stock: row.current_stock || '', cost_per_unit: row.cost_per_unit || '',
      image: row.image || '',
      locations: (row.locations || []).map((loc: any) => ({
        location_id: loc.id, quantity: loc.pivot?.quantity || 0, is_active: loc.pivot ? (loc.pivot.is_active === 1 || loc.pivot.is_active === true) : false
      }))
    });
    setImageFile(null); setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Delete ${row.title || row.name}?`)) {
      try { await fetchApi(`/inventory-items/${row.id}`, { method: 'DELETE' }); loadData(); } catch (err) { console.error(err); alert('Failed to delete'); }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'image', label: 'Image', render: (row: any) => row.image ? (
        <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden' }}><img src={`/storage/${row.image}`} alt={row.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
      ) : <div style={{ width: '40px', height: '40px', backgroundColor: '#e5e7eb', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>No Img</div>
    },
    { key: 'title', label: 'Title / Name', render: (row: any) => row.title || row.name },
    { key: 'sku', label: 'SKU' },
    { key: 'unit', label: 'Unit' },
    { key: 'current_stock', label: 'Global Stock' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 className="text-2xl font-bold">Inventory Items</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen); setEditingId(null); setImageFile(null);
          setFormData({ title: '', name: '', sku: '', unit: '', min_stock_level: '', current_stock: '', cost_per_unit: '', image: '', locations: locations.map(l => ({ location_id: l.id, quantity: 0, is_active: true })) });
        }}>
          {isFormOpen ? 'Close Form' : '+ New Item'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Item' : 'New Item'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Title" name="title" value={formData.title} onChange={handleInputChange} required />
            <Input label="Name" name="name" value={formData.name} onChange={handleInputChange} />
            <Input label="SKU" name="sku" value={formData.sku} onChange={handleInputChange} required />
            <Input label="Unit (e.g. kg, L)" name="unit" value={formData.unit} onChange={handleInputChange} required />
            <Input label="Cost Per Unit" name="cost_per_unit" type="number" step="0.01" value={formData.cost_per_unit} onChange={handleInputChange} />
            <Input label="Min Stock Level" name="min_stock_level" type="number" step="0.01" value={formData.min_stock_level} onChange={handleInputChange} />
            
            <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>Image Upload</label>
              <input className={styles.input} type="file" accept="image/*" onChange={handleFileChange} />
              {formData.image && !imageFile && (
                <div style={{ marginTop: '10px' }}>
                  <img src={`/storage/${formData.image}`} alt="Current" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                </div>
              )}
            </div>

            <div className={styles.inputGroup} style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <label className={styles.label} style={{ marginBottom: '0.75rem', display: 'block', fontWeight: 600 }}>Location Stock & Availability</label>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flexDirection: 'column' }}>
                {locations.map(loc => {
                  const locData = formData.locations.find(l => l.location_id === loc.id) || { quantity: 0, is_active: false };
                  return (
                    <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f9fafb', padding: '0.5rem 1rem', borderRadius: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
                        <input type="checkbox" checked={locData.is_active} onChange={(e) => handleLocationChange(loc.id, 'is_active', e.target.checked)} className="checkbox checkbox-sm checkbox-primary" />
                        <span className="font-medium">{loc.name}</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label className="text-sm">Quantity:</label>
                        <input type="number" step="0.01" value={locData.quantity} onChange={(e) => handleLocationChange(loc.id, 'quantity', e.target.value)} className="input input-bordered input-sm w-32" disabled={!locData.is_active} />
                      </div>
                    </div>
                  );
                })}
              </div>
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
