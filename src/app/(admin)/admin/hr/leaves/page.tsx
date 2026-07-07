'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    status: 'Pending'
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/leaves');
      setLeaves(res.data || res || []);
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
      const payload = { ...formData };
      
      if (editingId) {
        await fetchApi(`/leaves/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/leaves', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ user_id: '', start_date: '', end_date: '', reason: '', status: 'Pending' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save leave request');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      user_id: row.user_id || '',
      start_date: row.start_date ? row.start_date.split('T')[0] : '',
      end_date: row.end_date ? row.end_date.split('T')[0] : '',
      reason: row.reason || '',
      status: row.status || 'Pending'
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete this leave request?`)) {
      try {
        await fetchApi(`/leaves/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete leave request');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'user_id', label: 'User ID' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'status', label: 'Status' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Leaves Management</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
          setFormData({ user_id: '', start_date: '', end_date: '', reason: '', status: 'Pending' });
        }}>
          {isFormOpen ? 'Close Form' : '+ New Request'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Leave' : 'New Leave Request'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="User ID" name="user_id" type="number" value={formData.user_id} onChange={handleInputChange} required />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Status</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange}
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <Input label="Start Date" name="start_date" type="date" value={formData.start_date} onChange={handleInputChange} required />
            <Input label="End Date" name="end_date" type="date" value={formData.end_date} onChange={handleInputChange} required />
            
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>Reason</label>
              <textarea 
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', minHeight: '80px' }}
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update Leave' : 'Submit Leave'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading leaves...</p> : <Table columns={columns} data={leaves} onEdit={handleEdit} onDelete={handleDelete} />}
      </Card>
    </div>
  );
}
