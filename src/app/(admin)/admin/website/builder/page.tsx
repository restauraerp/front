'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragMoveEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown, ArrowUp, Copy, ExternalLink, GripVertical, Plus, Redo2, Trash2, Undo2, Upload, X, Zap, Type, Save, Rocket, FilePlus,
  Monitor, Smartphone, Palette, FileText, LayoutTemplate, Globe, CheckCircle2, Sparkles, History, Home, Files, RotateCcw, PencilLine, BarChart3, Star,
} from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import type {
  ComponentDefinition, FieldDefinition, Section, SectionProps, SiteContext, SiteMenuData, SiteRestaurant, SiteReview, SiteReviewSummary, SiteSocialLink,
} from '@/lib/site/types';
import { storageUrl } from '@/lib/site/types';
import { DEFAULT_THEME, facesOf, type SiteTheme } from '@/lib/site/themes';
import { PALETTE_BY_KEY, colorsOf } from '@/lib/site/palettes';
import { familyCss, googleFontsUrl, type FontCatalog } from '@/lib/site/fonts';
import { ColourBrowser, FontBrowser, PaletteSwatch, StarterBrowser, type Starter } from './ThemeBrowsers';
import { Modal, useDialogs } from '@/components/ui/Dialogs';

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
 *
 * Drag and drop is dnd-kit throughout - mouse, touch (after a short press)
 * and keyboard:
 *   - the Sections list is sortable;
 *   - inside the preview, each section has a handle; the frame reports the
 *     move (site-preview-reorder) and this page applies it;
 *   - components drag from the Add panel onto the Sections list or the
 *     preview. A drag cannot cross into an iframe, so while one is under way
 *     the frame stops taking pointer events, the drop point is worked out
 *     from its [data-section-id] elements (same origin, so readable), and the
 *     frame is told where to draw the drop line.
 *
 * Everything is a draft - each page, adding and deleting pages, their order,
 * the theme, header and footer. Publish website sends the whole site live as
 * a new numbered version; History lists the versions, puts the site back to
 * one, or loads one into the editor. Confirmations are daisyUI dialogs
 * (useDialogs), never the browser's own.
 */

type PageRow = {
  id: number;
  /** Which standard page it is (menu, gallery...); null for the owner's own. */
  kind: string | null;
  title: string;
  slug: string;
  is_home: boolean;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  sections: Section[];
  /** On the live site (in the live version). */
  is_live: boolean;
  /** Differs from the live version - or is not on the live site at all. */
  has_unpublished_changes: boolean;
};

type SiteStatus = {
  live_version: number | null;
  latest_version: number | null;
  live_published_at: string | null;
  has_unpublished_changes: boolean;
};

type StandardPage = { kind: string; title: string; added: boolean };

type Version = {
  id: number;
  number: number;
  note: string | null;
  published_at: string;
  published_by: string | null;
  pages: string[];
  is_live: boolean;
};

/** What every page-list endpoint answers with. */
type Workspace = { site: SiteStatus; pages: PageRow[]; standard_pages: StandardPage[]; site_code?: string };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

type PageMeta = Pick<PageRow, 'title' | 'slug' | 'meta_title' | 'meta_description' | 'og_image'>;
type History = { past: Section[][]; future: Section[][] };
type Product = SiteMenuData['products'][number];

const newId = () => Math.random().toString(36).slice(2, 10);
const PALETTE_PREFIX = 'palette:';
const OUTLINE_END = 'outline-end';

/** Where the pointer is during a drag: where it started, moved by the drag. */
function pointerOf(e: DragMoveEvent | DragEndEvent): { x: number; y: number } | null {
  const start = e.activatorEvent as MouseEvent | TouchEvent | null;
  if (!start) return null;
  const point = 'touches' in start ? start.touches[0] ?? start.changedTouches[0] : start;
  return point ? { x: point.clientX + e.delta.x, y: point.clientY + e.delta.y } : null;
}
const metaOf = (p: PageRow): PageMeta => ({
  title: p.title, slug: p.slug, meta_title: p.meta_title ?? '', meta_description: p.meta_description ?? '', og_image: p.og_image ?? '',
});

