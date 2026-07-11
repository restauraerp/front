'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{name: string, permissions: string[]}>({
    name: '',
    permissions: []
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        fetchApi(`/roles?page=${page}`),
        fetchApi('/permissions')
      ]);
      
      if (rolesRes && rolesRes.data && Array.isArray(rolesRes.data)) {
         setRoles(rolesRes.data);
         setTotalPages(rolesRes.last_page || 1);
      } else if (rolesRes && rolesRes.data && rolesRes.data.data && Array.isArray(rolesRes.data.data)) {
         setRoles(rolesRes.data.data);
         setTotalPages(rolesRes.data.last_page || 1);
      } else {
         setRoles(rolesRes?.data || rolesRes || []);
         setTotalPages(1);
      }
      
      setPermissions(permsRes?.data || permsRes || []);
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

  const handlePermissionToggle = (permName: string) => {
    setFormData(prev => {
      const perms = new Set(prev.permissions);
      if (perms.has(permName)) {
        perms.delete(permName);
      } else {
        perms.add(permName);
      }
      return { ...prev, permissions: Array.from(perms) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetchApi(`/roles/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/roles', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ name: '', permissions: [] });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save role');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setFormData({
      name: row.name || '',
      permissions: row.permissions ? row.permissions.map((p: any) => p.name) : []
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete ${row.name}?`)) {
      try {
        await fetchApi(`/roles/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete role');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Role Name', render: (row: any) => row.name.replace(/_/g, ' ').toUpperCase() },
    { 
      key: 'permissions', 
      label: 'Permissions', 
      render: (row: any) => (
        <div className="flex flex-wrap gap-1">
          {row.permissions?.map((p: any) => (
            <span key={p.id} className="badge badge-sm badge-outline rounded-full">{p.name.replace(/_/g, ' ')}</span>
          ))}
        </div>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 className="text-2xl font-bold">Roles & Permissions Management</h1>
        <Button onClick={() => {
          setIsFormOpen(!isFormOpen);
          setEditingId(null);
          setFormData({ name: '', permissions: [] });
        }}>
          {isFormOpen ? 'Close Form' : '+ New Role'}
        </Button>
      </div>

      {isFormOpen && (
        <Card title={editingId ? 'Edit Role' : 'New Role'} style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="max-w-md">
              <Input label="Role Name (e.g. branch_manager)" name="name" value={formData.name} onChange={handleInputChange} required />
            </div>

            <div>
              <label className="font-medium text-sm text-base-content/70 mb-2 block">Assign Permissions</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-base-200/50 p-4 rounded-xl border border-base-300">
                {permissions.map((p: any) => (
                  <label key={p.id} className="cursor-pointer label justify-start gap-3 p-2 hover:bg-base-100 rounded-lg transition-colors">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-sm checkbox-primary" 
                      checked={formData.permissions.includes(p.name)}
                      onChange={() => handlePermissionToggle(p.name)}
                    />
                    <span className="label-text capitalize">{p.name.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button type="submit" variant="primary">{editingId ? 'Update Role' : 'Create Role'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? <p>Loading roles...</p> : (
          <>
            <Table columns={columns} data={roles} onEdit={handleEdit} onDelete={handleDelete} />
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
