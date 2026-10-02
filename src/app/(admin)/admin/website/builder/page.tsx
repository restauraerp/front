'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, Copy, ExternalLink, GripVertical, Plus, Redo2, Trash2, Undo2, Upload, X, Zap, Type, Save, Rocket, FilePlus,
  Monitor, Smartphone, Palette, FileText,
} from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import type {
  ComponentDefinition, FieldDefinition, Section, SectionProps, SiteContext, SiteMenuData, SiteRestaurant, SiteReview, SiteSocialLink,
} from '@/lib/site/types';
import { storageUrl } from '@/lib/site/types';
import { FONTS, PALETTES, DEFAULT_THEME, type SiteTheme } from '@/lib/site/themes';

/**
 * The in-house site builder.
 *
 * A page is a list of sections. Live sections (menu, ordering, branches,
 * reviews...) are filled from the restaurant's own data and only offer display
 * choices; content sections (banner, text, photos...) hold what the owner
 * writes. Which components exist and what each setting may be comes from
 * core-api (GET /site-builder/components), which also checks every save - the
 * editor only draws forms from it. There is no field for custom code.
 *
 * The preview is an iframe (/{code}/site-preview) rendering the site's own
 * components with real data, so the phone view is a real phone layout.
 */

type PageRow = {
  id: number;
  title: string;
  slug: string;
  is_home: boolean;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  sections: Section[];
  is_published: boolean;
  has_unpublished_changes: boolean;
};

type PageMeta = Pick<PageRow, 'title' | 'slug' | 'meta_title' | 'meta_description' | 'og_image'>;
type History = { past: Section[][]; future: Section[][] };
type Product = SiteMenuData['products'][number];

const newId = () => Math.random().toString(36).slice(2, 10);
const metaOf = (p: PageRow): PageMeta => ({
  title: p.title, slug: p.slug, meta_title: p.meta_title ?? '', meta_description: p.meta_description ?? '', og_image: p.og_image ?? '',
});

