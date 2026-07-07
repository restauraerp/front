'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadCategories();
  }, [page]);

  const loadCategories = async () => {
    try {
      const res = await fetchApi(`/product-categories?page=${page}`);
      if (res && res.data && Array.isArray(res.data)) {
         setCategories(res.data);
         setTotalPages(res.last_page || 1);
      } else if (res && res.data && res.data.data && Array.isArray(res.data.data)) {
         setCategories(res.data.data);
         setTotalPages(res.data.last_page || 1);
      } else {
         setCategories(res.data || res || []);
         setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetchApi(`/product-categories/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
      } else {
        await fetchApi('/product-categories', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
      }
      setName('');
      setEditingId(null);
      loadCategories();
    } catch (err) {
      console.error(err);
      alert('Failed to save category');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setName(row.name);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete ${row.name}?`)) {
      try {
        await fetchApi(`/product-categories/${row.id}`, { method: 'DELETE' });
        loadCategories();
      } catch (err) {
        console.error(err);
        alert('Failed to delete category');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'parent_id', label: 'Parent ID' },
    { key: 'products_count', label: 'Active Products' }
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Categories Management</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <Card title={editingId ? 'Edit Category' : 'New Category'}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input 
              label="Category Name" 
              value={name} 
              onChange={(e: any) => setName(e.target.value)} 
              required 
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update' : 'Create'}</Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setName(''); }}>Cancel</Button>
              )}
            </div>
          </form>
        </Card>

        <Card title="All Categories">
          {loading ? (
            <div className="flex justify-center py-4"><span className="loading loading-spinner text-primary"></span></div>
          ) : (
            <>
              <Table columns={columns} data={categories} onEdit={handleEdit} onDelete={handleDelete} />
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
    </div>
  );
}