export default function SiteBuilderPage() {
  const [defs, setDefs] = useState<Record<string, ComponentDefinition> | null>(null);
  const [fontCatalog, setFontCatalog] = useState<FontCatalog>({});
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
  const [reviewSummary, setReviewSummary] = useState<SiteReviewSummary | null>(null);
  const [social, setSocial] = useState<SiteSocialLink[]>([]);
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [savedTheme, setSavedTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [panel, setPanel] = useState<'page' | 'theme'>('page');
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const [leftTab, setLeftTab] = useState<'pages' | 'sections' | 'add'>('sections');
  const [site, setSite] = useState<SiteStatus | null>(null);
  const [standardPages, setStandardPages] = useState<StandardPage[]>([]);
  const [modal, setModal] = useState<'publish' | 'add-page' | 'versions' | null>(null);
  const [starters, setStarters] = useState<Starter[] | null>(null);
  const { confirm, dialog } = useDialogs();
  const [templates, setTemplates] = useState<Record<string, { label: string; description: string; sections: Section[] }> | null>(null);
  const [dragging, setDragging] = useState<{ kind: 'palette' | 'section'; label: string } | null>(null);
  const [marker, setMarker] = useState<number | null>(null);
  const previewBox = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'save' | 'publish' | 'theme' | 'pages' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  const current = pages.find((p) => p.id === currentId) ?? null;
  const metaDirty = current !== null && meta !== null && JSON.stringify(metaOf(current)) !== JSON.stringify(meta);
  const dirty = current !== null && (JSON.stringify(current.sections) !== JSON.stringify(sections) || metaDirty);
  const selected = sections.find((s) => s.id === selectedId) ?? null;
  const themeDirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);
  // Anything not yet live: unsaved edits here, or saved drafts.
  const unpublished = dirty || themeDirty || !!site?.has_unpublished_changes;

  const openPage = useCallback((page: PageRow) => {
    setCurrentId(page.id);
    setSections(page.sections);
    setMeta(metaOf(page));
    setHistory({ past: [], future: [] });
    setSelectedId(null);
  }, []);

  /** Takes in a page-list answer: the pages, where the site stands, what can be added. */
  const applyWorkspace = useCallback((w: Workspace) => {
    setPages(w.pages);
    setSite(w.site);
    setStandardPages(w.standard_pages ?? []);
    if (w.site_code) setSiteCode(w.site_code);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [components, list] = await Promise.all([fetchApi('/site-builder/components'), fetchApi('/site-pages')]);
        if (!active) return;
        setDefs(components.components);
        setFontCatalog(components.fonts ?? {});
        setTheme(components.theme);
        setSavedTheme(components.theme);
        applyWorkspace(list);
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
          const reviewList = (reviewRows?.data ?? reviewRows ?? []) as { author_name: string; rating: number; text: string; time: string | null; author_photo_url?: string | null; is_displayed: boolean | number }[];
          setReviews(reviewList.filter((r) => r.is_displayed).map((r) => ({ author: r.author_name, rating: Number(r.rating), text: r.text, time: r.time, photo: r.author_photo_url })));
          // The same overall rating visitors see: Google's when connected,
          // else worked out from every stored review.
          const rated = reviewList.filter((r) => r.rating);
          const google = await fetchApi('/site-builder/google').catch(() => null);
          if (!active) return;
          setReviewSummary(google?.average_rating != null
            ? { rating: Math.round(google.average_rating * 10) / 10, total: google.total_reviews ?? 0, write_review_url: null, google_url: null }
            : { rating: rated.length ? Math.round((rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length) * 10) / 10 : null, total: rated.length, write_review_url: null, google_url: null });
          const linkList = (linkRows?.data ?? linkRows ?? []) as { platform: string; url: string; is_active: boolean | number }[];
          setSocial(linkList.filter((l) => l.is_active && /^https?:\/\//i.test(l.url ?? '')).map((l) => ({ platform: (l.platform ?? '').toLowerCase(), url: l.url })));
        }
      } catch (err) {
        if (active) setError(apiErrorMessage(err, 'Could not load the site builder.'));
      }
    })();
    return () => { active = false; };
  }, [openPage, applyWorkspace]);

  const siteBase = siteCode ? `/${siteCode}/site` : '';
  const ctx: SiteContext | null = useMemo(() => restaurant && ({
    restaurant, menu, reviews, reviewSummary, social, basePath: siteBase, orderUrl: `/order/${siteCode}`,
  }), [restaurant, menu, reviews, reviewSummary, social, siteBase, siteCode]);

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
        fonts: facesOf(theme, fontCatalog),
        sections,
        selectedId,
        // The draft site's navigation - what it will be once published.
        pages: [...pages].sort((a, b) => Number(b.is_home) - Number(a.is_home)).map((p) => ({ slug: p.is_home ? '' : p.slug, title: p.title, kind: p.kind })),
        current: current?.is_home ? '' : current?.slug ?? '',
        labels: Object.fromEntries(Object.entries(defs).map(([k, d]) => [k, d.label])),
        marker,
      },
    }, window.location.origin);
  }, [previewReady, ctx, defs, theme, fontCatalog, sections, selectedId, pages, marker, current]);

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

  /** Adds a component at `index`, or below the selected section (else at the end). */
  const addSection = (type: string, index?: number) => {
    const section: Section = { id: newId(), type, props: defaultsFor(type) };
    const at = index ?? (selected ? sections.indexOf(selected) + 1 : sections.length);
    change([...sections.slice(0, at), section, ...sections.slice(at)]);
    setSelectedId(section.id);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sections.length || from === to) return;
    change(arrayMove(sections, from, to));
  };

  // A section dragged inside the preview. Re-subscribed every render (no
  // dependency list) so it always applies the move to the current sections.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'site-preview-reorder') return;
      move(Number(e.data.from), Number(e.data.to));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  });

  // ---- Drag and drop ----------------------------------------------------------
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * Where in the page a component dropped at this point would go, read from
   * the preview frame's section elements; null when the point is not over it.
   * Also scrolls the frame when the point nears its top or bottom edge.
   */
  const dropIndexAt = (point: { x: number; y: number }): number | null => {
    const iframe = frame.current;
    const box = previewBox.current?.getBoundingClientRect();
    if (!iframe || !box || point.x < box.left || point.x > box.right || point.y < box.top || point.y > box.bottom) return null;

    const frameRect = iframe.getBoundingClientRect();
    const y = point.y - frameRect.top;
    const win = iframe.contentWindow;
    if (win) {
      if (y < 60) win.scrollBy(0, -24);
      else if (y > frameRect.height - 60) win.scrollBy(0, 24);
    }

    const els = Array.from(iframe.contentDocument?.querySelectorAll<HTMLElement>('[data-section-id]') ?? []);
    const index = els.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    return index === -1 ? els.length : index;
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    const id = String(active.id);
    const type = id.startsWith(PALETTE_PREFIX) ? id.slice(PALETTE_PREFIX.length) : sections.find((s) => s.id === id)?.type;
    setDragging({ kind: id.startsWith(PALETTE_PREFIX) ? 'palette' : 'section', label: defs?.[type ?? '']?.label ?? 'Section' });
  };

  const onDragMove = (e: DragMoveEvent) => {
    if (!String(e.active.id).startsWith(PALETTE_PREFIX)) return;
    const point = pointerOf(e);
    setMarker(point ? dropIndexAt(point) : null);
  };

  const endDrag = () => { setDragging(null); setMarker(null); };

  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;

    if (id.startsWith(PALETTE_PREFIX)) {
      const type = id.slice(PALETTE_PREFIX.length);
      const point = pointerOf(e);
      const intoPreview = point ? dropIndexAt(point) : null;

      if (intoPreview !== null) addSection(type, intoPreview);
      else if (overId === OUTLINE_END) addSection(type, sections.length);
      else if (overId) {
        const at = sections.findIndex((s) => s.id === overId);
        if (at >= 0) addSection(type, at);
      }
      if (intoPreview !== null || overId) setLeftTab('sections');
    } else if (overId && overId !== id && overId !== OUTLINE_END) {
      move(sections.findIndex((s) => s.id === id), sections.findIndex((s) => s.id === overId));
    }
    endDrag();
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
    setSite(res.site);
    // The server cleans what it saves (ids, defaults) - keep the editor in step.
    setSections(saved.sections);
    setMeta(metaOf(saved));
    return saved;
  };

  const handleSave = async () => {
    setBusy('save'); setError(null); setNotice(null);
    try {
      await save();
      setNotice('Draft saved. Visitors see the live version until you publish the website.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the page.'));
    } finally {
      setBusy(null);
    }
  };

  const persistTheme = async () => {
    const res = await fetchApi('/site-builder/theme', { method: 'PUT', body: JSON.stringify(theme) });
    setSavedTheme(res.theme);
    setSite(res.site);
  };

  const saveTheme = async () => {
    setBusy('theme'); setError(null); setNotice(null);
    try {
      await persistTheme();
      setNotice('Site settings saved as a draft. They go live when you publish the website.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the theme.'));
    } finally {
      setBusy(null);
    }
  };

  /** Publish website: saves what is open, then sends the whole site live as a new version. */
  const publishSite = async (note: string) => {
    setBusy('publish'); setError(null); setNotice(null);
    try {
      if (dirty) await save();
      if (themeDirty) await persistTheme();
      const res = await fetchApi('/site-builder/publish', { method: 'POST', body: JSON.stringify({ note: note.trim() || null }) });
      applyWorkspace(res);
      setModal(null);
      setNotice(`Version ${res.version.number} is live - your website is updated.`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not publish the website.'));
    } finally {
      setBusy(null);
    }
  };

  /** Replaces this page's sections with a ready-made layout - undoable, and nothing is public until published. */
  const openTemplates = async () => {
    setError(null);
    try {
      const res = await fetchApi('/site-builder/templates');
      setTemplates(res.templates);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the templates.'));
    }
  };

  const applyTemplate = async (key: string) => {
    const template = templates?.[key];
    if (!template) return;
    if (sections.length > 0 && !(await confirm({
      title: `Use the "${template.label}" layout?`,
      message: 'It replaces this page\'s sections. You can undo it, and nothing changes on your website until you publish.',
      action: 'Replace sections',
      tone: 'btn-primary',
    }))) return;
    change(template.sections.map((section) => ({ ...section, id: newId(), props: { ...section.props } })));
    setSelectedId(null);
    setTemplates(null);
    setNotice(`"${template.label}" applied. Change anything you like, then publish the website.`);
  };

  /**
   * Rebuilds a standard page from the restaurant's data as it is now -
   * dishes, photos, reviews, branches. Undoable like a template; nothing is
   * public until published. Fills the search description too, if it is empty.
   */
  const rebuildFromData = async () => {
    if (!current?.kind) return;
    if (sections.length > 0 && !(await confirm({
      title: 'Rebuild this page from your data?',
      message: 'It is put together again from your menu, photos, reviews and branches, replacing the current sections. You can undo it.',
      action: 'Rebuild page',
      tone: 'btn-primary',
    }))) return;
    setError(null);
    try {
      const draft = await fetchApi(`/site-builder/smart-draft?kind=${encodeURIComponent(current.kind)}`);
      change((draft.sections as Section[]).map((section) => ({ ...section, id: newId(), props: { ...section.props } })));
      if (meta && !meta.meta_description && draft.meta_description) setMeta({ ...meta, meta_description: draft.meta_description });
      setSelectedId(null);
      setNotice('Page rebuilt from your restaurant\'s data. Change anything you like, then publish the website.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not rebuild the page.'));
    }
  };

  /** Unsaved edits on the open page would be lost by what comes next: ask first. */
  const okToLeave = async () => !dirty || confirm({
    title: 'Discard unsaved changes?',
    message: `"${current?.title}" has changes that are not saved.`,
    action: 'Discard changes',
  });

  /** Adds a standard page (by kind) or a blank one (by title), and opens it. */
  const addPage = async (body: { kind: string } | { title: string }) => {
    if (!(await okToLeave())) return;
    setBusy('pages'); setError(null);
    try {
      const res = await fetchApi('/site-pages', { method: 'POST', body: JSON.stringify(body) });
      const list: Workspace = await fetchApi('/site-pages');
      applyWorkspace(list);
      openPage(res.page);
      setModal(null);
      setLeftTab('sections');
      setNotice(`"${res.page.title}" added as a draft. It appears on your website when you publish.`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add the page.'));
    } finally {
      setBusy(null);
    }
  };

  const addMissingPages = async () => {
    setBusy('pages'); setError(null);
    try {
      const res = await fetchApi('/site-builder/standard-pages', { method: 'POST' });
      applyWorkspace(res);
      setModal(null);
      setLeftTab('pages');
      setNotice(res.added.length ? `Added ${res.added.join(', ')}. They appear on your website when you publish.` : 'Your site already has every standard page.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add the pages.'));
    } finally {
      setBusy(null);
    }
  };

  const deletePage = async (page: PageRow) => {
    if (page.is_home) return;
    if (!(await confirm({
      title: `Delete the "${page.title}" page?`,
      message: page.is_live
        ? 'It stays on your live website until you next publish, and an earlier version can always bring it back.'
        : 'It has never been published, so this cannot be undone.',
      action: 'Delete page',
    }))) return;
    setError(null);
    try {
      const res: Workspace = await fetchApi(`/site-pages/${page.id}`, { method: 'DELETE' });
      applyWorkspace(res);
      if (page.id === currentId) {
        const home = res.pages.find((p) => p.is_home) ?? res.pages[0];
        if (home) openPage(home);
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete the page.'));
    }
  };

  /** Moves a page up or down the site's navigation. */
  const movePage = async (index: number, to: number) => {
    if (to < 0 || to >= pages.length) return;
    const ids = arrayMove(pages, index, to).map((p) => p.id);
    setPages(arrayMove(pages, index, to));
    try {
      applyWorkspace(await fetchApi('/site-builder/page-order', { method: 'PUT', body: JSON.stringify({ ids }) }));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the page order.'));
    }
  };

  const switchPage = async (id: number) => {
    if (id === currentId || !(await okToLeave())) return;
    const page = pages.find((p) => p.id === id);
    if (page) openPage(page);
  };

  const openStarters = async () => {
    setError(null);
    try {
      setStarters((await fetchApi('/site-builder/starters')).starters);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the starter sites.'));
    }
  };

  /** Replaces the whole draft site with a starter. The live site waits for Publish website. */
  const applyStarter = async (starter: Starter) => {
    if (!(await confirm({
      title: `Start from "${starter.name}"?`,
      message: 'Every page, the colours and fonts in the editor are replaced. Changes you have not published are lost. Your live website does not change until you publish, and earlier versions stay in History.',
      action: 'Replace my draft site',
    }))) return;
    setBusy('pages'); setError(null);
    try {
      const res = await fetchApi(`/site-builder/starters/${starter.key}`, { method: 'POST' });
      applyWorkspace(res);
      setTheme(res.theme);
      setSavedTheme(res.theme);
      const home = (res.pages as PageRow[]).find((p) => p.is_home) ?? res.pages[0];
      if (home) openPage(home);
      setStarters(null);
      setNotice(`"${starter.name}" is in the editor with your menu and photos. Change anything you like, then publish the website.`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not apply the starter site.'));
    } finally {
      setBusy(null);
    }
  };

  /** Puts the live site back to (or forward to) a version. Drafts are untouched. */
  const makeLive = async (version: Version) => {
    if (!(await confirm({
      title: `Make version ${version.number} live?`,
      message: 'Visitors see the website exactly as it was in that version, straight away. What you are editing is not changed.',
      action: `Make version ${version.number} live`,
      tone: 'btn-warning',
    }))) return false;
    try {
      applyWorkspace(await fetchApi(`/site-builder/versions/${version.id}/make-live`, { method: 'POST' }));
      setNotice(`Version ${version.number} is live.`);
      return true;
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the live version.'));
      return false;
    }
  };

  /** Replaces everything in the editor with a version, to work from. */
  const editVersion = async (version: Version) => {
    if (!(await confirm({
      title: `Open version ${version.number} in the editor?`,
      message: 'Every page, the theme, header and footer in the editor are replaced with that version. Changes you have not published are lost. Your live website does not change until you publish.',
      action: 'Replace and open',
    }))) return false;
    try {
      const res = await fetchApi(`/site-builder/versions/${version.id}/edit`, { method: 'POST' });
      applyWorkspace(res);
      setTheme(res.theme);
      setSavedTheme(res.theme);
      const home = (res.pages as PageRow[]).find((p) => p.is_home) ?? res.pages[0];
      if (home) openPage(home);
      setNotice(`Version ${version.number} is in the editor. Change what you need, then publish the website.`);
      return true;
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not open that version.'));
      return false;
    }
  };

  if (error && !defs) return <div className="alert alert-error">{error}</div>;
  if (!defs || !ctx || !meta) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>;

  // The live page; a page not published yet has no live address, so home.
  const viewUrl = current?.is_live && !current.is_home ? `${siteBase}/${current.slug}` : siteBase;
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
            <option key={p.id} value={p.id}>{p.title}{p.is_home ? ' (home)' : ''}{p.is_live ? '' : ' - new'}</option>
          ))}
        </select>
        <button className="btn btn-sm btn-ghost" onClick={() => setModal('add-page')}><FilePlus size={14} /> Page</button>
        <div className="flex-1" />
        <div className="join">
          <button className={`btn btn-sm join-item ${device === 'desktop' ? 'btn-active' : ''}`} onClick={() => setDevice('desktop')} title="Desktop"><Monitor size={14} /></button>
          <button className={`btn btn-sm join-item ${device === 'phone' ? 'btn-active' : ''}`} onClick={() => setDevice('phone')} title="Phone"><Smartphone size={14} /></button>
        </div>
        <button className="btn btn-sm btn-ghost btn-square" onClick={undo} disabled={!history.past.length} title="Undo"><Undo2 size={16} /></button>
        <button className="btn btn-sm btn-ghost btn-square" onClick={redo} disabled={!history.future.length} title="Redo"><Redo2 size={16} /></button>
        <button className="btn btn-sm btn-ghost" onClick={openStarters}><Sparkles size={14} /> Starter sites</button>
        <button className="btn btn-sm btn-ghost" onClick={() => setModal('versions')}><History size={14} /> History</button>
        <a className="btn btn-sm btn-ghost" href={viewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> View live</a>
        <button className="btn btn-sm btn-outline" onClick={handleSave} disabled={!dirty || busy !== null}>
          {busy === 'save' ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />} Save draft
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => setModal('publish')} disabled={busy !== null || !unpublished}>
          {busy === 'publish' ? <span className="loading loading-spinner loading-xs" /> : <Rocket size={14} />} Publish website
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {site?.live_version ? (
          <span className="badge badge-success badge-sm gap-1"><CheckCircle2 size={10} /> Live: version {site.live_version}</span>
        ) : (
          <span className="badge badge-ghost badge-sm">Not published yet - visitors see a starter site</span>
        )}
        {site?.live_published_at && <span className="text-base-content/50">published {when(site.live_published_at)}</span>}
        {site?.live_version && site.latest_version && site.live_version < site.latest_version && (
          <span className="text-warning">An earlier version is live (latest is {site.latest_version}).</span>
        )}
        {unpublished && (
          <span className="text-warning">
            {dirty ? 'Unsaved changes on this page.' : 'Changes not published yet - visitors see the live version.'}
          </span>
        )}
      </div>

      {error && (
        <div role="alert" className="alert alert-error text-sm py-2">
          <span className="flex-1">{error}</span>
          <button className="btn btn-xs btn-ghost" onClick={() => setError(null)} aria-label="Dismiss"><X size={12} /></button>
        </div>
      )}
      {notice && (
        <div role="status" className="alert alert-success text-sm py-2">
          <span className="flex-1">{notice}</span>
          <button className="btn btn-xs btn-ghost" onClick={() => setNotice(null)} aria-label="Dismiss"><X size={12} /></button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd} onDragCancel={endDrag}>
      <div className="grid grid-cols-1 xl:grid-cols-[250px_1fr_310px] gap-3 items-start">
        {/* Sections list, and the components to add */}
        <aside className="bg-base-100 border border-base-200 rounded-xl p-3 xl:sticky xl:top-20 max-h-[80vh] overflow-y-auto">
          <div className="join w-full mb-3">
            <button className={`btn btn-sm join-item flex-1 px-1 ${leftTab === 'pages' ? 'btn-active' : ''}`} onClick={() => setLeftTab('pages')}><Files size={12} /> Pages</button>
            <button className={`btn btn-sm join-item flex-1 px-1 ${leftTab === 'sections' ? 'btn-active' : ''}`} onClick={() => setLeftTab('sections')}>Sections</button>
            <button className={`btn btn-sm join-item flex-1 px-1 ${leftTab === 'add' ? 'btn-active' : ''}`} onClick={() => setLeftTab('add')}><Plus size={12} /> Add</button>
          </div>

          {leftTab === 'pages' ? (
            <div className="space-y-2">
              <p className="text-xs text-base-content/60">Your website&apos;s pages, in menu-bar order. Click one to edit it.</p>
              <ol className="space-y-1">
                {pages.map((p, i) => (
                  <li
                    key={p.id}
                    onClick={() => switchPage(p.id)}
                    className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm cursor-pointer ${p.id === currentId ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-base-200'}`}
                  >
                    {p.is_home ? <Home size={12} className="text-base-content/50 shrink-0" /> : <FileText size={12} className="text-base-content/40 shrink-0" />}
                    <span className="flex-1 truncate">{p.title}</span>
                    {!p.is_live ? <span className="badge badge-info badge-xs">new</span> : p.has_unpublished_changes && <span className="badge badge-warning badge-xs">changed</span>}
                    <span className="hidden group-hover:flex items-center">
                      <button className="btn btn-ghost btn-xs btn-square" onClick={(e) => { e.stopPropagation(); movePage(i, i - 1); }} disabled={i === 0} aria-label="Move up"><ArrowUp size={12} /></button>
                      <button className="btn btn-ghost btn-xs btn-square" onClick={(e) => { e.stopPropagation(); movePage(i, i + 1); }} disabled={i === pages.length - 1} aria-label="Move down"><ArrowDown size={12} /></button>
                      {!p.is_home && <button className="btn btn-ghost btn-xs btn-square text-error" onClick={(e) => { e.stopPropagation(); deletePage(p); }} aria-label={`Delete ${p.title}`}><Trash2 size={12} /></button>}
                    </span>
                  </li>
                ))}
              </ol>
              <button className="btn btn-sm btn-outline w-full" onClick={() => setModal('add-page')}><FilePlus size={14} /> Add a page</button>
            </div>
          ) : leftTab === 'sections' ? (
            <>
              {sections.length === 0 && <p className="text-xs text-base-content/60 py-4 text-center">Empty page. Open Add and drag a component in.</p>}
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-1">
                  {sections.map((s, i) => (
                    <OutlineItem
                      key={s.id}
                      section={s}
                      def={defs[s.type]}
                      selected={selectedId === s.id}
                      first={i === 0}
                      last={i === sections.length - 1}
                      onSelect={() => setSelectedId(s.id)}
                      onUp={() => move(i, i - 1)}
                      onDown={() => move(i, i + 1)}
                      onDuplicate={() => duplicate(i)}
                      onRemove={() => remove(i)}
                    />
                  ))}
                </ol>
              </SortableContext>
              <OutlineEnd active={dragging?.kind === 'palette'} />
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-base-content/60">Drag a component onto the page or the Sections list - or click to add it below the selected section.</p>
              {groups.map(({ kind, title, hint, Icon }) => (
                <div key={kind}>
                  <div className="flex items-center gap-1 font-semibold text-xs uppercase tracking-wide text-base-content/60"><Icon size={12} /> {title}</div>
                  <p className="text-[11px] text-base-content/50 mb-1">{hint}</p>
                  <div className="space-y-1">
                    {Object.entries(defs).filter(([, d]) => d.kind === kind).map(([type, d]) => (
                      <PaletteItem key={type} type={type} def={d} onAdd={() => { addSection(type); setLeftTab('sections'); }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Preview */}
        <div
          ref={previewBox}
          className={`rounded-xl border bg-base-200/60 p-2 flex justify-center ${dragging?.kind === 'palette' ? 'border-primary border-dashed' : 'border-base-200'}`}
        >
          <iframe
            ref={frame}
            src={`/${encodeURIComponent(siteCode)}/site-preview`}
            title="Site preview"
            className="bg-white rounded-lg shadow-sm transition-all"
            // While something is being dragged here the frame must not swallow
            // the pointer, or the drag would stop at its edge.
            style={{ width: device === 'phone' ? 390 : '100%', height: '75vh', border: 0, pointerEvents: dragging ? 'none' : 'auto' }}
          />
        </div>

        {/* Settings */}
        <aside className="bg-base-100 border border-base-200 rounded-xl p-4 xl:sticky xl:top-20 max-h-[80vh] overflow-y-auto">
          {selected && defs[selected.type] ? (
            <SettingsPanel
              def={defs[selected.type]}
              props={selected.props}
              categories={menu?.categories ?? []}
              locations={menu?.locations ?? []}
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
                <button className={`btn btn-sm join-item flex-1 ${panel === 'theme' ? 'btn-active' : ''}`} onClick={() => setPanel('theme')}><Palette size={14} /> Site</button>
              </div>
              {panel === 'page' ? (
                <>
                  <div className={`grid gap-2 ${current?.kind ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {current?.kind && <button className="btn btn-sm btn-outline" onClick={rebuildFromData} title="Builds the page again from your menu, photos, reviews and branches"><Sparkles size={14} /> From my data</button>}
                    <button className="btn btn-sm btn-outline" onClick={openTemplates}><LayoutTemplate size={14} /> Template</button>
                  </div>
                  <PagePanel meta={meta} isHome={!!current?.is_home} siteBase={siteBase} onChange={setMeta} onError={setError} />
                  {current && !current.is_home && (
                    <button className="btn btn-sm btn-ghost text-error w-full" onClick={() => deletePage(current)}><Trash2 size={14} /> Delete this page</button>
                  )}
                </>
              ) : (
                <>
                  <ThemePanel theme={theme} catalog={fontCatalog} dirty={themeDirty} saving={busy === 'theme'} onChange={setTheme} onSave={saveTheme} />
                  <DomainPanel onError={setError} />
                  <GooglePanel onError={setError} onSaved={setNotice} />
                  <IntegrationsPanel onError={setError} onSaved={setNotice} />
                </>
              )}
              <p className="text-xs text-base-content/50">Click a section in the preview or the list to change it.</p>
            </div>
          )}
        </aside>
      </div>

      {templates && (
        <Modal onClose={() => setTemplates(null)} wide>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Start from a template</h2>
              <button className="btn btn-sm btn-ghost btn-square" onClick={() => setTemplates(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <p className="text-sm text-base-content/60">Each layout fills itself with your menu, branches and details. Replaces this page&apos;s sections - you can undo, and nothing changes on your site until you publish.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(templates).map(([key, t]) => (
                <button key={key} className="text-left rounded-xl border border-base-300 p-4 hover:border-primary hover:bg-primary/5" onClick={() => applyTemplate(key)}>
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-xs text-base-content/60 mt-1">{t.description}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.sections.map((sec) => <span key={sec.id} className="badge badge-ghost badge-xs">{defs[sec.type]?.label ?? sec.type}</span>)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {modal === 'publish' && (
        <PublishModal
          pages={pages}
          site={site}
          themeChanged={themeDirty}
          busy={busy === 'publish'}
          onPublish={publishSite}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'add-page' && (
        <AddPageModal
          standardPages={standardPages}
          busy={busy === 'pages'}
          onAdd={addPage}
          onAddMissing={addMissingPages}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'versions' && (
        <VersionsModal onMakeLive={makeLive} onEdit={async (v) => { if (await editVersion(v)) setModal(null); }} onError={setError} onClose={() => setModal(null)} />
      )}
      {starters && (
        <StarterBrowser
          starters={starters}
          catalog={fontCatalog}
          labels={Object.fromEntries(Object.entries(defs).map(([k, d]) => [k, d.label]))}
          busy={busy === 'pages'}
          onPick={applyStarter}
          onClose={() => setStarters(null)}
        />
      )}
      {dialog}

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="badge badge-primary badge-lg gap-1 shadow-lg cursor-grabbing">
            <GripVertical size={12} /> {dragging.label}
          </div>
        )}
      </DragOverlay>
      </DndContext>
    </div>
  );
}

/** Publish website: what goes live, an optional note, and the button. */
function PublishModal({ pages, site, themeChanged, busy, onPublish, onClose }: {
  pages: PageRow[];
  site: SiteStatus | null;
  themeChanged: boolean;
  busy: boolean;
  onPublish: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const added = pages.filter((p) => !p.is_live);
  const changed = pages.filter((p) => p.is_live && p.has_unpublished_changes);
  const next = (site?.latest_version ?? 0) + 1;

  return (
    <Modal onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onPublish(note); }}>
        <h3 className="font-semibold text-lg flex items-center gap-2"><Rocket size={18} /> Publish website</h3>
        <p className="text-sm text-base-content/70">
          Everything in the editor goes live together as <b>version {next}</b>
          {site?.live_version ? `, replacing version ${site.live_version}` : ''}. You can put an earlier version back at any time from History.
        </p>
        <ul className="text-sm space-y-1">
          {added.map((p) => <li key={p.id} className="flex items-center gap-2"><span className="badge badge-info badge-xs">new</span> {p.title}</li>)}
          {changed.map((p) => <li key={p.id} className="flex items-center gap-2"><span className="badge badge-warning badge-xs">changed</span> {p.title}</li>)}
          {themeChanged && <li className="flex items-center gap-2"><span className="badge badge-warning badge-xs">changed</span> Theme, header or footer</li>}
          {added.length === 0 && changed.length === 0 && !themeChanged && (
            <li className="text-base-content/60">Page order, deleted pages or saved site settings.</li>
          )}
        </ul>
        <label className="block">
          <span className="label-text text-xs font-medium mb-1 block">Note for this version (optional)</span>
          <input className="input input-bordered w-full" maxLength={200} placeholder="e.g. New Ramadan menu" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-sm" /> : <Rocket size={16} />} Publish version {next}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Add a page: a standard one, drafted from the restaurant's data, or a blank one. */
function AddPageModal({ standardPages, busy, onAdd, onAddMissing, onClose }: {
  standardPages: StandardPage[];
  busy: boolean;
  onAdd: (body: { kind: string } | { title: string }) => void;
  onAddMissing: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const missing = standardPages.filter((p) => !p.added);

  return (
    <Modal onClose={onClose} wide>
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Add a page</h3>
        {missing.length > 0 ? (
          <>
            <p className="text-sm text-base-content/70">Standard restaurant pages, filled in from your menu, photos, branches and details. Change anything after.</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {missing.map((p) => (
                <button key={p.kind} className="text-left rounded-xl border border-base-300 p-3 hover:border-primary hover:bg-primary/5 disabled:opacity-50" disabled={busy} onClick={() => onAdd({ kind: p.kind })}>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-base-content/60">{PAGE_HINTS[p.kind] ?? ''}</div>
                </button>
              ))}
            </div>
            {missing.length > 1 && (
              <button className="btn btn-sm btn-outline" disabled={busy} onClick={onAddMissing}>
                {busy ? <span className="loading loading-spinner loading-xs" /> : <Files size={14} />} Add all {missing.length}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-base-content/70">Your site has every standard page.</p>
        )}
        <form className="border-t border-base-200 pt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) onAdd({ title: title.trim() }); }}>
          <span className="label-text text-xs font-medium block">Or a blank page of your own</span>
          <div className="join w-full">
            <input className="input input-bordered join-item w-full" maxLength={120} placeholder="Page name, e.g. Catering" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button type="submit" className="btn btn-primary join-item" disabled={busy || !title.trim()}>Add</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

const PAGE_HINTS: Record<string, string> = {
  menu: 'Your full menu by category.',
  order: 'Online ordering inside your website.',
  reservations: 'A table booking form.',
  about: 'Your story, with a photo.',
  gallery: 'A grid of photos.',
  locations: 'Your branches, with directions.',
  contact: 'Phone, email, address and social links.',
};

/** Every published version: which is live, put one back, or open one in the editor. */
function VersionsModal({ onMakeLive, onEdit, onError, onClose }: {
  onMakeLive: (v: Version) => Promise<boolean>;
  onEdit: (v: Version) => void;
  onError: (message: string) => void;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<Version[] | null>(null);

  const load = useCallback(() => {
    fetchApi('/site-builder/versions')
      .then((res) => setVersions(res.versions))
      .catch((err) => { onError(apiErrorMessage(err, 'Could not load the versions.')); setVersions([]); });
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  return (
    <Modal onClose={onClose} wide>
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2"><History size={18} /> Website versions</h3>
        <p className="text-sm text-base-content/70">Each time you publish, the whole website is kept as a version. Put an earlier one back live, or open one in the editor to work from.</p>
        {versions === null ? (
          <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-base-content/60 py-4 text-center">Nothing published yet. Publish the website to create version 1.</p>
        ) : (
          <ul className="divide-y divide-base-200">
            {versions.map((v) => (
              <li key={v.id} className="py-3 flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-48">
                  <div className="font-medium flex items-center gap-2">
                    Version {v.number}
                    {v.is_live && <span className="badge badge-success badge-sm">live</span>}
                  </div>
                  {v.note && <div className="text-sm">{v.note}</div>}
                  <div className="text-xs text-base-content/60">
                    {when(v.published_at)}{v.published_by ? ` by ${v.published_by}` : ''} · {v.pages.length} page{v.pages.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!v.is_live && (
                    <button className="btn btn-xs btn-outline" onClick={async () => { if (await onMakeLive(v)) load(); }}><RotateCcw size={12} /> Make live</button>
                  )}
                  <button className="btn btn-xs btn-ghost" onClick={() => onEdit(v)}><PencilLine size={12} /> Open in editor</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** One row of the Sections list: sortable by its handle, with the usual actions. */
function OutlineItem({ section, def, selected, first, last, onSelect, onUp, onDown, onDuplicate, onRemove }: {
  section: Section;
  def: ComponentDefinition | undefined;
  selected: boolean;
  first: boolean;
  last: boolean;
  onSelect: () => void;
  onUp: () => void;
  onDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: section.id });
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className={`group flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-sm cursor-pointer bg-base-100 ${isDragging ? 'opacity-40' : ''} ${selected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-base-200'} ${isOver ? 'ring-1 ring-primary/50' : ''}`}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="btn btn-ghost btn-xs btn-square cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Drag ${def?.label ?? section.type} to move it`}
      >
        <GripVertical size={14} className="text-base-content/40" />
      </button>
      {def?.kind === 'live' ? <Zap size={12} className="text-warning shrink-0" /> : <Type size={12} className="text-base-content/40 shrink-0" />}
      <span className="flex-1 truncate">{def?.label ?? section.type}</span>
      <span className="hidden group-hover:flex items-center">
        <button className="btn btn-ghost btn-xs btn-square" onClick={stop(onUp)} disabled={first} aria-label="Move up"><ArrowUp size={12} /></button>
        <button className="btn btn-ghost btn-xs btn-square" onClick={stop(onDown)} disabled={last} aria-label="Move down"><ArrowDown size={12} /></button>
        <button className="btn btn-ghost btn-xs btn-square" onClick={stop(onDuplicate)} aria-label="Duplicate"><Copy size={12} /></button>
        <button className="btn btn-ghost btn-xs btn-square text-error" onClick={stop(onRemove)} aria-label="Delete"><Trash2 size={12} /></button>
      </span>
    </li>
  );
}

/** The drop zone under the Sections list: a component dropped here goes last. */
function OutlineEnd({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: OUTLINE_END });
  return (
    <div
      ref={setNodeRef}
      className={`mt-2 rounded-lg border border-dashed text-center text-xs py-3 transition-colors ${active ? (isOver ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 text-base-content/50') : 'hidden'}`}
    >
      Drop here to add at the end
    </div>
  );
}

/** A component in the Add panel: drag it onto the page, or click to add it. */
function PaletteItem({ type, def, onAdd }: { type: string; def: ComponentDefinition; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${PALETTE_PREFIX}${type}` });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onAdd}
      className={`flex items-start gap-2 rounded-lg border border-base-300 p-2 cursor-grab active:cursor-grabbing hover:border-primary hover:bg-primary/5 select-none ${isDragging ? 'opacity-40' : ''}`}
      title={def.description}
    >
      <GripVertical size={14} className="text-base-content/30 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium">{def.label}</div>
        <div className="text-[11px] text-base-content/60 line-clamp-2">{def.description}</div>
      </div>
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

type GoogleStatus = {
  available: boolean;
  connected: boolean;
  google_email: string | null;
  location: string | null;
  location_title: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  synced_at: string | null;
  last_error: string | null;
};

/**
 * Google Business Profile: connect (Google's own sign-in, then back here),
 * pick which profile, and its reviews and rating keep themselves up to date.
 */
function GooglePanel({ onError, onSaved }: { onError: (message: string) => void; onSaved: (message: string) => void }) {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [locations, setLocations] = useState<{ location: string; title: string; address: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useDialogs();

  const loadLocations = useCallback(async () => {
    try {
      setLocations((await fetchApi('/site-builder/google/locations')).locations);
    } catch (err) {
      onError(apiErrorMessage(err, 'Could not read your Google profiles.'));
    }
  }, [onError]);

  useEffect(() => {
    let active = true;
    fetchApi('/site-builder/google').then((res: GoogleStatus) => {
      if (!active) return;
      setStatus(res);
      // Just back from Google's sign-in: say how it went, then pick a profile.
      const result = new URLSearchParams(window.location.search).get('google');
      if (result) {
        window.history.replaceState(null, '', window.location.pathname);
        if (result === 'connected') { onSaved('Google connected. Choose which profile your website shows reviews from.'); if (!res.location) loadLocations(); }
        else if (result === 'cancelled') onError('Connecting Google was cancelled.');
        else onError('Google could not be connected. Please try again.');
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [loadLocations, onError, onSaved]);

  if (!status) return null;

  const run = async (work: () => Promise<GoogleStatus>, done: string) => {
    setBusy(true);
    try { setStatus(await work()); onSaved(done); } catch (err) { onError(apiErrorMessage(err, 'Google did not answer. Please try again.')); } finally { setBusy(false); }
  };

  const connect = async () => {
    setBusy(true);
    try { window.location.href = (await fetchApi('/site-builder/google/connect', { method: 'POST' })).url; } catch (err) { onError(apiErrorMessage(err, 'Could not start connecting Google.')); setBusy(false); }
  };

  const disconnect = async () => {
    if (!(await confirm({ title: 'Disconnect Google?', message: 'New reviews stop coming in. Reviews already here stay, to hide or delete in Website > Reviews.', action: 'Disconnect' }))) return;
    run(() => fetchApi('/site-builder/google', { method: 'DELETE' }), 'Google disconnected.');
  };

  return (
    <div className="space-y-2 border-t border-base-200 pt-4">
      {dialog}
      <span className="label-text text-xs font-medium flex items-center gap-1"><Star size={12} /> Google reviews</span>
      {!status.connected ? (
        <>
          <p className="text-xs text-base-content/60">Connect your Google Business Profile and your reviews and star rating come in by themselves, every hour.</p>
          <button className="btn btn-sm btn-outline w-full" disabled={busy || !status.available} onClick={connect}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : <Globe size={14} />} Connect Google Business Profile
          </button>
          {!status.available && <p className="text-[11px] text-warning">Not available on this server yet.</p>}
        </>
      ) : (
        <>
          <p className="text-xs text-base-content/70">Connected as <b>{status.google_email ?? 'your Google account'}</b>.</p>
          {status.location ? (
            <div className="rounded-lg bg-base-200 p-2 text-xs space-y-1">
              <div className="font-medium">{status.location_title}</div>
              {status.average_rating != null && <div>{status.average_rating.toFixed(1)} ★ from {status.total_reviews ?? 0} reviews</div>}
              {status.synced_at && <div className="text-base-content/60">Updated {when(status.synced_at)}</div>}
              {status.last_error && <div className="text-error">{status.last_error}</div>}
            </div>
          ) : locations === null ? (
            <button className="btn btn-xs btn-primary" onClick={loadLocations}>Choose a profile</button>
          ) : (
            <ul className="space-y-1">
              {locations.length === 0 && <li className="text-xs text-base-content/60">This Google account manages no business profiles.</li>}
              {locations.map((l) => (
                <li key={l.location}>
                  <button className="w-full text-left rounded-lg border border-base-300 hover:border-primary p-2 text-xs" disabled={busy}
                          onClick={() => run(() => fetchApi('/site-builder/google/location', { method: 'PUT', body: JSON.stringify({ location: l.location }) }), `Reviews from ${l.title} are in.`)}>
                    <span className="font-medium block">{l.title}</span>
                    <span className="text-base-content/60">{l.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            {status.location && (
              <button className="btn btn-xs btn-outline flex-1" disabled={busy} onClick={() => run(() => fetchApi('/site-builder/google/sync', { method: 'POST' }), 'Google reviews updated.')}>
                {busy ? <span className="loading loading-spinner loading-xs" /> : <RotateCcw size={12} />} Update now
              </button>
            )}
            {status.location && <button className="btn btn-xs btn-ghost" disabled={busy} onClick={() => { setLocations(null); loadLocations(); setStatus({ ...status, location: null }); }}>Change</button>}
            <button className="btn btn-xs btn-ghost text-error" disabled={busy} onClick={disconnect}>Disconnect</button>
          </div>
        </>
      )}
    </div>
  );
}

type Integrations = {
  gtm_id: string | null;
  ga4_id: string | null;
  meta_pixel_id: string | null;
  clarity_id: string | null;
  meta_test_event_code: string | null;
  has_meta_capi_token: boolean;
  has_ga4_api_secret: boolean;
  sends_meta: boolean;
  sends_ga4: boolean;
};

/**
 * The website's measurement tags, and the secrets core-api needs to report
 * orders and bookings server-side. Live as soon as saved - wiring, not
 * content, so not part of Publish website. Secrets are write-only: the field
 * stays empty, and typing in it replaces the stored one.
 */
function IntegrationsPanel({ onError, onSaved }: { onError: (message: string) => void; onSaved: (message: string) => void }) {
  const [info, setInfo] = useState<Integrations | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchApi('/site-builder/integrations')
      .then((res: Integrations) => {
        if (!active) return;
        setInfo(res);
        setForm({ gtm_id: res.gtm_id ?? '', ga4_id: res.ga4_id ?? '', meta_pixel_id: res.meta_pixel_id ?? '', clarity_id: res.clarity_id ?? '', meta_test_event_code: res.meta_test_event_code ?? '' });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!info) return null;

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value.trim() });
  const save = async (extra: Record<string, string> = {}) => {
    setBusy(true);
    try {
      const body: Record<string, string | null> = {};
      for (const [k, v] of Object.entries({ ...form, ...extra })) {
        // Secrets are only sent when typed (or cleared on purpose).
        if ((k === 'meta_capi_token' || k === 'ga4_api_secret') && v === '' && !(k in extra)) continue;
        body[k] = v === '' ? null : v;
      }
      const res: Integrations = await fetchApi('/site-builder/integrations', { method: 'PUT', body: JSON.stringify(body) });
      setInfo(res);
      setForm((f) => ({ ...f, meta_capi_token: '', ga4_api_secret: '' }));
      onSaved('Integrations saved - they are live on your website now.');
    } catch (err) {
      onError(apiErrorMessage(err, 'Could not save the integrations.'));
    } finally {
      setBusy(false);
    }
  };

  const input = (key: string, label: string, placeholder: string, hint?: string) => (
    <label className="block">
      <span className="label-text text-xs font-medium mb-1 block">{label}</span>
      <input className="input input-sm input-bordered w-full font-mono" placeholder={placeholder} value={form[key] ?? ''} onChange={set(key)} />
      {hint && <span className="text-[11px] text-base-content/50">{hint}</span>}
    </label>
  );

  const secret = (key: 'meta_capi_token' | 'ga4_api_secret', label: string, isSet: boolean) => (
    <label className="block">
      <span className="label-text text-xs font-medium mb-1 flex items-center gap-1">
        {label} {isSet && <span className="badge badge-success badge-xs">set</span>}
      </span>
      <div className="join w-full">
        <input type="password" autoComplete="off" className="input input-sm input-bordered join-item w-full font-mono"
               placeholder={isSet ? 'Saved - type to replace' : 'Paste to set'} value={form[key] ?? ''} onChange={set(key)} />
        {isSet && <button type="button" className="btn btn-sm join-item" disabled={busy} onClick={() => save({ [key]: '' })}>Remove</button>}
      </div>
    </label>
  );

  return (
    <form className="space-y-3 border-t border-base-200 pt-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <span className="label-text text-xs font-medium flex items-center gap-1"><BarChart3 size={12} /> Tracking and analytics</span>
      <p className="text-xs text-base-content/60">Your own tags on every page of your website and on online ordering. Live as soon as you save.</p>
      {input('gtm_id', 'Google Tag Manager', 'GTM-XXXXXXX')}
      {input('ga4_id', 'Google Analytics 4', 'G-XXXXXXXXXX')}
      {input('meta_pixel_id', 'Meta (Facebook) pixel', '1234567890123456')}
      {input('clarity_id', 'Microsoft Clarity', 'abcd1234ef')}

      <div className="divider my-1 text-xs">Server-side conversions</div>
      <p className="text-xs text-base-content/60">
        Orders and table bookings are also reported from our server, so ad blockers and browsers that block cookies do not hide them.
      </p>
      {secret('meta_capi_token', 'Meta Conversions API token', info.has_meta_capi_token)}
      <span className="text-[11px] text-base-content/50 block -mt-2">Events Manager &gt; your pixel &gt; Settings &gt; Conversions API &gt; Generate access token.</span>
      {input('meta_test_event_code', 'Meta test event code (optional)', 'TEST12345', 'Only while testing in Events Manager - remove it after.')}
      {secret('ga4_api_secret', 'GA4 Measurement Protocol API secret', info.has_ga4_api_secret)}
      <span className="text-[11px] text-base-content/50 block -mt-2">Analytics &gt; Admin &gt; Data streams &gt; your stream &gt; Measurement Protocol API secrets.</span>
      <div className="flex flex-wrap gap-1 text-[11px]">
        <span className={`badge badge-xs ${info.sends_meta ? 'badge-success' : 'badge-ghost'}`}>Meta server-side {info.sends_meta ? 'on' : 'off'}</span>
        <span className={`badge badge-xs ${info.sends_ga4 ? 'badge-success' : 'badge-ghost'}`}>Google server-side {info.sends_ga4 ? 'on' : 'off'}</span>
      </div>
      <button type="submit" className="btn btn-sm btn-primary w-full" disabled={busy}>
        {busy ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />} Save integrations
      </button>
    </form>
  );
}

type DomainInfo = { subdomain: string; domain: string | null; verified: boolean; cname_target: string; server_ip: string | null };

/**
 * Where the site is reached: its restauraerp subdomain, and optionally the
 * restaurant's own domain - added here, pointed at us in DNS, then verified.
 */
function DomainPanel({ onError }: { onError: (message: string) => void }) {
  const [info, setInfo] = useState<DomainInfo | null>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState<'save' | 'verify' | null>(null);

  useEffect(() => {
    let active = true;
    fetchApi('/site-builder/domain')
      .then((res: DomainInfo) => { if (active) { setInfo(res); setValue(res.domain ?? ''); } })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!info) return null;

  const run = async (kind: 'save' | 'verify') => {
    setBusy(kind);
    try {
      const res: DomainInfo = kind === 'save'
        ? await fetchApi('/site-builder/domain', { method: 'PUT', body: JSON.stringify({ domain: value.trim() || null }) })
        : await fetchApi('/site-builder/domain/verify', { method: 'POST' });
      setInfo(res);
      setValue(res.domain ?? '');
    } catch (err) {
      onError(apiErrorMessage(err, kind === 'save' ? 'Could not save the domain.' : 'Could not verify the domain.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2 border-t border-base-200 pt-4">
      <span className="label-text text-xs font-medium flex items-center gap-1"><Globe size={12} /> Web address</span>
      <p className="text-sm">
        <a className="link link-primary break-all" href={`https://${info.subdomain}`} target="_blank" rel="noopener noreferrer">{info.subdomain}</a>
      </p>

      <span className="label-text text-xs font-medium block pt-2">Your own domain (optional)</span>
      <div className="join w-full">
        <input className="input input-sm input-bordered join-item w-full" placeholder="banglabistro.com" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn btn-sm join-item" disabled={busy !== null || value.trim() === (info.domain ?? '')} onClick={() => run('save')}>
          {busy === 'save' ? <span className="loading loading-spinner loading-xs" /> : 'Save'}
        </button>
      </div>

      {info.domain && (info.verified ? (
        <p className="text-xs text-success flex items-center gap-1"><CheckCircle2 size={12} /> {info.domain} is connected.</p>
      ) : (
        <div className="text-xs space-y-2 rounded-lg bg-base-200 p-3">
          <p>At your domain provider, add this record, then press Check:</p>
          <div className="font-mono bg-base-100 rounded p-2 break-all">
            CNAME&nbsp; {info.domain} &rarr; {info.cname_target}
          </div>
          {info.server_ip && (
            <p className="text-base-content/60">If your provider does not allow a CNAME on the bare domain, use an A record to <span className="font-mono">{info.server_ip}</span>.</p>
          )}
          <button className="btn btn-xs btn-primary" disabled={busy !== null} onClick={() => run('verify')}>
            {busy === 'verify' ? <span className="loading loading-spinner loading-xs" /> : 'Check'}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Site-wide colours, fonts, header and footer - a draft like the pages, live on Publish website. */
function ThemePanel({ theme, catalog, dirty, saving, onChange, onSave }: {
  theme: SiteTheme;
  catalog: FontCatalog;
  dirty: boolean;
  saving: boolean;
  onChange: (theme: SiteTheme) => void;
  onSave: () => void;
}) {
  const [open, setOpen] = useState<'colours' | 'fonts' | null>(null);
  const colors = colorsOf(theme);
  const paletteName = theme.colors && theme.palette === 'custom' ? 'Your own colours' : PALETTE_BY_KEY[theme.palette]?.name ?? 'Custom';
  const faces = facesOf(theme, catalog);
  const fontsUrl = googleFontsUrl([faces.heading, faces.body]);

  return (
    <div className="space-y-4">
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} precedence="default" />}
      <div>
        <span className="label-text text-xs font-medium mb-2 block">Colours</span>
        <button type="button" onClick={() => setOpen('colours')} className="w-full flex items-center gap-3 rounded-lg border border-base-300 hover:border-primary p-2 text-left">
          <PaletteSwatch colors={colors} className="w-16 h-12 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium truncate">{paletteName}</span>
            <span className="block text-xs text-primary">Browse or build from your colour</span>
          </span>
        </button>
      </div>
      <div>
        <span className="label-text text-xs font-medium mb-2 block">Fonts</span>
        <button type="button" onClick={() => setOpen('fonts')} className="w-full rounded-lg border border-base-300 hover:border-primary p-3 text-left">
          <span className="block text-lg leading-tight" style={{ fontFamily: familyCss(faces.heading) }}>{faces.heading.name}</span>
          <span className="block text-sm text-base-content/70" style={{ fontFamily: familyCss(faces.body) }}>Body text in {faces.body.name}</span>
          <span className="block text-xs text-primary mt-1">Search fonts and pairs</span>
        </button>
      </div>
      <div className="space-y-2">
        <span className="label-text text-xs font-medium block">Header and footer</span>
        <label className="flex items-center justify-between gap-3 cursor-pointer text-sm">
          Order online button in the header
          <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={theme.header_order_button !== false} onChange={(e) => onChange({ ...theme, header_order_button: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-3 cursor-pointer text-sm">
          Social links in the footer
          <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={theme.footer_social !== false} onChange={(e) => onChange({ ...theme, footer_social: e.target.checked })} />
        </label>
        <textarea className="textarea textarea-bordered w-full text-sm" rows={2} maxLength={200} placeholder="Footer text, e.g. Open every day 11am - 11pm"
                  value={theme.footer_text ?? ''} onChange={(e) => onChange({ ...theme, footer_text: e.target.value })} />
      </div>
      <button className="btn btn-sm btn-primary w-full" disabled={!dirty || saving} onClick={onSave}>
        {saving ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />} Save site settings
      </button>
      <p className="text-xs text-base-content/50">Saved as a draft for every page. Visitors see them when you publish the website.</p>

      {open === 'colours' && (
        <ColourBrowser theme={theme} onClose={() => setOpen(null)} onPick={(palette, c) => onChange({ ...theme, palette, colors: c })} />
      )}
      {open === 'fonts' && (
        <FontBrowser theme={theme} catalog={catalog} onClose={() => setOpen(null)} onPick={(heading, body) => onChange({ ...theme, heading_font: heading, body_font: body })} />
      )}
    </div>
  );
}

/** The selected section's settings, drawn from its definition. */
function SettingsPanel({ def, props, categories, locations, products, pages, onChange, onError, onClose }: {
  def: ComponentDefinition;
  props: SectionProps;
  categories: { id: number; name: string }[];
  locations: { id: number; name: string }[];
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
        <Field key={key} name={key} field={field} value={props[key]} categories={categories} locations={locations} products={products} pages={pages} onChange={onChange} onError={onError} />
      ))}
    </div>
  );
}

function Field({ name, field, value, categories, locations, products, pages, onChange, onError }: {
  name: string;
  field: FieldDefinition;
  value: SectionProps[string] | undefined;
  categories: { id: number; name: string }[];
  locations: { id: number; name: string }[];
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
    case 'products':
    case 'locations': {
      const chosen = Array.isArray(value) ? (value as number[]) : [];
      const options = field.type === 'categories' ? categories : field.type === 'locations' ? locations : products;
      const needle = search.trim().toLowerCase();
      const shown = options.filter((o) => !needle || o.name.toLowerCase().includes(needle)).slice(0, 60);
      return (
        <div>{label}
          <p className="text-xs text-base-content/50 mb-1">
            {field.type === 'categories' ? 'None ticked shows every category.' : field.type === 'locations' ? 'None ticked shows every branch.' : `${chosen.length} chosen. None chosen shows dishes with photos.`}
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