export default function SiteBuilderPage() {
  const [defs, setDefs] = useState<Record<string, ComponentDefinition> | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [siteCode, setSiteCode] = useState('');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<SiteMenuData | null>(null);
  const [restaurant, setRestaurant] = useState<SiteRestaurant | null>(null);
  const [reviews, setReviews] = useState<SiteReview[]>([]);
  const [social, setSocial] = useState<SiteSocialLink[]>([]);
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [savedTheme, setSavedTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [panel, setPanel] = useState<'page' | 'theme'>('page');
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<'save' | 'publish' | 'theme' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  const current = pages.find((p) => p.id === currentId) ?? null;
  const metaDirty = current !== null && meta !== null && JSON.stringify(metaOf(current)) !== JSON.stringify(meta);
  const dirty = current !== null && (JSON.stringify(current.sections) !== JSON.stringify(sections) || metaDirty);
  const selected = sections.find((s) => s.id === selectedId) ?? null;

  const openPage = useCallback((page: PageRow) => {
    setCurrentId(page.id);
    setSections(page.sections);
    setMeta(metaOf(page));
    setHistory({ past: [], future: [] });
    setSelectedId(null);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [components, list] = await Promise.all([fetchApi('/site-builder/components'), fetchApi('/site-pages')]);
        if (!active) return;
        setDefs(components.components);
        setTheme(components.theme);
        setSavedTheme(components.theme);
        setPages(list.pages);
        setSiteCode(list.site_code ?? '');
        const home = (list.pages as PageRow[]).find((p) => p.is_home) ?? list.pages[0];
        if (home) openPage(home);

        if (list.site_code) {
          const [data, reviewRows, linkRows] = await Promise.all([
            fetchApi(`/order/${encodeURIComponent(list.site_code)}`),
            fetchApi('/google-reviews').catch(() => []),
            fetchApi('/social-links').catch(() => []),
          ]);
          if (!active) return;
          setMenu({ categories: data.categories, products: data.products, locations: data.locations });
          setRestaurant({
            code: data.restaurant.code, name: data.restaurant.name, logo_url: data.restaurant.logo_url,
            phone: data.restaurant.phone, email: null, address: data.restaurant.address, currency: data.restaurant.currency,
          });
          const reviewList = (reviewRows?.data ?? reviewRows ?? []) as { author_name: string; rating: number; text: string; is_displayed: boolean | number }[];
          setReviews(reviewList.filter((r) => r.is_displayed).map((r) => ({ author: r.author_name, rating: Number(r.rating), text: r.text })));
          const linkList = (linkRows?.data ?? linkRows ?? []) as { platform: string; url: string; is_active: boolean | number }[];
          setSocial(linkList.filter((l) => l.is_active && /^https?:\/\//i.test(l.url ?? '')).map((l) => ({ platform: (l.platform ?? '').toLowerCase(), url: l.url })));
        }
      } catch (err) {
        if (active) setError(apiErrorMessage(err, 'Could not load the site builder.'));
      }
    })();
    return () => { active = false; };
  }, [openPage]);

  const siteBase = siteCode ? `/${siteCode}/site` : '';
  const ctx: SiteContext | null = useMemo(() => restaurant && ({
    restaurant, menu, reviews, social, basePath: siteBase, orderUrl: `/order/${siteCode}`,
  }), [restaurant, menu, reviews, social, siteBase, siteCode]);

  // ---- Preview iframe --------------------------------------------------------
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'site-preview-ready') setPreviewReady(true);
      if (e.data?.type === 'site-preview-select') setSelectedId(e.data.id);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!previewReady || !ctx || !defs) return;
    frame.current?.contentWindow?.postMessage({
      type: 'site-preview-state',
      state: {
        ctx,
        theme,
        sections,
        selectedId,
        pages: pages.filter((p) => p.is_published).map((p) => ({ slug: p.is_home ? '' : p.slug, title: p.title })),
        labels: Object.fromEntries(Object.entries(defs).map(([k, d]) => [k, d.label])),
      },
    }, window.location.origin);
  }, [previewReady, ctx, defs, theme, sections, selectedId, pages]);

  // ---- Editing ----------------------------------------------------------------
  /** Every section edit goes through here, so it can be undone. */
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

  // ---- Saving -----------------------------------------------------------------
  const save = async (): Promise<PageRow | null> => {
    if (!current || !meta) return null;
    const body: Record<string, unknown> = { sections };
    if (metaDirty) {
      body.title = meta.title;
      if (!current.is_home) body.slug = meta.slug;
      body.meta_title = meta.meta_title || null;
      body.meta_description = meta.meta_description || null;
      body.og_image = meta.og_image || null;
    }
    const res = await fetchApi(`/site-pages/${current.id}`, { method: 'PUT', body: JSON.stringify(body) });
    const saved: PageRow = res.page;
    setPages((ps) => ps.map((p) => (p.id === saved.id ? saved : p)));
    // The server cleans what it saves (ids, defaults) - keep the editor in step.
    setSections(saved.sections);
    setMeta(metaOf(saved));
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

  const saveTheme = async () => {
    setBusy('theme'); setError(null); setNotice(null);
    try {
      const res = await fetchApi('/site-builder/theme', { method: 'PUT', body: JSON.stringify(theme) });
      setSavedTheme(res.theme);
      setNotice('Theme saved - it applies to every page of your live site.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the theme.'));
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

  if (error && !defs) return <div className="alert alert-error">{error}</div>;
  if (!defs || !ctx || !meta) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>;

  const viewUrl = current ? `${siteBase}${current.is_home ? '' : `/${current.slug}`}` : siteBase;
  const groups: { kind: 'live' | 'content'; title: string; hint: string; Icon: typeof Zap }[] = [
    { kind: 'live', title: 'From your restaurant', hint: 'Filled from your menu, branches and settings - always up to date.', Icon: Zap },
    { kind: 'content', title: 'Your content', hint: 'Text and photos you write yourself.', Icon: Type },
  ];
  const themeDirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);

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
        {current && !current.is_home && <button className="btn btn-sm btn-ghost text-error" onClick={deletePage} aria-label="Delete page"><Trash2 size={14} /></button>}
        <div className="flex-1" />
        <div className="join">
          <button className={`btn btn-sm join-item ${device === 'desktop' ? 'btn-active' : ''}`} onClick={() => setDevice('desktop')} title="Desktop"><Monitor size={14} /></button>
          <button className={`btn btn-sm join-item ${device === 'phone' ? 'btn-active' : ''}`} onClick={() => setDevice('phone')} title="Phone"><Smartphone size={14} /></button>
        </div>
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

      <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_310px] gap-3 items-start">
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

        {/* Preview */}
        <div className="rounded-xl border border-base-200 bg-base-200/60 p-2 flex justify-center">
          <iframe
            ref={frame}
            src={`/${encodeURIComponent(siteCode)}/site-preview`}
            title="Site preview"
            className="bg-white rounded-lg shadow-sm transition-all"
            style={{ width: device === 'phone' ? 390 : '100%', height: '75vh', border: 0 }}
          />
        </div>

        {/* Settings */}
        <aside className="bg-base-100 border border-base-200 rounded-xl p-4 xl:sticky xl:top-20 max-h-[80vh] overflow-y-auto">
          {selected && defs[selected.type] ? (
            <SettingsPanel
              def={defs[selected.type]}
              props={selected.props}
              categories={menu?.categories ?? []}
              products={menu?.products ?? []}
              pages={pages}
              onChange={setProp}
              onError={setError}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="space-y-4">
              <div className="join w-full">
                <button className={`btn btn-sm join-item flex-1 ${panel === 'page' ? 'btn-active' : ''}`} onClick={() => setPanel('page')}><FileText size={14} /> Page</button>
                <button className={`btn btn-sm join-item flex-1 ${panel === 'theme' ? 'btn-active' : ''}`} onClick={() => setPanel('theme')}><Palette size={14} /> Theme</button>
              </div>
              {panel === 'page' ? (
                <PagePanel meta={meta} isHome={!!current?.is_home} siteBase={siteBase} onChange={setMeta} onError={setError} />
              ) : (
                <ThemePanel theme={theme} dirty={themeDirty} saving={busy === 'theme'} onChange={setTheme} onSave={saveTheme} />
              )}
              <p className="text-xs text-base-content/50">Click a section in the preview or the list to change it.</p>
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

/** Uploads one photo to the site builder's storage and returns its path. */
async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetchApi('/site-builder/images', { method: 'POST', body: form });
  return res.path as string;
}

/** The page's own settings: name, address and what search engines show. */
function PagePanel({ meta, isHome, siteBase, onChange, onError }: {
  meta: PageMeta;
  isHome: boolean;
  siteBase: string;
  onChange: (meta: PageMeta) => void;
  onError: (message: string) => void;
}) {
  const set = (key: keyof PageMeta) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...meta, [key]: e.target.value });
  const [uploading, setUploading] = useState(false);
  const image = storageUrl(meta.og_image);

  return (
    <div className="space-y-3">
      <label className="block"><span className="label-text text-xs font-medium mb-1 block">Page name (in the menu bar)</span>
        <input className="input input-sm input-bordered w-full" maxLength={120} value={meta.title} onChange={set('title')} />
      </label>
      {!isHome && (
        <label className="block"><span className="label-text text-xs font-medium mb-1 block">Address</span>
          <div className="join w-full">
            <span className="join-item btn btn-sm btn-disabled normal-case font-normal">{siteBase}/</span>
            <input className="input input-sm input-bordered join-item w-full" maxLength={80} value={meta.slug}
                   onChange={(e) => onChange({ ...meta, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
          </div>
        </label>
      )}
      <div className="divider my-1 text-xs">Search engines and link previews</div>
      <label className="block"><span className="label-text text-xs font-medium mb-1 block">Title <span className="text-base-content/40">({(meta.meta_title ?? '').length}/70)</span></span>
        <input className="input input-sm input-bordered w-full" maxLength={70} placeholder="Defaults to the page name and restaurant" value={meta.meta_title ?? ''} onChange={set('meta_title')} />
      </label>
      <label className="block"><span className="label-text text-xs font-medium mb-1 block">Description <span className="text-base-content/40">({(meta.meta_description ?? '').length}/160)</span></span>
        <textarea className="textarea textarea-bordered w-full text-sm" rows={3} maxLength={160} placeholder="One or two sentences shown under your link in Google" value={meta.meta_description ?? ''} onChange={set('meta_description')} />
      </label>
      <div>
        <span className="label-text text-xs font-medium mb-1 block">Sharing image</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />}
        <div className="flex gap-2">
          <label className="btn btn-xs btn-outline flex-1">
            {uploading ? <span className="loading loading-spinner loading-xs" /> : <Upload size={12} />} {image ? 'Replace' : 'Upload'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try { onChange({ ...meta, og_image: await uploadPhoto(file) }); } catch (err) { onError(apiErrorMessage(err, 'Could not upload the photo.')); } finally { setUploading(false); }
            }} />
          </label>
          {image && <button className="btn btn-xs btn-ghost" onClick={() => onChange({ ...meta, og_image: '' })}>Remove</button>}
        </div>
        <p className="text-xs text-base-content/50 mt-1">Shown when the page is shared on Facebook or WhatsApp. Your logo is used if empty.</p>
      </div>
    </div>
  );
}

