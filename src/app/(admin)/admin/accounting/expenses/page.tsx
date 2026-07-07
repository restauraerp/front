'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    location_id: 1,
    category: '',
    amount: '',
    logged_by: 1
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/expenses');
      setExpenses(res.data || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        location_id: parseInt(formData.location_id as any),
        logged_by: parseInt(formData.logged_by as any)
      };

      if (editingId) {
        await fetchApi(`/expenses/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/expenses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ location_id: 1, category: '', amount: '', logged_by: 1 });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save expense');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      location_id: row.location_id || 1,
      category: row.category || '',
      amount: row.amount || '',
      logged_by: row.logged_by || 1
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete this expense?`)) {
      try {
        await fetchApi(`/expenses/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete expense');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount (৳)' },
    { key: 'location_id', label: 'Location ID' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Expenses Management</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
          setFormData({ location_id: 1, category: '', amount: '', logged_by: 1 });
        }}>
          {isFormOpen ? 'Close Form' : '+ Log Expense'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Expense' : 'Log New Expense'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Category (e.g. Utility, Maintenance)" name="category" value={formData.category} onChange={handleInputChange} required />
            <Input label="Amount" name="amount" type="number" step="0.01" value={formData.amount} onChange={handleInputChange} required />
            <Input label="Location ID" name="location_id" type="number" value={formData.location_id} onChange={handleInputChange} required />
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update Expense' : 'Save Expense'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading expenses...</p> : <Table columns={columns} data={expenses} onEdit={handleEdit} onDelete={handleDelete} />}
      </Card>
    </div>
  );
}
