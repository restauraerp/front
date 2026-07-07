'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function WasteLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    inventory_item_id: '',
    quantity: '',
    reason: '',
    logged_by: 1
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/waste-logs');
      setLogs(res.data || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData,
        inventory_item_id: parseInt(formData.inventory_item_id),
        logged_by: parseInt(formData.logged_by as any)
      };
      
      if (editingId) {
        await fetchApi(`/waste-logs/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/waste-logs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ inventory_item_id: '', quantity: '', reason: '', logged_by: 1 });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to log waste');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      inventory_item_id: row.inventory_item_id || '',
      quantity: row.quantity || '',
      reason: row.reason || '',
      logged_by: row.logged_by || 1
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete this waste log?`)) {
      try {
        await fetchApi(`/waste-logs/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete log');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'inventory_item_id', label: 'Item ID' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'reason', label: 'Reason' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Waste Management</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
        }}>
          {isFormOpen ? 'Close Form' : '+ Log Waste'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Log' : 'Log Spoilage / Waste'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Inventory Item ID" name="inventory_item_id" type="number" value={formData.inventory_item_id} onChange={handleInputChange} required />
            <Input label="Quantity Spoiled" name="quantity" type="number" step="0.01" value={formData.quantity} onChange={handleInputChange} required />
            
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>Reason</label>
              <textarea 
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', minHeight: '80px' }}
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                required
                placeholder="E.g. Expired, spilled, burned..."
              />
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update Log' : 'Save Log'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading logs...</p> : <Table columns={columns} data={logs} onEdit={handleEdit} onDelete={handleDelete} />}
      </Card>
    </div>
  );
}