/** Site-wide colours and type. Saved separately: it applies to the live site at once. */
function ThemePanel({ theme, dirty, saving, onChange, onSave }: {
  theme: SiteTheme;
  dirty: boolean;
  saving: boolean;
  onChange: (theme: SiteTheme) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <span className="label-text text-xs font-medium mb-2 block">Colours</span>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(PALETTES).map(([key, p]) => (
            <button key={key} type="button" onClick={() => onChange({ ...theme, palette: key })}
                    className={`flex items-center gap-3 rounded-lg border p-2 text-sm text-left ${theme.palette === key ? 'border-primary ring-1 ring-primary' : 'border-base-300 hover:border-base-content/30'}`}>
              <span className="flex">
                {['--color-primary', '--color-neutral', '--color-base-200'].map((v) => (
                  <span key={v} className="w-5 h-5 rounded-full border border-black/10 -ml-1 first:ml-0" style={{ background: p.vars[v] }} />
                ))}
              </span>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label-text text-xs font-medium mb-2 block">Type</span>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(FONTS).map(([key, f]) => (
            <button key={key} type="button" onClick={() => onChange({ ...theme, font: key })} style={{ fontFamily: f.family }}
                    className={`rounded-lg border p-2 text-sm ${theme.font === key ? 'border-primary ring-1 ring-primary' : 'border-base-300 hover:border-base-content/30'}`}>
              {f.label} <span className="opacity-60">Aa</span>
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-sm btn-primary w-full" disabled={!dirty || saving} onClick={onSave}>
        {saving ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />} Save theme
      </button>
      <p className="text-xs text-base-content/50">The theme applies to every page of your live site as soon as it is saved - no need to publish.</p>
    </div>
  );
}

/** The selected section's settings, drawn from its definition. */
function SettingsPanel({ def, props, categories, products, pages, onChange, onError, onClose }: {
  def: ComponentDefinition;
  props: SectionProps;
  categories: { id: number; name: string }[];
  products: Product[];
  pages: PageRow[];
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
        <Field key={key} name={key} field={field} value={props[key]} categories={categories} products={products} pages={pages} onChange={onChange} onError={onError} />
      ))}
    </div>
  );
}

