'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    location_id: 1,
    table_id: '',
    date: '',
    time: '',
    guests: '2',
    status: 'Pending'
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/reservations');
      setReservations(res.data || res || []);
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
        customer_id: parseInt(formData.customer_id),
        location_id: parseInt(formData.location_id as any),
        table_id: formData.table_id ? parseInt(formData.table_id) : null,
        guests: parseInt(formData.guests)
      };
      
      if (editingId) {
        await fetchApi(`/reservations/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/reservations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ customer_id: '', location_id: 1, table_id: '', date: '', time: '', guests: '2', status: 'Pending' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save reservation');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      customer_id: row.customer_id || '',
      location_id: row.location_id || 1,
      table_id: row.table_id || '',
      date: row.date ? row.date.split('T')[0] : '',
      time: row.time || '',
      guests: row.guests?.toString() || '2',
      status: row.status || 'Pending'
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to cancel this reservation?`)) {
      try {
        await fetchApi(`/reservations/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to cancel reservation');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'customer_id', label: 'Customer ID' },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'guests', label: 'Guests' },
    { key: 'status', label: 'Status' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Reservations</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
        }}>
          {isFormOpen ? 'Close Form' : '+ New Reservation'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Reservation' : 'New Reservation'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Customer ID" name="customer_id" type="number" value={formData.customer_id} onChange={handleInputChange} required />
            <Input label="Location ID" name="location_id" type="number" value={formData.location_id} onChange={handleInputChange} required />
            <Input label="Table ID (Optional)" name="table_id" type="number" value={formData.table_id} onChange={handleInputChange} />
            <Input label="Date" name="date" type="date" value={formData.date} onChange={handleInputChange} required />
            <Input label="Time" name="time" type="time" value={formData.time} onChange={handleInputChange} required />
            <Input label="Number of Guests" name="guests" type="number" value={formData.guests} onChange={handleInputChange} required />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>Status</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} 
                name="status" value={formData.status} onChange={handleInputChange}
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Seated">Seated</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update Reservation' : 'Create Reservation'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading reservations...</p> : <Table columns={columns} data={reservations} onEdit={handleEdit} onDelete={handleDelete} />}
      </Card>
    </div>
  );
}
