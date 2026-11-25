'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { fetchApi, ApiError, apiErrorMessage } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus, X, Search, RotateCcw } from 'lucide-react';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { useDialogs } from '@/components/ui/Dialogs';

interface CrudField {
  key: string;
  label: string;
  type?: string;
  step?: string;
  options?: { value: string; label: string }[];
  textarea?: boolean;
  colSpan?: boolean;
}

/**
 * A row as the API returned it. Loose in its values - every list has different
 * ones - but an `id` is guaranteed, because that is what edit, delete and row
 * navigation all address a record by.
 */
export interface CrudRow {
  id: number;
  [column: string]: unknown;
}

/** What the API said about the page it just returned. */
interface PageMeta {
  from: number | null;
  to: number | null;
  total: number;
  /** The unfiltered size of the collection, when the endpoint reports one. */
  overall?: number;
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
  /**
   * Extra query parameters - sorting, filters - merged into every request and
   * reset to page 1 when they change. Kept as a plain object so a caller can
   * hold them in its own state without this component knowing what they mean.
   */
  extraParams?: Record<string, string>;
  /** Controls rendered beside the search box, e.g. a sort picker or Export. */
  toolbar?: React.ReactNode;
  /**
   * Where a row click goes. Rows stay unclickable when this is absent, so no
   * existing list starts swallowing clicks meant for its Edit button.
   */
  onRowClick?: (row: CrudRow) => void;
  /** Names the thing being counted in "Showing 1-15 of 213 customers". */
  countLabel?: string;
  /** Whether to show a Trashed tab with soft-delete restore capabilities. */
  enableTrash?: boolean;
  /** Explicit endpoint for trashed items. Defaults to `${endpoint}-trashed`. */
  trashedEndpoint?: string;
}