function Field({ name, field, value, categories, products, pages, onChange, onError }: {
  name: string;
  field: FieldDefinition;
  value: SectionProps[string] | undefined;
  categories: { id: number; name: string }[];
  products: Product[];
  pages: PageRow[];
  onChange: (key: string, value: SectionProps[string]) => void;
  onError: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
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
    case 'page':
      return (
        <label className="block">{label}
          <select className="select select-sm select-bordered w-full" value={String(value ?? '')} onChange={(e) => onChange(name, e.target.value)}>
            <option value="">Home</option>
            {pages.filter((p) => !p.is_home).map((p) => <option key={p.id} value={p.slug}>{p.title}</option>)}
          </select>
        </label>
      );
    case 'categories':
    case 'products': {
      const chosen = Array.isArray(value) ? (value as number[]) : [];
      const options = field.type === 'categories' ? categories : products;
      const needle = search.trim().toLowerCase();
      const shown = options.filter((o) => !needle || o.name.toLowerCase().includes(needle)).slice(0, 60);
      return (
        <div>{label}
          <p className="text-xs text-base-content/50 mb-1">
            {field.type === 'categories' ? 'None ticked shows every category.' : `${chosen.length} chosen. None chosen shows dishes with photos.`}
          </p>
          {field.type === 'products' && (
            <input className="input input-xs input-bordered w-full mb-1" placeholder="Search dishes" value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {shown.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="checkbox checkbox-xs" checked={chosen.includes(o.id)}
                       onChange={(e) => onChange(name, e.target.checked ? [...chosen, o.id] : chosen.filter((id) => id !== o.id))} />
                <span className="truncate">{o.name}</span>
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
        try { onChange(name, await uploadPhoto(file)); } catch (err) { onError(apiErrorMessage(err, 'Could not upload the photo.')); } finally { setUploading(false); }
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
    case 'images': {
      const list = Array.isArray(value) ? (value as string[]) : [];
      const max = field.max ?? 12;
      const add = async (files: FileList) => {
        setUploading(true);
        try {
          const room = Array.from(files).slice(0, Math.max(0, max - list.length));
          const paths: string[] = [];
          for (const file of room) paths.push(await uploadPhoto(file));
          onChange(name, [...list, ...paths]);
        } catch (err) {
          onError(apiErrorMessage(err, 'Could not upload the photos.'));
        } finally {
          setUploading(false);
        }
      };
      return (
        <div>{label}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {list.map((path, i) => (
              <div key={path + i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={storageUrl(path) ?? ''} alt="" className="w-full aspect-square object-cover rounded-md" />
                <button className="absolute top-1 right-1 btn btn-xs btn-circle opacity-0 group-hover:opacity-100" onClick={() => onChange(name, list.filter((_, j) => j !== i))} aria-label="Remove photo"><X size={10} /></button>
              </div>
            ))}
          </div>
          {list.length < max && (
            <label className="btn btn-sm btn-outline w-full">
              {uploading ? <span className="loading loading-spinner loading-xs" /> : <Upload size={14} />} Add photos ({list.length}/{max})
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files && add(e.target.files)} />
            </label>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
