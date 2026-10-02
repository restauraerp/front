'use client';
import React, { useEffect, useRef, useState } from 'react';
import { SiteFrame, SiteSection } from '@/components/site/Sections';
import type { Section, SiteContext } from '@/lib/site/types';
import type { SiteTheme } from '@/lib/site/themes';

/**
 * The site builder's preview, inside the editor's iframe.
 *
 * An iframe rather than a div so a phone-width preview really is a phone:
 * Tailwind's breakpoints follow the viewport, and only a frame has its own.
 * It renders whatever the editor posts (same origin only) with the site's own
 * components, and reports clicks back so selecting a section works from here.
 * It loads nothing by itself - opened directly it is an empty page.
 */
type PreviewState = {
  ctx: SiteContext;
  pages: { slug: string; title: string }[];
  theme: SiteTheme;
  sections: Section[];
  selectedId: string | null;
  labels: Record<string, string>;
};

export default function SitePreviewPage() {
  const [state, setState] = useState<PreviewState | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastSelected = useRef<string | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'site-preview-state') return;
      setState(e.data.state as PreviewState);
    };
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: 'site-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Bring a section chosen in the editor's outline into view.
  useEffect(() => {
    const id = state?.selectedId ?? null;
    if (id && id !== lastSelected.current) refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    lastSelected.current = id;
  }, [state?.selectedId]);

  if (!state) return null;

  const select = (id: string) => window.parent?.postMessage({ type: 'site-preview-select', id }, window.location.origin);

  return (
    <div onClickCapture={(e) => { if ((e.target as HTMLElement).closest('a')) e.preventDefault(); }}>
      <SiteFrame ctx={{ ...state.ctx, preview: true }} pages={state.pages} theme={state.theme}>
        {state.sections.map((s) => (
          <div
            key={s.id}
            ref={(el) => { refs.current[s.id] = el; }}
            onClick={() => select(s.id)}
            className={`relative cursor-pointer outline-offset-[-2px] ${state.selectedId === s.id ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/40'}`}
          >
            {state.selectedId === s.id && <span className="absolute top-1 left-1 z-10 badge badge-primary badge-sm">{state.labels[s.type] ?? s.type}</span>}
            <SiteSection section={s} ctx={{ ...state.ctx, preview: true }} />
          </div>
        ))}
        {state.sections.length === 0 && <div className="py-24 text-center text-base-content/40">This page is empty.</div>}
      </SiteFrame>
    </div>
  );
}
