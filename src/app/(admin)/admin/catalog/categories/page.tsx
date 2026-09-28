'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Category = { id: number; name: string; parent_id: number | null; products_count?: number; sort_order?: number };

/**
 * Categories, in the order the restaurant wants them.
 *
 * The order is the one the POS tabs, the online order page and the storefront
 * menu use. Drag a row, or use the arrows; each move saves the whole list at
 * once (PUT /product-categories/reorder), so what is on screen is always what
 * is stored. The full list is loaded rather than a page of it - an order can
 * only be set on everything at once.
 */
export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetchApi('/product-categories?nopaginate=1');
      setCategories((res?.data ?? res ?? []) as Category[]);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load categories.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(loadCategories, 0);
    return () => clearTimeout(first);
  }, [loadCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await fetchApi(`/product-categories/${editingId}`, { method: 'PUT', body: JSON.stringify({ name }) });
      } else {
        await fetchApi('/product-categories', { method: 'POST', body: JSON.stringify({ name }) });
      }
      setName('');
      setEditingId(null);
      await loadCategories();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save category.'));
    }
  };

  const handleDelete = async (row: Category) => {
    if (!confirm(`Are you sure you want to delete ${row.name}?`)) return;
    setError(null);
    try {
      await fetchApi(`/product-categories/${row.id}`, { method: 'DELETE' });
      await loadCategories();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete category.'));
    }
  };

  /** Moves one category and saves the whole order; puts it back if the save fails. */
  const move = async (from: number, to: number) => {
    if (from === to || to < 0 || to >= categories.length || savingOrder) return;

    const previous = categories;
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    setCategories(next);
    setSavingOrder(true);
    setError(null);
    try {
      await fetchApi('/product-categories/reorder', {
        method: 'PUT',
        body: JSON.stringify({ ids: next.map((c) => c.id) }),
      });
    } catch (err) {
      setCategories(previous);
      setError(apiErrorMessage(err, 'Could not save the new order.'));
      await loadCategories();
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Categories Management</h1>

      {error && <div role="alert" className="alert alert-error mb-4 text-sm"><span>{error}</span></div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 items-start">
        <Card title={editingId ? 'Edit Category' : 'New Category'}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Category Name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
            />
            {!editingId && <p className="text-xs text-base-content/60 -mt-2">New categories are added at the end of the order.</p>}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" variant="primary">{editingId ? 'Update' : 'Create'}</Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setName(''); }}>Cancel</Button>
              )}
            </div>
          </form>
        </Card>

        <Card title="Category order">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-sm text-base-content/60">
              Drag to reorder, or use the arrows. This is the order the POS, the online order page and your website menu show.
            </p>
            {savingOrder && <span className="loading loading-spinner loading-sm text-primary shrink-0" aria-label="Saving order" />}
          </div>

          {loading ? (
            <div className="flex justify-center py-4"><span className="loading loading-spinner text-primary"></span></div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-base-content/60 py-6 text-center">No categories yet. Create one on the left.</p>
          ) : (
            <ol className="divide-y divide-base-200 rounded-lg border border-base-200">
              {categories.map((cat, index) => (
                <li
                  key={cat.id}
                  draggable={!savingOrder}
                  onDragStart={(e) => { setDragIndex(index); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => { e.preventDefault(); setOverIndex(index); }}
                  onDragLeave={() => setOverIndex((i) => (i === index ? null : i))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null) move(dragIndex, index);
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                  className={`flex items-center gap-3 px-3 py-2 bg-base-100 ${dragIndex === index ? 'opacity-40' : ''} ${overIndex === index && dragIndex !== index ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  <GripVertical size={16} className="text-base-content/40 cursor-grab shrink-0" aria-hidden />
                  <span className="w-7 text-center text-sm font-semibold text-base-content/60 shrink-0">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{cat.name}</div>
                    <div className="text-xs text-base-content/50">{cat.products_count ?? 0} active products</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" className="btn btn-xs btn-ghost btn-square" disabled={index === 0 || savingOrder}
                            onClick={() => move(index, index - 1)} aria-label={`Move ${cat.name} up`}><ArrowUp size={14} /></button>
                    <button type="button" className="btn btn-xs btn-ghost btn-square" disabled={index === categories.length - 1 || savingOrder}
                            onClick={() => move(index, index + 1)} aria-label={`Move ${cat.name} down`}><ArrowDown size={14} /></button>
                    <button type="button" className="btn btn-xs btn-ghost btn-square" onClick={() => { setEditingId(cat.id); setName(cat.name); }}
                            aria-label={`Edit ${cat.name}`}><Pencil size={14} /></button>
                    <button type="button" className="btn btn-xs btn-ghost btn-square text-error" onClick={() => handleDelete(cat)}
                            aria-label={`Delete ${cat.name}`}><Trash2 size={14} /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
