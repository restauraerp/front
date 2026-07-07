'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    month: 'January',
    year: new Date().getFullYear().toString(),
    basic_salary: '0',
    bonus: '0',
    overtime_pay: '0',
    deductions: '0',
    status: 'Pending'
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/payrolls');
      setPayrolls(res.data || res || []);
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
      const net_pay = (
        parseFloat(formData.basic_salary) + 
        parseFloat(formData.bonus) + 
        parseFloat(formData.overtime_pay) - 
        parseFloat(formData.deductions)
      ).toFixed(2);

      const payload = { 
        ...formData,
        net_pay,
        year: parseInt(formData.year)
      };
      
      if (editingId) {
        await fetchApi(`/payrolls/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/payrolls', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({
        user_id: '', month: 'January', year: new Date().getFullYear().toString(),
        basic_salary: '0', bonus: '0', overtime_pay: '0', deductions: '0', status: 'Pending'
      });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save payroll');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      user_id: row.user_id || '',
      month: row.month || 'January',
      year: row.year ? row.year.toString() : new Date().getFullYear().toString(),
      basic_salary: row.basic_salary || '0',
      bonus: row.bonus || '0',
      overtime_pay: row.overtime_pay || '0',
      deductions: row.deductions || '0',
      status: row.status || 'Pending'
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete payroll?`)) {
      try {
        await fetchApi(`/payrolls/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete payroll');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'user_id', label: 'User ID' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'net_pay', label: 'Net Pay' },
    { key: 'status', label: 'Status' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Payroll Management</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
        }}>
          {isFormOpen ? 'Close Form' : '+ New Payroll'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Payroll' : 'New Payroll'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="User ID" name="user_id" type="number" value={formData.user_id} onChange={handleInputChange} required />
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Month</label>
                <select 
                  style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                  name="month" value={formData.month} onChange={handleInputChange}
                >
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Year" name="year" type="number" value={formData.year} onChange={handleInputChange} required />
              </div>
            </div>

            <Input label="Basic Salary" name="basic_salary" type="number" step="0.01" value={formData.basic_salary} onChange={handleInputChange} required />
            <Input label="Bonus" name="bonus" type="number" step="0.01" value={formData.bonus} onChange={handleInputChange} required />
            <Input label="Overtime Pay" name="overtime_pay" type="number" step="0.01" value={formData.overtime_pay} onChange={handleInputChange} required />
            <Input label="Deductions" name="deductions" type="number" step="0.01" value={formData.deductions} onChange={handleInputChange} required />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Status</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="status" value={formData.status} onChange={handleInputChange}
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update Payroll' : 'Create Payroll'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading payrolls...</p> : <Table columns={columns} data={payrolls} onEdit={handleEdit} onDelete={handleDelete} />}
      </Card>
    </div>
  );
}
