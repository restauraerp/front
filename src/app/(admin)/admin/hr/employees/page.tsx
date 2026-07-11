'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from '@/components/ui/ui.module.css';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    location_id: '',
    role: ''
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, locationsRes] = await Promise.all([
        fetchApi(`/users?page=${page}`),
        fetchApi('/roles?nopaginate=true').catch(() => null),
        fetchApi('/locations?nopaginate=true').catch(() => null)
      ]);
      
      if (usersRes && usersRes.data && Array.isArray(usersRes.data)) {
         setEmployees(usersRes.data);
         setTotalPages(usersRes.last_page || 1);
      } else if (usersRes && usersRes.data && usersRes.data.data && Array.isArray(usersRes.data.data)) {
         setEmployees(usersRes.data.data);
         setTotalPages(usersRes.data.last_page || 1);
      } else {
         setEmployees(usersRes?.data || usersRes || []);
         setTotalPages(1);
      }
      
      const fetchedRoles = rolesRes?.data || rolesRes || [];
      if (Array.isArray(fetchedRoles)) {
        setRoles(fetchedRoles);
      } else if (fetchedRoles?.data && Array.isArray(fetchedRoles.data)) {
        setRoles(fetchedRoles.data);
      }

      const fetchedLocations = locationsRes?.data || locationsRes || [];
      if (Array.isArray(fetchedLocations)) {
        setLocations(fetchedLocations);
      } else if (fetchedLocations?.data && Array.isArray(fetchedLocations.data)) {
        setLocations(fetchedLocations.data);
      }
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
      const payload: any = { ...formData };
      if (!payload.password) delete payload.password; // Don't send empty password on edit
      
      if (editingId) {
        await fetchApi(`/users/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ name: '', email: '', password: '', location_id: '', role: '' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save employee');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      name: row.name || '',
      email: row.email || '',
      password: '',
      location_id: row.location_id || '',
      role: row.roles?.[0]?.name || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete ${row.name}?`)) {
      try {
        await fetchApi(`/users/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete employee');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (row: any) => row.roles?.length ? row.roles[0].name.replace('_', ' ').toUpperCase() : '-' },
    { key: 'location', label: 'Location', render: (row: any) => row.location ? row.location.name : '-' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>Employee Management</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
          setFormData({ name: '', email: '', password: '', location_id: '', role: '' });
        }}>
          {isFormOpen ? 'Close Form' : '+ New Employee'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Employee' : 'New Employee'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Name" name="name" value={formData.name} onChange={handleInputChange} required />
            <Input label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
            <Input 
              label="Password" 
              name="password" 
              type="password" 
              value={formData.password} 
              onChange={handleInputChange} 
              required={!editingId} 
              placeholder={editingId ? 'Leave blank to keep current' : ''}
            />
            
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Location</span></label>
              <select 
                className="select select-bordered w-full"
                name="location_id" 
                value={formData.location_id} 
                onChange={(e) => handleInputChange(e as any)}
              >
                <option value="">No Location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Role</span></label>
              <select 
                className="select select-bordered w-full"
                name="role" 
                value={formData.role} 
                onChange={(e) => handleInputChange(e as any)}
              >
                <option value="">No Role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.name}>{r.name.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update Employee' : 'Create Employee'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading employees...</p> : (
          <>
            <Table columns={columns} data={employees} onEdit={handleEdit} onDelete={handleDelete} />
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
