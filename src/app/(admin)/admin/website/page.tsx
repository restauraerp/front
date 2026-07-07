'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import {
  Globe, Share2, FileText, Star, Settings2, CheckCircle, XCircle, Plus, Pencil, Trash2, X, Save
} from 'lucide-react';

const TABS = [
  { id: 'settings', label: 'Brand Settings', icon: Settings2 },
  { id: 'social', label: 'Social Links', icon: Share2 },
  { id: 'pages', label: 'CMS Pages', icon: FileText },
  { id: 'reviews', label: 'Google Reviews', icon: Star },
];

/* ─── Website Settings ─── */
function SettingsTab() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ key: '', value: '', type: 'string' });
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try { setSettings((await fetchApi('/website-settings'))?.data || await fetchApi('/website-settings') || []); }
    catch { } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      editing ? await fetchApi(`/website-settings/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) })
               : await fetchApi('/website-settings', { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false); setEditing(null); setForm({ key: '', value: '', type: 'string' }); load();
    } catch { alert('Failed to save setting'); }
  };

  const del = async (id: number) => {
    if (confirm('Delete this setting?')) { await fetchApi(`/website-settings/${id}`, { method: 'DELETE' }); load(); }
  };

  const startEdit = (row: any) => {
    setEditing(row); setForm({ key: row.key, value: row.value || '', type: row.type || 'string' }); setShowForm(true);
  };

  const PRESET_KEYS = ['site_name','tagline','logo_url','favicon_url','primary_color','contact_email','contact_phone','address','google_maps_embed'];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-base-content/50">Manage global brand and contact settings shown across the website.</p>
        <button className="btn btn-primary btn-sm gap-2" onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ key: '', value: '', type: 'string' }); }}>
          {showForm ? <><X size={14}/> Close</> : <><Plus size={14}/> New Setting</>}
        </button>
      </div>

      {showForm && (
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-5">
            <h3 className="font-semibold mb-3">{editing ? 'Edit Setting' : 'New Setting'}</h3>
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="form-control">
                <label className="label text-xs font-medium">Key</label>
                {editing ? (
                  <input className="input input-bordered input-sm" value={form.key} onChange={e => setForm(p => ({...p, key: e.target.value}))} required />
                ) : (
                  <select className="select select-bordered select-sm" value={form.key} onChange={e => setForm(p => ({...p, key: e.target.value}))}>
                    <option value="">— pick or type —</option>
                    {PRESET_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                )}
              </div>
              <div className="form-control">
                <label className="label text-xs font-medium">Value</label>
                <input className="input input-bordered input-sm" value={form.value} onChange={e => setForm(p => ({...p, value: e.target.value}))} required />
              </div>
              <div className="form-control">
                <label className="label text-xs font-medium">Type</label>
                <select className="select select-bordered select-sm" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                  <option value="string">String</option>
                  <option value="json">JSON</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
              <div className="sm:col-span-3 flex gap-2 mt-1">
                <button type="submit" className="btn btn-primary btn-sm gap-1"><Save size={13}/> Save</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-zebra table-sm w-full">
          <thead><tr><th>Key</th><th>Value</th><th>Type</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="text-center py-8"><span className="loading loading-spinner"/></td></tr>
            : settings.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-base-content/40">No settings found. Add your first one above.</td></tr>
            : settings.map(s => (
              <tr key={s.id} className="hover">
                <td className="font-mono text-xs text-primary font-medium">{s.key}</td>
                <td className="text-sm max-w-xs truncate">{s.value}</td>
                <td><span className="badge badge-ghost badge-xs">{s.type}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-xs btn-square tooltip" data-tip="Edit" onClick={() => startEdit(s)}><Pencil size={12}/></button>
                    <button className="btn btn-ghost btn-xs btn-square text-error tooltip" data-tip="Delete" onClick={() => del(s.id)}><Trash2 size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Social Links ─── */
function SocialTab() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ platform: 'facebook', url: '', is_active: '1' });
  const [showForm, setShowForm] = useState(false);

  const PLATFORMS = ['facebook','instagram','twitter','youtube','tiktok','linkedin','whatsapp','telegram'];

  const load = async () => {
    try { setLinks((await fetchApi('/social-links'))?.data || await fetchApi('/social-links') || []); }
    catch { } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      editing ? await fetchApi(`/social-links/${editing.id}`, { method: 'PUT', body: JSON.stringify({...form, is_active: parseInt(form.is_active)}) })
               : await fetchApi('/social-links', { method: 'POST', body: JSON.stringify({...form, is_active: parseInt(form.is_active)}) });
      setShowForm(false); setEditing(null); setForm({ platform: 'facebook', url: '', is_active: '1' }); load();
    } catch { alert('Failed to save social link'); }
  };

  const del = async (id: number) => { if (confirm('Delete?')) { await fetchApi(`/social-links/${id}`, { method: 'DELETE' }); load(); } };

  const startEdit = (row: any) => {
    setEditing(row); setForm({ platform: row.platform || 'facebook', url: row.url || '', is_active: row.is_active ? '1' : '0' }); setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-base-content/50">Configure social media profile links shown in the website footer and contact page.</p>
        <button className="btn btn-primary btn-sm gap-2" onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ platform: 'facebook', url: '', is_active: '1' }); }}>
          {showForm ? <><X size={14}/> Close</> : <><Plus size={14}/> Add Link</>}
        </button>
      </div>

      {showForm && (
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-5">
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="form-control">
                <label className="label text-xs font-medium">Platform</label>
                <select className="select select-bordered select-sm" value={form.platform} onChange={e => setForm(p => ({...p, platform: e.target.value}))}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label text-xs font-medium">URL</label>
                <input type="url" className="input input-bordered input-sm" placeholder="https://..." value={form.url} onChange={e => setForm(p => ({...p, url: e.target.value}))} required/>
              </div>
              <div className="form-control">
                <label className="label text-xs font-medium">Status</label>
                <select className="select select-bordered select-sm" value={form.is_active} onChange={e => setForm(p => ({...p, is_active: e.target.value}))}>
                  <option value="1">Active</option><option value="0">Hidden</option>
                </select>
              </div>
              <div className="sm:col-span-3 flex gap-2 mt-1">
                <button type="submit" className="btn btn-primary btn-sm gap-1"><Save size={13}/> Save</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? <div className="col-span-3 flex justify-center py-8"><span className="loading loading-spinner"/></div>
        : links.length === 0 ? <div className="col-span-3 text-center py-8 text-base-content/40">No social links yet.</div>
        : links.map(l => (
          <div key={l.id} className="card bg-base-100 border border-base-200 p-4 flex-row items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold capitalize">{l.platform}</p>
              <a href={l.url} target="_blank" className="text-xs text-primary truncate block hover:underline">{l.url}</a>
            </div>
            <div className="flex flex-col items-end gap-1">
              {l.is_active ? <CheckCircle size={14} className="text-success"/> : <XCircle size={14} className="text-error"/>}
              <div className="flex gap-1">
                <button className="btn btn-ghost btn-xs btn-square" onClick={() => startEdit(l)}><Pencil size={12}/></button>
                <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => del(l.id)}><Trash2 size={12}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── CMS Pages ─── */
function PagesTab() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ slug: '', title: '', content: '', meta_title: '', meta_description: '' });
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try { setPages((await fetchApi('/pages'))?.data || await fetchApi('/pages') || []); }
    catch { } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      editing ? await fetchApi(`/pages/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) })
               : await fetchApi('/pages', { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false); setEditing(null); setForm({ slug: '', title: '', content: '', meta_title: '', meta_description: '' }); load();
    } catch { alert('Failed to save page'); }
  };

  const del = async (id: number) => { if (confirm('Delete this page?')) { await fetchApi(`/pages/${id}`, { method: 'DELETE' }); load(); } };

  const startEdit = (row: any) => {
    setEditing(row);
    setForm({ slug: row.slug, title: row.title || '', content: row.content || '', meta_title: row.meta_title || '', meta_description: row.meta_description || '' });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-base-content/50">Manage dynamic CMS pages (About, Privacy Policy, Terms, etc.).</p>
        <button className="btn btn-primary btn-sm gap-2" onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ slug: '', title: '', content: '', meta_title: '', meta_description: '' }); }}>
          {showForm ? <><X size={14}/> Close</> : <><Plus size={14}/> New Page</>}
        </button>
      </div>

      {showForm && (
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-5">
            <h3 className="font-semibold mb-3">{editing ? 'Edit Page' : 'New CMS Page'}</h3>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label text-xs font-medium">Slug (URL path)</label>
                  <input className="input input-bordered input-sm font-mono" placeholder="about-us" value={form.slug} onChange={e => setForm(p => ({...p, slug: e.target.value}))} required/>
                </div>
                <div className="form-control">
                  <label className="label text-xs font-medium">Page Title</label>
                  <input className="input input-bordered input-sm" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required/>
                </div>
                <div className="form-control">
                  <label className="label text-xs font-medium">Meta Title (SEO)</label>
                  <input className="input input-bordered input-sm" value={form.meta_title} onChange={e => setForm(p => ({...p, meta_title: e.target.value}))}/>
                </div>
                <div className="form-control">
                  <label className="label text-xs font-medium">Meta Description (SEO)</label>
                  <input className="input input-bordered input-sm" value={form.meta_description} onChange={e => setForm(p => ({...p, meta_description: e.target.value}))}/>
                </div>
              </div>
              <div className="form-control">
                <label className="label text-xs font-medium">Content (HTML/Markdown)</label>
                <textarea className="textarea textarea-bordered w-full font-mono text-sm" rows={8} value={form.content} onChange={e => setForm(p => ({...p, content: e.target.value}))}/>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm gap-1"><Save size={13}/> Save Page</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-zebra table-sm w-full">
          <thead><tr><th>Slug</th><th>Title</th><th>Meta Title</th><th>Preview</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="text-center py-8"><span className="loading loading-spinner"/></td></tr>
            : pages.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-base-content/40">No pages yet.</td></tr>
            : pages.map(p => (
              <tr key={p.id} className="hover">
                <td className="font-mono text-xs text-primary">{p.slug}</td>
                <td className="font-medium text-sm">{p.title}</td>
                <td className="text-xs text-base-content/50">{p.meta_title}</td>
                <td><a href={`/pages/${p.slug}`} target="_blank" className="btn btn-ghost btn-xs gap-1"><Globe size={11}/> View</a></td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-xs btn-square" onClick={() => startEdit(p)}><Pencil size={12}/></button>
                    <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => del(p.id)}><Trash2 size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Google Reviews ─── */
function ReviewsTab() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ author_name: '', rating: '5', text: '', time: '', is_displayed: '1' });
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try { setReviews((await fetchApi('/google-reviews'))?.data || await fetchApi('/google-reviews') || []); }
    catch { } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, rating: parseInt(form.rating), is_displayed: parseInt(form.is_displayed) };
      editing ? await fetchApi(`/google-reviews/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) })
               : await fetchApi('/google-reviews', { method: 'POST', body: JSON.stringify(payload) });
      setShowForm(false); setEditing(null); setForm({ author_name: '', rating: '5', text: '', time: '', is_displayed: '1' }); load();
    } catch { alert('Failed to save review'); }
  };

  const toggle = async (r: any) => {
    await fetchApi(`/google-reviews/${r.id}`, { method: 'PUT', body: JSON.stringify({ is_displayed: r.is_displayed ? 0 : 1 }) });
    load();
  };

  const del = async (id: number) => { if (confirm('Delete?')) { await fetchApi(`/google-reviews/${id}`, { method: 'DELETE' }); load(); } };

  const startEdit = (row: any) => {
    setEditing(row);
    setForm({ author_name: row.author_name || '', rating: String(row.rating || 5), text: row.text || '', time: row.time || '', is_displayed: String(row.is_displayed || 1) });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-base-content/50">Import and curate Google Reviews shown publicly on the website.</p>
        <button className="btn btn-primary btn-sm gap-2" onClick={() => { setShowForm(!showForm); setEditing(null); }}>
          {showForm ? <><X size={14}/> Close</> : <><Plus size={14}/> Add Review</>}
        </button>
      </div>

      {showForm && (
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-5">
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label text-xs font-medium">Author Name</label>
                <input className="input input-bordered input-sm" value={form.author_name} onChange={e => setForm(p => ({...p, author_name: e.target.value}))} required/>
              </div>
              <div className="form-control">
                <label className="label text-xs font-medium">Rating (1-5)</label>
                <select className="select select-bordered select-sm" value={form.rating} onChange={e => setForm(p => ({...p, rating: e.target.value}))}>
                  {[5,4,3,2,1].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} ({n})</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label text-xs font-medium">Date / Time</label>
                <input className="input input-bordered input-sm" placeholder="e.g. 2 months ago" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))}/>
              </div>
              <div className="form-control">
                <label className="label text-xs font-medium">Display on Website</label>
                <select className="select select-bordered select-sm" value={form.is_displayed} onChange={e => setForm(p => ({...p, is_displayed: e.target.value}))}>
                  <option value="1">Yes</option><option value="0">No</option>
                </select>
              </div>
              <div className="form-control sm:col-span-2">
                <label className="label text-xs font-medium">Review Text</label>
                <textarea className="textarea textarea-bordered w-full" rows={3} value={form.text} onChange={e => setForm(p => ({...p, text: e.target.value}))} required/>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm gap-1"><Save size={13}/> Save</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading ? <div className="col-span-3 flex justify-center py-8"><span className="loading loading-spinner"/></div>
        : reviews.length === 0 ? <div className="col-span-3 text-center py-8 text-base-content/40">No reviews yet.</div>
        : reviews.map(r => (
          <div key={r.id} className={`card border p-4 space-y-2 ${r.is_displayed ? 'bg-base-100 border-base-200' : 'bg-base-200 border-dashed border-base-300 opacity-60'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm">{r.author_name}</p>
                <p className="text-xs text-base-content/40">{r.time}</p>
              </div>
              <div className="flex gap-1 text-warning text-xs">{'⭐'.repeat(r.rating || 5)}</div>
            </div>
            <p className="text-sm text-base-content/70 line-clamp-3">{r.text}</p>
            <div className="flex justify-between items-center pt-1">
              <button className={`btn btn-xs ${r.is_displayed ? 'btn-success btn-outline' : 'btn-ghost'} gap-1`} onClick={() => toggle(r)}>
                {r.is_displayed ? <><CheckCircle size={11}/> Shown</> : <><XCircle size={11}/> Hidden</>}
              </button>
              <div className="flex gap-1">
                <button className="btn btn-ghost btn-xs btn-square" onClick={() => startEdit(r)}><Pencil size={12}/></button>
                <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => del(r.id)}><Trash2 size={12}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function WebsiteManagementPage() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Website Management</h1>
        <p className="text-sm text-base-content/50 mt-1">Manage all public-facing content, branding, and social presence.</p>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered border-b border-base-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`tab gap-2 font-medium ${activeTab === id ? 'tab-active text-primary' : 'text-base-content/60'}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-64">
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'social' && <SocialTab />}
        {activeTab === 'pages' && <PagesTab />}
        {activeTab === 'reviews' && <ReviewsTab />}
      </div>
    </div>
  );
}
