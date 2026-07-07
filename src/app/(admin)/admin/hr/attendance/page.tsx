'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    date: '',
    check_in: '',
    check_out: '',
    status: 'Present'
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/attendances');
      setAttendances(res.data || res || []);
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
      const payload = { ...formData };
      
      if (editingId) {
        await fetchApi(`/attendances/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/attendances', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ user_id: '', date: '', check_in: '', check_out: '', status: 'Present' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save attendance');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      user_id: row.user_id || '',
      date: row.date || '',
      check_in: row.check_in || '',
      check_out: row.check_out || '',
      status: row.status || 'Present'
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete attendance record?`)) {
      try {
        await fetchApi(`/attendances/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete attendance');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'user_id', label: 'User ID' },
    { key: 'date', label: 'Date' },
    { key: 'check_in', label: 'Check In' },
    { key: 'check_out', label: 'Check Out' },
    { key: 'status', label: 'Status' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Attendance Management</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
          setFormData({ user_id: '', date: '', check_in: '', check_out: '', status: 'Present' });
        }}>
          {isFormOpen ? 'Close Form' : '+ Add Record'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Record' : 'New Record'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="User ID" name="user_id" type="number" value={formData.user_id} onChange={handleInputChange} required />
            <Input label="Date" name="date" type="date" value={formData.date} onChange={handleInputChange} required />
            <Input label="Check In Time" name="check_in" type="time" value={formData.check_in} onChange={handleInputChange} />
            <Input label="Check Out Time" name="check_out" type="time" value={formData.check_out} onChange={handleInputChange} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Status</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange}
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
              </select>
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update Record' : 'Create Record'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading attendance...</p> : <Table columns={columns} data={attendances} onEdit={handleEdit} onDelete={handleDelete} />}
      </Card>
    </div>
  );
}