export function CrudPage({
  title,
  subtitle,
  endpoint,
  tableColumns,
  formFields,
  defaultValues,
  addLabel = '+ Add New',
  initialFormOpen = false,
  extraParams,
  toolbar,
  onRowClick,
  countLabel,
  enableTrash = false,
  trashedEndpoint,
}: CrudPageProps) {
  const { confirm, alert, dialog } = useDialogs();
  const [activeTab, setActiveTab] = useState<'active' | 'trashed'>('active');

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [trashedData, setTrashedData] = useState<any[]>([]);
  const [trashedLoading, setTrashedLoading] = useState(false);
  const [trashedPage, setTrashedPage] = useState(1);
  const [trashedTotalPages, setTrashedTotalPages] = useState(1);
  const [trashedTotal, setTrashedTotal] = useState(0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...defaultValues });
  const [isFormOpen, setIsFormOpen] = useState(initialFormOpen);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [meta, setMeta] = useState<PageMeta | null>(null);
  // Field-level messages from a refused save, keyed as Laravel returns them.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const effectiveTrashedEndpoint = trashedEndpoint ?? `${endpoint}-trashed`;

  // Serialised, because a caller building this object inline hands us a new
  // reference on every render - and an object in a dependency array compares
  // by reference, so the effect below would refetch forever.
  const paramsKey = JSON.stringify(extraParams ?? {});

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== searchInput) {
        setSearchQuery(searchInput);
        setPage(1);
        setTrashedPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Back to page 1 whenever the filters change: page 7 of the old result set
  // is rarely a page of the new one, and is sometimes past its end.
  useEffect(() => {
    setPage(1);
    setTrashedPage(1);
  }, [paramsKey]);

  useEffect(() => {
    loadData();
  }, [page, searchQuery, paramsKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams();
      urlParams.append('page', page.toString());
      if (searchQuery.trim()) {
        urlParams.append('search', searchQuery.trim());
      }
      for (const [key, value] of Object.entries(extraParams ?? {})) {
        if (value) urlParams.append(key, value);
      }

      const separator = endpoint.includes('?') ? '&' : '?';
      const res = await fetchApi(`${endpoint}${separator}${urlParams.toString()}`);

      // Handle Laravel pagination wrapper if present
      if (res && res.data && Array.isArray(res.data)) {
        setData(res.data);
        setTotalPages(res.last_page || 1);
        setMeta({ from: res.from ?? null, to: res.to ?? null, total: res.total ?? res.data.length, overall: res.total_customers });
      } else if (res && res.data && res.data.data && Array.isArray(res.data.data)) {
        setData(res.data.data);
        setTotalPages(res.data.last_page || 1);
        setMeta({ from: res.data.from ?? null, to: res.data.to ?? null, total: res.data.total ?? res.data.data.length });
      } else {
        setData(res.data || res || []);
        setTotalPages(1);
        setMeta(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrashedData = useCallback(async () => {
    if (!enableTrash) return;
    try {
      setTrashedLoading(true);
      const urlParams = new URLSearchParams();
      urlParams.append('page', trashedPage.toString());
      if (searchQuery.trim()) {
        urlParams.append('search', searchQuery.trim());
      }
      for (const [key, value] of Object.entries(extraParams ?? {})) {
        if (value) urlParams.append(key, value);
      }
      const separator = effectiveTrashedEndpoint.includes('?') ? '&' : '?';
      const res = await fetchApi(`${effectiveTrashedEndpoint}${separator}${urlParams.toString()}`);

      if (res && res.data && Array.isArray(res.data)) {
        setTrashedData(res.data);
        setTrashedTotalPages(res.last_page || 1);
        setTrashedTotal(res.total ?? res.data.length);
      } else if (res && res.data && res.data.data && Array.isArray(res.data.data)) {
        setTrashedData(res.data.data);
        setTrashedTotalPages(res.data.last_page || 1);
        setTrashedTotal(res.data.total ?? res.data.data.length);
      } else {
        setTrashedData(res.data || res || []);
        setTrashedTotalPages(1);
        setTrashedTotal(Array.isArray(res) ? res.length : 0);
      }
    } catch (err) {
      console.error('Failed to load trashed records', err);
    } finally {
      setTrashedLoading(false);
    }
  }, [enableTrash, effectiveTrashedEndpoint, trashedPage, searchQuery, paramsKey]);

  useEffect(() => {
    if (enableTrash && activeTab === 'trashed') {
      loadTrashedData();
    }
  }, [enableTrash, activeTab, loadTrashedData]);

  // Initial count of trashed records
  useEffect(() => {
    if (enableTrash) {
      loadTrashedData();
    }
  }, [enableTrash]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

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
      if (err instanceof ApiError && err.status === 422 && err.body?.errors) {
        setFieldErrors(err.body.errors);
        setFormError(null);
      } else {
        console.error(err);
        setFormError(apiErrorMessage(err, 'Could not save this record. Please try again.'));
      }
    }
  };

  const handleEdit = (row: any) => {
    setFieldErrors({});
    setFormError(null);
    setEditingId(row.id);
    const populated: Record<string, any> = {};
    for (const key of Object.keys(defaultValues)) {
      const value = row[key] ?? defaultValues[key];
      populated[key] = typeof value === 'boolean' ? (value ? '1' : '0') : value;
    }
    setFormData(populated);
    setIsFormOpen(true);
  };

  const handleDelete = async (row: any) => {
    const ok = await confirm({
      title: enableTrash ? 'Move to Trash?' : 'Delete Record?',
      message: enableTrash
        ? `Move record #${row.id} to trash? You can restore it later from the Trashed tab.`
        : `Are you sure you want to delete record #${row.id}?`,
      action: enableTrash ? 'Trash' : 'Delete',
      tone: 'btn-error',
    });
    if (!ok) return;

    try {
      await fetchApi(`${endpoint}/${row.id}`, { method: 'DELETE' });
      loadData();
      if (enableTrash) {
        loadTrashedData();
      }
    } catch (err) {
      console.error(err);
      await alert({
        title: 'Action Failed',
        message: apiErrorMessage(err, 'Failed to delete record.'),
        tone: 'btn-error',
      });
    }
  };

  const handleRestore = async (row: any) => {
    const ok = await confirm({
      title: 'Restore Record?',
      message: `Are you sure you want to restore record #${row.id} from trash?`,
      action: 'Restore',
      tone: 'btn-success',
    });
    if (!ok) return;

    try {
      await fetchApi(`${effectiveTrashedEndpoint}/${row.id}/restore`, { method: 'POST' });
      loadTrashedData();
      loadData();
    } catch (err) {
      console.error(err);
      await alert({
        title: 'Restore Failed',
        message: apiErrorMessage(err, 'Failed to restore record.'),
        tone: 'btn-error',
      });
    }
  };

  const trashedColumns = [
    ...tableColumns,
    {
      key: 'trashed_by',
      label: 'Trashed By',
      render: (row: any) => row.trashed_by_user?.name || row.trashed_by || '—',
    },
    {
      key: 'deleted_at',
      label: 'Deleted At',
      render: (row: any) => (row.deleted_at ? new Date(row.deleted_at).toLocaleString() : '—'),
    },
  ];

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

            {toolbar}

            {activeTab === 'active' && (
              <Button
                data-tour="crud-add"
                onClick={() => {
                  setIsFormOpen(!isFormOpen);
                  setEditingId(null);
                  setFormData({ ...defaultValues });
                  setFieldErrors({});
                  setFormError(null);
                }}
                variant={isFormOpen ? 'ghost' : 'neutral'}
                className={
                  isFormOpen
                    ? 'gap-2 border border-base-300 text-base-content/70 hover:text-error hover:border-error/30 hover:bg-error/5'
                    : 'gap-2 shadow-sm'
                }
              >
                {isFormOpen ? (
                  <>
                    <X size={14} /> Close
                  </>
                ) : (
                  <>
                    <Plus size={14} /> {addLabel}
                  </>
                )}
              </Button>
            )}
          </>
        }
      />

      {enableTrash && (
        <div className="tabs tabs-bordered mb-2">
          <button
            type="button"
            className={`tab font-semibold ${activeTab === 'active' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Records
          </button>
          <button
            type="button"
            className={`tab font-semibold ${activeTab === 'trashed' ? 'tab-active' : ''}`}
            onClick={() => {
              setActiveTab('trashed');
              setTrashedPage(1);
            }}
          >
            Trashed
            {trashedTotal > 0 && <span className="badge badge-sm badge-neutral ml-2">{trashedTotal}</span>}
          </button>
        </div>
      )}

      {activeTab === 'active' && isFormOpen && (
        <Card tour="crud-form" title={editingId ? `Edit Record` : addLabel}>
          <form onSubmit={handleSubmit}>
            {formError && (
              <div role="alert" className="alert alert-error mb-4 text-sm">
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formFields.map((field) => (
                <div key={field.key} className={field.colSpan ? 'sm:col-span-2' : ''}>
                  {field.options ? (
                    <SearchSelect
                      label={field.label}
                      value={formData[field.key]}
                      onChange={(v) => setFormData((prev) => ({ ...prev, [field.key]: String(v) }))}
                      options={field.options.map((opt) => ({ value: opt.value, label: opt.label }))}
                      placeholder={`Select ${field.label.toLowerCase()}`}
                      searchPlaceholder={`Search…`}
                    />
                  ) : field.textarea ? (
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">{field.label}</span>
                      </label>
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
                      className={fieldErrors[field.key] ? 'input-error' : ''}
                      aria-invalid={fieldErrors[field.key] ? true : undefined}
                    />
                  )}

                  {fieldErrors[field.key] && (
                    <p className="text-error text-sm mt-1">{fieldErrors[field.key].join(' ')}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="submit" variant="primary">
                {editingId ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {activeTab === 'active' ? (
          loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : (
            <>
              <Table
                columns={tableColumns}
                data={data}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRowClick={onRowClick}
              />
              {meta && meta.total > 0 && (
                <div className="mt-4 text-sm text-base-content/60">
                  Showing {meta.from}-{meta.to} of {meta.total}
                  {countLabel ? ` ${countLabel}` : ''}
                  {meta.overall !== undefined &&
                    meta.overall !== meta.total &&
                    ` (filtered from ${meta.overall})`}
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6 pb-2">
                  <div className="join">
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      «
                    </button>
                    <button className="join-item btn btn-sm bg-base-100 cursor-default">
                      Page {page} of {totalPages}
                    </button>
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        ) : trashedLoading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : (
          <>
            <Table
              columns={trashedColumns}
              data={trashedData}
              extraActions={(row: any) => (
                <button
                  type="button"
                  onClick={() => handleRestore(row)}
                  className="btn btn-xs btn-outline btn-success gap-1"
                  title="Restore record"
                >
                  <RotateCcw size={12} /> Restore
                </button>
              )}
            />
            {trashedTotal > 0 && (
              <div className="mt-4 text-sm text-base-content/60">
                Total {trashedTotal} trashed {countLabel ? countLabel : 'records'}
              </div>
            )}
            {trashedTotalPages > 1 && (
              <div className="flex justify-center mt-6 pb-2">
                <div className="join">
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => setTrashedPage((p) => Math.max(1, p - 1))}
                    disabled={trashedPage === 1}
                  >
                    «
                  </button>
                  <button className="join-item btn btn-sm bg-base-100 cursor-default">
                    Page {trashedPage} of {trashedTotalPages}
                  </button>
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => setTrashedPage((p) => Math.min(trashedTotalPages, p + 1))}
                    disabled={trashedPage === trashedTotalPages}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      {dialog}
    </div>
  );
}
