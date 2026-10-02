'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, Copy, ExternalLink, GripVertical, Plus, Redo2, Trash2, Undo2, Upload, X, Zap, Type, Save, Rocket, FilePlus,
} from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { SiteFrame, SiteSection } from '@/components/site/Sections';
import type { ComponentDefinition, FieldDefinition, Section, SectionProps, SiteContext, SiteMenuData, SiteRestaurant } from '@/lib/site/types';
import { storageUrl } from '@/lib/site/types';

/**
 * The in-house site builder.
 *
 * A page is a list of sections. Live sections (menu, ordering, branches,
 * contact) are filled from the restaurant's own data and only offer display
 * choices; content sections (banner, text, image, space) hold what the owner
 * writes. Which components exist and what each setting may be comes from
 * core-api (GET /site-builder/components), which also checks every save - the
 * editor only draws forms from it. There is no field for custom code.
 *
 * The preview renders the same components as the public site, with the
 * restaurant's real data, so what you see is what visitors get.
 */

type PageRow = {
  id: number;
  title: string;
  slug: string;
  is_home: boolean;
  sections: Section[];
  is_published: boolean;
  has_unpublished_changes: boolean;
};

type History = { past: Section[][]; future: Section[][] };

const newId = () => Math.random().toString(36).slice(2, 10);

