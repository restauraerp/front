'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus, X, Search } from 'lucide-react';

interface CrudField {
  key: string;
  label: string;
  type?: string;
  step?: string;
  options?: { value: string; label: string }[];
  textarea?: boolean;
  colSpan?: boolean;
}

interface CrudPageProps {
  title: string;
  subtitle?: string;
  endpoint: string;
  tableColumns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  formFields: CrudField[];
  defaultValues: Record<string, any>;
  addLabel?: string;
  initialFormOpen?: boolean;
}

export function CrudPage({ title, subtitle, endpoint, tableColumns, formFields, defaultValues, addLabel = '+ Add New', initialFormOpen = false }: CrudPageProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...defaultValues });
  const [isFormOpen, setIsFormOpen] = useState(initialFormOpen);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== searchInput) {
        setSearchQuery(searchInput);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { loadData(); }, [page, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams();
      urlParams.append('page', page.toString());
      if (searchQuery.trim()) {
        urlParams.append('search', searchQuery.trim());
      }
      
      const separator = endpoint.includes('?') ? '&' : '?';
      const res = await fetchApi(`${endpoint}${separator}${urlParams.toString()}`);
      
      // Handle Laravel pagination wrapper if present
      if (res && res.data && Array.isArray(res.data)) {
         setData(res.data);
         setTotalPages(res.last_page || 1);
      } else if (res && res.data && res.data.data && Array.isArray(res.data.data)) {
         setData(res.data.data);
         setTotalPages(res.data.last_page || 1);
      } else {
         setData(res.data || res || []);
         setTotalPages(1);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetchApi(`${endpoint}/${editingId}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await fetchApi(endpoint, { method: 'POST', body: JSON.stringify(formData) });
      }
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ ...defaultValues });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save record. Check your inputs and try again.');
    }
  };

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    const populated: Record<string, any> = {};
    for (const key of Object.keys(defaultValues)) {
      populated[key] = row[key] ?? defaultValues[key];
    }
    setFormData(populated);
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (confirm(`Delete record #${row.id}?`)) {
      try {
        await fetchApi(`${endpoint}/${row.id}`, { method: 'DELETE' });
        loadData();
      } catch { alert('Failed to delete record.'); }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        className=""
        actions={
          <>
            <div className="relative flex items-center w-full sm:w-64">
              <Search size={16} className="absolute left-3 text-base-content/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input input-bordered input-sm w-full pl-9"
              />
            </div>

            <Button
              onClick={() => {
                setIsFormOpen(!isFormOpen);
                setEditingId(null);
                setFormData({ ...defaultValues });
              }}
              variant={isFormOpen ? 'ghost' : 'neutral'}
              className={
                isFormOpen
                  ? 'gap-2 border border-base-300 text-base-content/70 hover:text-error hover:border-error/30 hover:bg-error/5'
                  : 'gap-2 shadow-sm'
              }
            >
              {isFormOpen ? <><X size={14} /> Close</> : <><Plus size={14} /> {addLabel}</>}
            </Button>
          </>
        }
      />

      {isFormOpen && (
        <Card title={editingId ? `Edit Record` : addLabel}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formFields.map(field => (
                <div key={field.key} className={field.colSpan ? 'sm:col-span-2' : ''}>
                  {field.options ? (
                    <div className="form-control w-full">
                      <label className="label"><span className="label-text font-medium">{field.label}</span></label>
                      <select
                        className="select select-bordered w-full"
                        name={field.key}
                        value={formData[field.key]}
                        onChange={handleChange}
                      >
                        {field.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : field.textarea ? (
                    <div className="form-control w-full">
                      <label className="label"><span className="label-text font-medium">{field.label}</span></label>
                      <textarea
                        className="textarea textarea-bordered w-full"
                        name={field.key}
                        value={formData[field.key]}
                        onChange={handleChange}
                        rows={3}
                      />
                    </div>
                  ) : (
                    <Input
                      label={field.label}
                      name={field.key}
                      type={field.type || 'text'}
                      step={field.step}
                      value={formData[field.key]}
                      onChange={handleChange}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="submit" variant="primary">{editingId ? 'Update' : 'Create'}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading
          ? <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary" /></div>
          : (
            <>
              <Table columns={tableColumns} data={data} onEdit={handleEdit} onDelete={handleDelete} />
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
          )
        }
      </Card>
    </div>
  );
}
