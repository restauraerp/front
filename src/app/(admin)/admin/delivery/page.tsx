'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    order_id: '',
    rider_id: '',
    address: '',
    delivery_charge: '0.00',
    status: 'Pending'
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/deliveries');
      setDeliveries(res.data || res || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData,
        order_id: parseInt(formData.order_id),
        rider_id: formData.rider_id ? parseInt(formData.rider_id) : null
      };
      
      if (editingId) {
        await fetchApi(`/deliveries/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/deliveries', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ order_id: '', rider_id: '', address: '', delivery_charge: '0.00', status: 'Pending' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save delivery assignment');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      order_id: row.order_id || '',
      rider_id: row.rider_id || '',
      address: row.address || '',
      delivery_charge: row.delivery_charge || '0.00',
      status: row.status || 'Pending'
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to cancel this delivery assignment?`)) {
      try {
        await fetchApi(`/deliveries/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete delivery');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'Delivery ID' },
    { key: 'order_id', label: 'Order ID' },
    { key: 'rider_id', label: 'Rider ID' },
    { key: 'status', label: 'Status' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Delivery & Riders</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
        }}>
          {isFormOpen ? 'Close Form' : '+ Assign Delivery'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Assignment' : 'Assign Delivery'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Order ID" name="order_id" type="number" value={formData.order_id} onChange={handleInputChange} required />
            <Input label="Rider ID (User ID)" name="rider_id" type="number" value={formData.rider_id} onChange={handleInputChange} />
            <Input label="Delivery Charge" name="delivery_charge" type="number" step="0.01" value={formData.delivery_charge} onChange={handleInputChange} required />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Status</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="status" value={formData.status} onChange={handleInputChange}
              >
                <option value="Pending">Pending</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>Delivery Address</label>
              <textarea 
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', minHeight: '80px' }}
                name="address" value={formData.address} onChange={handleInputChange} required
              />
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update Delivery' : 'Assign Delivery'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading deliveries...</p> : <Table columns={columns} data={deliveries} onEdit={handleEdit} onDelete={handleDelete} />}
      </Card>
    </div>
  );
}