export default function SiteBuilderPage() {
  const [defs, setDefs] = useState<Record<string, ComponentDefinition> | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [siteCode, setSiteCode] = useState('');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<SiteMenuData | null>(null);
  const [restaurant, setRestaurant] = useState<SiteRestaurant | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const current = pages.find((p) => p.id === currentId) ?? null;
  const dirty = current !== null && JSON.stringify(current.sections) !== JSON.stringify(sections);
  const selected = sections.find((s) => s.id === selectedId) ?? null;

  const openPage = useCallback((page: PageRow) => {
    setCurrentId(page.id);
    setSections(page.sections);
    setHistory({ past: [], future: [] });
    setSelectedId(null);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [components, list] = await Promise.all([
          fetchApi('/site-builder/components'),
          fetchApi('/site-pages'),
        ]);
        if (!active) return;
        setDefs(components.components);
        setPages(list.pages);
        setSiteCode(list.site_code ?? '');
        const home = (list.pages as PageRow[]).find((p) => p.is_home) ?? list.pages[0];
        if (home) openPage(home);

        if (list.site_code) {
          const data = await fetchApi(`/order/${encodeURIComponent(list.site_code)}`);
          if (!active) return;
          setMenu({ categories: data.categories, products: data.products, locations: data.locations });
          setRestaurant({
            code: data.restaurant.code, name: data.restaurant.name, logo_url: data.restaurant.logo_url,
            phone: data.restaurant.phone, email: null, address: data.restaurant.address, currency: data.restaurant.currency,
          });
        }
      } catch (err) {
        if (active) setError(apiErrorMessage(err, 'Could not load the site builder.'));
      }
    })();
    return () => { active = false; };
  }, [openPage]);

  /** Every edit goes through here, so it can be undone. */
  const change = (next: Section[]) => {
    setHistory((h) => ({ past: [...h.past.slice(-49), sections], future: [] }));
    setSections(next);
  };

  const undo = () => {
    if (!history.past.length) return;
    const prev = history.past[history.past.length - 1];
    setHistory({ past: history.past.slice(0, -1), future: [sections, ...history.future] });
    setSections(prev);
  };

  const redo = () => {
    if (!history.future.length) return;
    const [next, ...rest] = history.future;
    setHistory({ past: [...history.past, sections], future: rest });
    setSections(next);
  };

  const defaultsFor = (type: string): SectionProps =>
    Object.fromEntries(Object.entries(defs?.[type]?.fields ?? {}).map(([k, f]) => [k, f.default])) as SectionProps;

  const addSection = (type: string) => {
    const section: Section = { id: newId(), type, props: defaultsFor(type) };
    const at = selected ? sections.indexOf(selected) + 1 : sections.length;
    change([...sections.slice(0, at), section, ...sections.slice(at)]);
    setSelectedId(section.id);
    setPickerOpen(false);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sections.length || from === to) return;
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    change(next);
  };

  const duplicate = (index: number) => {
    const copy = { ...sections[index], id: newId(), props: { ...sections[index].props } };
    change([...sections.slice(0, index + 1), copy, ...sections.slice(index + 1)]);
    setSelectedId(copy.id);
  };

  const remove = (index: number) => {
    const removed = sections[index];
    change(sections.filter((_, i) => i !== index));
    if (removed.id === selectedId) setSelectedId(null);
  };

  const setProp = (key: string, value: SectionProps[string]) => {
    if (!selected) return;
    change(sections.map((s) => (s.id === selected.id ? { ...s, props: { ...s.props, [key]: value } } : s)));
  };

  const save = async (): Promise<PageRow | null> => {
    if (!current) return null;
    const res = await fetchApi(`/site-pages/${current.id}`, { method: 'PUT', body: JSON.stringify({ sections }) });
    const saved: PageRow = res.page;
    setPages((ps) => ps.map((p) => (p.id === saved.id ? saved : p)));
    // The server cleans what it saves (ids, defaults) - keep the editor in step.
    setSections(saved.sections);
    return saved;
  };

  const handleSave = async () => {
    setBusy('save'); setError(null); setNotice(null);
    try {
      await save();
      setNotice('Draft saved. Visitors still see the published version until you publish.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the page.'));
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = async () => {
    if (!current) return;
    setBusy('publish'); setError(null); setNotice(null);
    try {
      if (dirty) await save();
      const res = await fetchApi(`/site-pages/${current.id}/publish`, { method: 'POST' });
      setPages((ps) => ps.map((p) => (p.id === res.page.id ? res.page : p)));
      setNotice('Published - your site is updated.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not publish the page.'));
    } finally {
      setBusy(null);
    }
  };

  const addPage = async () => {
    const title = prompt('Name of the new page (e.g. About us):');
    if (!title?.trim()) return;
    setError(null);
    try {
      const res = await fetchApi('/site-pages', { method: 'POST', body: JSON.stringify({ title: title.trim() }) });
      setPages((ps) => [...ps, res.page]);
      openPage(res.page);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add the page.'));
    }
  };

  const deletePage = async () => {
    if (!current || current.is_home) return;
    if (!confirm(`Delete the "${current.title}" page? It is removed from your site.`)) return;
    try {
      await fetchApi(`/site-pages/${current.id}`, { method: 'DELETE' });
      const rest = pages.filter((p) => p.id !== current.id);
      setPages(rest);
      const home = rest.find((p) => p.is_home) ?? rest[0];
      if (home) openPage(home);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete the page.'));
    }
  };

  const switchPage = (id: number) => {
    if (dirty && !confirm('You have unsaved changes on this page. Leave without saving?')) return;
    const page = pages.find((p) => p.id === id);
    if (page) openPage(page);
  };

  const siteBase = siteCode ? `/${siteCode}/site` : '';
  const ctx: SiteContext | null = useMemo(() => restaurant && ({
    restaurant, menu, basePath: siteBase, orderUrl: `/order/${siteCode}`,
  }), [restaurant, menu, siteBase, siteCode]);

  if (error && !defs) return <div className="alert alert-error">{error}</div>;
  if (!defs || !ctx) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>;

  const viewUrl = current ? `${siteBase}${current.is_home ? '' : `/${current.slug}`}` : siteBase;
  const groups: { kind: 'live' | 'content'; title: string; hint: string; Icon: typeof Zap }[] = [
    { kind: 'live', title: 'From your restaurant', hint: 'Filled from your menu, branches and settings - always up to date.', Icon: Zap },
    { kind: 'content', title: 'Your content', hint: 'Text and photos you write yourself.', Icon: Type },
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold mr-2">Site builder</h1>
        <select className="select select-sm select-bordered" value={currentId ?? ''} onChange={(e) => switchPage(Number(e.target.value))}>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>{p.title}{p.is_home ? ' (home)' : ''}{p.is_published ? '' : ' - not published'}</option>
          ))}
        </select>
        <button className="btn btn-sm btn-ghost" onClick={addPage}><FilePlus size={14} /> Page</button>
        {current && !current.is_home && <button className="btn btn-sm btn-ghost text-error" onClick={deletePage}><Trash2 size={14} /></button>}
        <div className="flex-1" />
        <button className="btn btn-sm btn-ghost btn-square" onClick={undo} disabled={!history.past.length} title="Undo"><Undo2 size={16} /></button>
        <button className="btn btn-sm btn-ghost btn-square" onClick={redo} disabled={!history.future.length} title="Redo"><Redo2 size={16} /></button>
        <a className="btn btn-sm btn-ghost" href={viewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> View site</a>
        <button className="btn btn-sm btn-outline" onClick={handleSave} disabled={!dirty || busy !== null}>
          {busy === 'save' ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />} Save draft
        </button>
        <button className="btn btn-sm btn-primary" onClick={handlePublish} disabled={busy !== null || (!dirty && !current?.has_unpublished_changes)}>
          {busy === 'publish' ? <span className="loading loading-spinner loading-xs" /> : <Rocket size={14} />} Publish
        </button>
      </div>

      {error && <div className="alert alert-error text-sm py-2">{error}</div>}
      {notice && <div className="alert alert-success text-sm py-2">{notice}</div>}
      {current && (dirty || current.has_unpublished_changes) && !notice && (
        <div className="text-xs text-warning">
          {dirty ? 'Unsaved changes.' : 'Saved changes not published yet - visitors see the last published version.'}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[250px_1fr_300px] gap-3 items-start">
        {/* Outline */}
        <aside className="bg-base-100 border border-base-200 rounded-xl p-3 xl:sticky xl:top-20">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Sections</span>
            <button className="btn btn-xs btn-primary" onClick={() => setPickerOpen(true)}><Plus size={12} /> Add</button>
          </div>
          {sections.length === 0 && <p className="text-xs text-base-content/60 py-4 text-center">Empty page. Add a section to start.</p>}
          <ol className="space-y-1">
            {sections.map((s, i) => {
              const def = defs[s.type];
              return (
                <li
                  key={s.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); }}
                  onDragEnd={() => setDragIndex(null)}
                  onClick={() => setSelectedId(s.id)}
                  className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm cursor-pointer ${selectedId === s.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-base-200'} ${dragIndex === i ? 'opacity-40' : ''}`}
                >
                  <GripVertical size={14} className="text-base-content/30 cursor-grab shrink-0" />
                  {def?.kind === 'live' ? <Zap size={12} className="text-warning shrink-0" /> : <Type size={12} className="text-base-content/40 shrink-0" />}
                  <span className="flex-1 truncate">{def?.label ?? s.type}</span>
                  <span className="hidden group-hover:flex items-center">
                    <button className="btn btn-ghost btn-xs btn-square" onClick={(e) => { e.stopPropagation(); move(i, i - 1); }} disabled={i === 0} aria-label="Move up"><ArrowUp size={12} /></button>
                    <button className="btn btn-ghost btn-xs btn-square" onClick={(e) => { e.stopPropagation(); move(i, i + 1); }} disabled={i === sections.length - 1} aria-label="Move down"><ArrowDown size={12} /></button>
                    <button className="btn btn-ghost btn-xs btn-square" onClick={(e) => { e.stopPropagation(); duplicate(i); }} aria-label="Duplicate"><Copy size={12} /></button>
                    <button className="btn btn-ghost btn-xs btn-square text-error" onClick={(e) => { e.stopPropagation(); remove(i); }} aria-label="Delete"><Trash2 size={12} /></button>
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Preview: the real site components, links disabled */}
        <div
          className="rounded-xl border border-base-200 overflow-hidden shadow-sm bg-base-100"
          onClickCapture={(e) => { if ((e.target as HTMLElement).closest('a')) e.preventDefault(); }}
        >
          <SiteFrame ctx={ctx} pages={pages.filter((p) => p.is_published).map((p) => ({ slug: p.is_home ? '' : p.slug, title: p.title }))}>
            {sections.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`relative cursor-pointer outline-offset-[-2px] ${selectedId === s.id ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/40'}`}
              >
                {selectedId === s.id && (
                  <span className="absolute top-1 left-1 z-10 badge badge-primary badge-sm">{defs[s.type]?.label}</span>
                )}
                <SiteSection section={s} ctx={ctx} />
              </div>
            ))}
            {sections.length === 0 && <div className="py-24 text-center text-base-content/40">This page is empty.</div>}
          </SiteFrame>
        </div>

        {/* Settings */}
        <aside className="bg-base-100 border border-base-200 rounded-xl p-4 xl:sticky xl:top-20">
          {selected && defs[selected.type] ? (
            <SettingsPanel
              def={defs[selected.type]}
              props={selected.props}
              categories={menu?.categories ?? []}
              onChange={setProp}
              onError={setError}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="text-sm text-base-content/60 space-y-2">
              <p className="font-semibold text-base-content">Settings</p>
              <p>Click a section in the preview or the list to change it.</p>
              <p>Sections marked <Zap size={12} className="inline text-warning" /> come from your restaurant&apos;s data - your menu, branches and contact details - and stay up to date by themselves.</p>
            </div>
          )}
        </aside>
      </div>

      {/* Component picker */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPickerOpen(false)}>
          <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Add a section</h2>
              <button className="btn btn-sm btn-ghost btn-square" onClick={() => setPickerOpen(false)} aria-label="Close"><X size={16} /></button>
            </div>
            {groups.map(({ kind, title, hint, Icon }) => (
              <div key={kind}>
                <div className="flex items-center gap-2 font-semibold text-sm"><Icon size={14} /> {title}</div>
                <p className="text-xs text-base-content/60 mb-2">{hint}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {Object.entries(defs).filter(([, d]) => d.kind === kind).map(([type, d]) => (
                    <button key={type} className="text-left rounded-xl border border-base-300 p-3 hover:border-primary hover:bg-primary/5" onClick={() => addSection(type)}>
                      <div className="font-medium">{d.label}</div>
                      <div className="text-xs text-base-content/60">{d.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** The selected section's settings, drawn from its definition. */
function SettingsPanel({ def, props, categories, onChange, onError, onClose }: {
  def: ComponentDefinition;
  props: SectionProps;
  categories: { id: number; name: string }[];
  onChange: (key: string, value: SectionProps[string]) => void;
  onError: (message: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold flex items-center gap-1">{def.kind === 'live' && <Zap size={14} className="text-warning" />} {def.label}</div>
          <p className="text-xs text-base-content/60 mt-1">{def.description}</p>
        </div>
        <button className="btn btn-xs btn-ghost btn-square" onClick={onClose} aria-label="Close settings"><X size={14} /></button>
      </div>
      {Object.entries(def.fields).map(([key, field]) => (
        <Field key={key} name={key} field={field} value={props[key]} categories={categories} onChange={onChange} onError={onError} />
      ))}
    </div>
  );
}

function Field({ name, field, value, categories, onChange, onError }: {
  name: string;
  field: FieldDefinition;
  value: SectionProps[string] | undefined;
  categories: { id: number; name: string }[];
  onChange: (key: string, value: SectionProps[string]) => void;
  onError: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const label = <span className="label-text text-xs font-medium mb-1 block">{field.label}</span>;

  switch (field.type) {
    case 'text':
      return (
        <label className="block">{label}
          <input className="input input-sm input-bordered w-full" maxLength={field.max} value={String(value ?? '')} onChange={(e) => onChange(name, e.target.value)} />
        </label>
      );
    case 'textarea':
      return (
        <label className="block">{label}
          <textarea className="textarea textarea-bordered w-full text-sm" rows={5} maxLength={field.max} value={String(value ?? '')} onChange={(e) => onChange(name, e.target.value)} />
        </label>
      );
    case 'enum':
      return (
        <label className="block">{label}
          <select className="select select-sm select-bordered w-full capitalize" value={String(value ?? field.default)} onChange={(e) => onChange(name, e.target.value)}>
            {field.options?.map((o) => <option key={o} value={o} className="capitalize">{o.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
      );
    case 'bool':
      return (
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm">{field.label}</span>
          <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={value === true} onChange={(e) => onChange(name, e.target.checked)} />
        </label>
      );
    case 'categories': {
      const chosen = Array.isArray(value) ? (value as number[]) : [];
      return (
        <div>{label}
          <p className="text-xs text-base-content/50 mb-1">None ticked shows every category.</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={chosen.includes(c.id)}
                  onChange={(e) => onChange(name, e.target.checked ? [...chosen, c.id] : chosen.filter((id) => id !== c.id))}
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case 'image': {
      const url = storageUrl(typeof value === 'string' ? value : '');
      const upload = async (file: File) => {
        setUploading(true);
        try {
          const form = new FormData();
          form.append('image', file);
          const res = await fetchApi('/site-builder/images', { method: 'POST', body: form });
          onChange(name, res.path);
        } catch (err) {
          onError(apiErrorMessage(err, 'Could not upload the photo.'));
        } finally {
          setUploading(false);
        }
      };
      return (
        <div>{label}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url && <img src={url} alt="" className="w-full h-28 object-cover rounded-lg mb-2" />}
          <div className="flex gap-2">
            <label className="btn btn-sm btn-outline flex-1">
              {uploading ? <span className="loading loading-spinner loading-xs" /> : <Upload size={14} />} {url ? 'Replace' : 'Upload photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {url && <button className="btn btn-sm btn-ghost" onClick={() => onChange(name, '')}>Remove</button>}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
