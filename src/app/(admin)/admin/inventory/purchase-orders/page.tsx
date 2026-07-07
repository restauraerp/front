'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    location_id: 1,
    total_amount: '',
    status: 'Pending'
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/purchase-orders');
      setOrders(res.data || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData,
        supplier_id: parseInt(formData.supplier_id),
        location_id: parseInt(formData.location_id as any),
        created_by: 1
      };
      
      if (editingId) {
        await fetchApi(`/purchase-orders/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/purchase-orders', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ supplier_id: '', location_id: 1, total_amount: '', status: 'Pending' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save purchase order');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      supplier_id: row.supplier_id || '',
      location_id: row.location_id || 1,
      total_amount: row.total_amount || '',
      status: row.status || 'Pending'
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to cancel this purchase order?`)) {
      try {
        await fetchApi(`/purchase-orders/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to cancel PO');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'PO #' },
    { key: 'supplier_id', label: 'Supplier ID' },
    { key: 'total_amount', label: 'Total Amount' },
    { key: 'status', label: 'Status' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Purchase Orders</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
        }}>
          {isFormOpen ? 'Close Form' : '+ Create PO'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit PO' : 'Create Purchase Order'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Supplier ID" name="supplier_id" type="number" value={formData.supplier_id} onChange={handleInputChange} required />
            <Input label="Location ID" name="location_id" type="number" value={formData.location_id} onChange={handleInputChange} required />
            <Input label="Total Amount" name="total_amount" type="number" step="0.01" value={formData.total_amount} onChange={handleInputChange} required />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Status</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="status" value={formData.status} onChange={handleInputChange}
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Received">Received</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update PO' : 'Create PO'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading POs...</p> : <Table columns={columns} data={orders} onEdit={handleEdit} onDelete={handleDelete} />}
      </Card>
    </div>
  );
}
