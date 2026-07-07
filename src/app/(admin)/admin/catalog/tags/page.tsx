'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const res = await fetchApi('/tags');
      setTags(res.data || res || []);
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
        await fetchApi(`/tags/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
      } else {
        await fetchApi('/tags', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
      }
      setName('');
      setEditingId(null);
      loadTags();
    } catch (err) {
      console.error(err);
      alert('Failed to save tag');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setName(row.name);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Are you sure you want to delete ${row.name}?`)) {
      try {
        await fetchApi(`/tags/${row.id}`, { method: 'DELETE' });
        loadTags();
      } catch (err) {
        console.error(err);
        alert('Failed to delete tag');
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'products_count', label: 'Active Products' }
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Tags Management</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <Card title={editingId ? 'Edit Tag' : 'New Tag'}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input 
              label="Tag Name" 
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

        <Card title="All Tags">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table columns={columns} data={tags} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </Card>
      </div>
    </div>
  );
}
