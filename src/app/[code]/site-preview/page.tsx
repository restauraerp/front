'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  DndContext, MouseSensor, TouchSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { SiteFrame, SiteSection } from '@/components/site/Sections';
import type { Section, SiteContext, SiteNavPage } from '@/lib/site/types';
import type { SiteFonts, SiteTheme } from '@/lib/site/themes';

/**
 * The site builder's preview, inside the editor's iframe.
 *
 * An iframe rather than a div so a phone-width preview really is a phone:
 * Tailwind's breakpoints follow the viewport, and only a frame has its own.
 * It renders whatever the editor posts (same origin only) with the site's own
 * components, and talks back:
 *
 *   - a click selects the section in the editor;
 *   - dragging a section by its handle reorders it (dnd-kit, so it works with
 *     a mouse, a finger or the keyboard) - the move is reported, the editor
 *     applies it and posts the page back;
 *   - while the editor drags a new component over this frame, it reads the
 *     [data-section-id] elements to find the drop point and posts `marker`,
 *     drawn here as a line.
 *
 * It loads nothing by itself - opened directly it is an empty page.
 */
type PreviewState = {
  ctx: SiteContext;
  pages: SiteNavPage[];
  /** The page being edited, to mark it in the menu. */
  current: string;
  theme: SiteTheme;
  fonts: SiteFonts;
  sections: Section[];
  selectedId: string | null;
  labels: Record<string, string>;
  /** Where a component being dragged in from the editor would land, or null. */
  marker: number | null;
};

const post = (data: Record<string, unknown>) => window.parent?.postMessage(data, window.location.origin);

export default function SitePreviewPage() {
  const [state, setState] = useState<PreviewState | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastSelected = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // A short press before a drag starts, so a finger can still scroll the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'site-preview-state') return;
      setState(e.data.state as PreviewState);
    };
    window.addEventListener('message', onMessage);
    post({ type: 'site-preview-ready' });
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Bring a section chosen in the editor's outline into view.
  useEffect(() => {
    const id = state?.selectedId ?? null;
    if (id && id !== lastSelected.current) refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    lastSelected.current = id;
  }, [state?.selectedId]);

  if (!state) return null;

  const ctx = { ...state.ctx, preview: true };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = state.sections.findIndex((s) => s.id === active.id);
    const to = state.sections.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    // Shown at once; the editor's reply confirms it.
    setState({ ...state, sections: arrayMove(state.sections, from, to) });
    post({ type: 'site-preview-reorder', from, to });
  };

  const marker = <div className="h-1 bg-primary rounded-full mx-4 my-1 shadow-[0_0_0_3px_rgba(0,0,0,0.08)]" aria-hidden />;

  return (
    <div onClickCapture={(e) => { if ((e.target as HTMLElement).closest('a')) e.preventDefault(); }}>
      <SiteFrame ctx={ctx} pages={state.pages} theme={state.theme} fonts={state.fonts} current={state.current}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={state.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {state.sections.map((s, i) => (
              <React.Fragment key={s.id}>
                {state.marker === i && marker}
                <PreviewSection
                  section={s}
                  ctx={ctx}
                  label={state.labels[s.type] ?? s.type}
                  selected={state.selectedId === s.id}
                  refFor={(el) => { refs.current[s.id] = el; }}
                />
              </React.Fragment>
            ))}
            {state.marker !== null && state.marker >= state.sections.length && marker}
          </SortableContext>
        </DndContext>
        {state.sections.length === 0 && (
          <div className="py-24 text-center text-base-content/40">This page is empty. Drag a component here, or click one to add it.</div>
        )}
      </SiteFrame>
    </div>
  );
}

function PreviewSection({ section, ctx, label, selected, refFor }: {
  section: Section;
  ctx: SiteContext;
  label: string;
  selected: boolean;
  refFor: (el: HTMLDivElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  return (
    <div
      ref={(el) => { setNodeRef(el); refFor(el); }}
      data-section-id={section.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => post({ type: 'site-preview-select', id: section.id })}
      className={`group relative cursor-pointer outline-offset-[-2px] ${isDragging ? 'z-20 opacity-80 shadow-2xl' : ''} ${selected ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/40'}`}
    >
      <div className={`absolute top-1 left-1 z-10 flex items-center gap-1 ${selected || isDragging ? 'flex' : 'hidden group-hover:flex'}`}>
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="btn btn-xs btn-primary btn-square cursor-grab active:cursor-grabbing touch-none"
          aria-label={`Drag ${label} to move it`}
        >
          <GripVertical size={12} />
        </button>
        <span className="badge badge-primary badge-sm">{label}</span>
      </div>
      <SiteSection section={section} ctx={ctx} />
    </div>
  );
}
