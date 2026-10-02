'use client';
import React, { useMemo, useState } from 'react';
import { Check, Pipette, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Dialogs';
import {
  PALETTES, STYLE_LABEL, colorsOf, fromColour, nearestPalettes, paletteVars, searchPalettes, type Palette, type PaletteColors,
} from '@/lib/site/palettes';
import { FONT_PAIRS, familyCss, googleFontsUrl, pairsFor, searchFonts, type FontCatalog, type FontFace, type FontPair } from '@/lib/site/fonts';
import type { SiteTheme } from '@/lib/site/themes';

/**
 * The site builder's colour and font choosers, opened from Site > Theme.
 * Choosing applies to the draft theme straight away (the preview follows);
 * like every theme change it goes live on Publish website.
 */

const FAMILIES = ['red', 'orange', 'yellow', 'brown', 'green', 'teal', 'blue', 'purple', 'pink', 'grey'];
const STYLES = ['classic', 'fresh', 'night', 'original'] as const;

/** A small picture of a palette: page, header strip, a button, an accent and the footer. */
export function PaletteSwatch({ colors, className = '' }: { colors: PaletteColors; className?: string }) {
  const v = paletteVars(colors);
  return (
    <div className={`rounded-lg overflow-hidden border border-black/10 ${className}`} style={{ background: v['--color-base-100'] }} aria-hidden>
      <div className="h-2" style={{ background: v['--color-base-200'] }} />
      <div className="p-2 space-y-1.5">
        <div className="h-1.5 w-3/5 rounded" style={{ background: v['--color-base-content'], opacity: 0.8 }} />
        <div className="h-1.5 w-2/5 rounded" style={{ background: v['--color-base-content'], opacity: 0.35 }} />
        <div className="flex gap-1 pt-0.5">
          <span className="h-3 w-8 rounded" style={{ background: colors.primary }} />
          <span className="h-3 w-3 rounded-full" style={{ background: colors.secondary }} />
          <span className="h-3 w-3 rounded-full" style={{ background: colors.accent }} />
        </div>
      </div>
      <div className="h-3" style={{ background: colors.neutral }} />
    </div>
  );
}

export function ColourBrowser({ theme, onPick, onClose }: { theme: SiteTheme; onPick: (palette: string, colors: PaletteColors) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [own, setOwn] = useState<string>(colorsOf(theme).primary);
  const [mode, setMode] = useState<'browse' | 'own'>('browse');
  const current = colorsOf(theme);

  const shown = useMemo(() => {
    if (mode === 'own') return [...fromColour(own), ...nearestPalettes(own, 12)];
    return searchPalettes(query).filter((p) => (!family || p.family === family) && (!style || p.style === style));
  }, [mode, own, query, family, style]);

  const same = (p: Palette) => JSON.stringify(p.colors) === JSON.stringify(current);

  return (
    <Modal onClose={onClose} wide>
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Colours</h3>
        <div role="tablist" className="tabs tabs-box tabs-sm w-fit">
          <button role="tab" className={`tab ${mode === 'browse' ? 'tab-active' : ''}`} onClick={() => setMode('browse')}>Browse {PALETTES.length} palettes</button>
          <button role="tab" className={`tab gap-1 ${mode === 'own' ? 'tab-active' : ''}`} onClick={() => setMode('own')}><Pipette size={12} /> From my colour</button>
        </div>

        {mode === 'browse' ? (
          <div className="space-y-2">
            <label className="input input-sm input-bordered flex items-center gap-2 w-full">
              <Search size={14} className="opacity-50" />
              <input className="grow" placeholder="Search: saffron, green, dark, coffee, fine dining…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-1">
              {FAMILIES.map((f) => (
                <button key={f} className={`badge badge-sm capitalize cursor-pointer ${family === f ? 'badge-primary' : 'badge-ghost'}`} onClick={() => setFamily(family === f ? null : f)}>{f}</button>
              ))}
              <span className="mx-1 opacity-30">|</span>
              {STYLES.map((s) => (
                <button key={s} className={`badge badge-sm cursor-pointer ${style === s ? 'badge-primary' : 'badge-ghost'}`} onClick={() => setStyle(style === s ? null : s)}>{STYLE_LABEL[s]}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-base-200 p-3">
            <input type="color" className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent" value={own} onChange={(e) => setOwn(e.target.value.toUpperCase())} aria-label="Your main colour" />
            <input className="input input-sm input-bordered w-28 font-mono" value={own} maxLength={7}
                   onChange={(e) => { const v = e.target.value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(v)) setOwn(v.toUpperCase()); }} />
            <p className="text-xs text-base-content/70 flex-1 min-w-48">Pick your brand or logo colour. The first three are built around it; the rest are the closest from the catalogue.</p>
          </div>
        )}

        <p className="text-xs text-base-content/60">{shown.length} palette{shown.length === 1 ? '' : 's'}. Text colours are chosen for readability automatically.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto p-1">
          {shown.map((p, i) => (
            <button key={`${p.key}-${p.name}-${i}`} type="button" onClick={() => { onPick(p.key, p.colors); onClose(); }}
                    className={`text-left rounded-xl p-2 border hover:border-primary ${same(p) ? 'border-primary ring-1 ring-primary' : 'border-base-300'}`}>
              <PaletteSwatch colors={p.colors} className="h-20" />
              <div className="mt-1.5 text-xs font-medium flex items-center gap-1">{same(p) && <Check size={12} className="text-primary" />}{p.name}</div>
            </button>
          ))}
          {shown.length === 0 && <p className="col-span-full text-sm text-center py-8 text-base-content/60">Nothing matches. Try a colour like &ldquo;red&rdquo; or a mood like &ldquo;dark&rdquo;.</p>}
        </div>
      </div>
    </Modal>
  );
}

/** Loads the Google Fonts for what is on screen (React puts it in <head>). */
function FontLoader({ names, catalog }: { names: string[]; catalog: FontCatalog }) {
  const faces: FontFace[] = names.filter((n) => catalog[n]).map((n) => ({ name: n, category: catalog[n].category, weights: catalog[n].weights }));
  const url = googleFontsUrl(faces);
  return url ? <link rel="stylesheet" href={url} precedence="default" /> : null;
}

function PairCard({ pair, catalog, chosen, onPick }: { pair: FontPair; catalog: FontCatalog; chosen: boolean; onPick: () => void }) {
  const face = (n: string): FontFace => ({ name: n, category: catalog[n]?.category ?? 'sans-serif', weights: '400' });
  return (
    <button type="button" onClick={onPick} className={`text-left rounded-xl border p-3 hover:border-primary ${chosen ? 'border-primary ring-1 ring-primary' : 'border-base-300'}`}>
      <div className="text-xl leading-tight" style={{ fontFamily: familyCss(face(pair.heading)) }}>{pair.heading}</div>
      <p className="text-sm mt-1 text-base-content/80" style={{ fontFamily: familyCss(face(pair.body)) }}>
        Fresh biryani, kebabs and desserts. খাবার অর্ডার করুন অনলাইনে। Body: {pair.body}.
      </p>
      <div className="text-[11px] text-base-content/50 mt-1 flex items-center gap-1">{chosen && <Check size={11} className="text-primary" />}{pair.mood}</div>
    </button>
  );
}

export function FontBrowser({ theme, catalog, onPick, onClose }: {
  theme: SiteTheme;
  catalog: FontCatalog;
  onPick: (heading: string, body: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [font, setFont] = useState<string | null>(null);
  const results = useMemo(() => searchFonts(query, catalog), [query, catalog]);
  const pairs = font ? pairsFor(font, catalog) : FONT_PAIRS.filter((p) => catalog[p.heading] && catalog[p.body]).slice(0, 12);
  const pick = (p: FontPair) => { onPick(p.heading, p.body); onClose(); };
  const visibleFonts = [...results.slice(0, 40), ...pairs.flatMap((p) => [p.heading, p.body])];

  return (
    <Modal onClose={onClose} wide>
      <FontLoader names={visibleFonts} catalog={catalog} />
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Fonts</h3>
        <p className="text-sm text-base-content/70">Pick a font to see two or three that go well with it - or choose a ready pair.</p>
        <div className="grid md:grid-cols-[14rem_1fr] gap-4">
          <div className="space-y-2">
            <label className="input input-sm input-bordered flex items-center gap-2 w-full">
              <Search size={14} className="opacity-50" />
              <input className="grow" placeholder="Search fonts, serif, bangla…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <ul className="max-h-[50vh] overflow-y-auto space-y-0.5">
              {results.map((name) => (
                <li key={name}>
                  <button type="button" onClick={() => setFont(name)}
                          className={`w-full text-left rounded-lg px-2 py-1.5 flex items-center justify-between gap-2 ${font === name ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'}`}>
                    <span className="truncate text-base" style={{ fontFamily: familyCss({ name, category: catalog[name].category, weights: '400' }) }}>{name}</span>
                    <span className="text-[10px] text-base-content/50 shrink-0">{catalog[name].bangla ? 'বাংলা' : catalog[name].category}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-base-content/60">{font ? `Goes well with ${font}` : 'Popular pairs'}</div>
            <div className="grid sm:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto p-1">
              {pairs.map((p) => (
                <PairCard key={`${p.heading}|${p.body}`} pair={p} catalog={catalog} onPick={() => pick(p)}
                          chosen={theme.heading_font === p.heading && theme.body_font === p.body} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
