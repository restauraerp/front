'use client';
import { useState } from 'react';
import { MapPin, Navigation, Phone } from 'lucide-react';

/**
 * Google Maps for a restaurant's branches.
 *
 * One branch: the map, and its details beside it. Several: the map shows the
 * branch picked from the list beside it (layout "list"), or each branch gets
 * a map of its own (layout "grid").
 *
 * The map is Google's own embed, placed by the branch's name and address -
 * branches have no coordinates of their own. With NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
 * set it uses the Maps Embed API (Google's supported, free embed); without
 * one, the keyless maps.google.com embed, so a fresh install works at once.
 */

type Branch = { id: number; name: string; address: string | null; phone: string | null; map_url?: string | null };

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || '';
const HEIGHTS: Record<string, string> = { small: 'h-56', medium: 'h-80', large: 'h-[28rem]' };

function query(restaurant: string, b: Branch): string {
  return [restaurant, b.name !== restaurant ? b.name : '', b.address ?? ''].filter(Boolean).join(', ');
}

function embedUrl(q: string): string {
  return KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(KEY)}&q=${encodeURIComponent(q)}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
}

function directions(restaurant: string, b: Branch): string {
  return b.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query(restaurant, b))}`;
}

function Frame({ q, height, title }: { q: string; height: string; title: string }) {
  return (
    <iframe
      title={title}
      src={embedUrl(q)}
      className={`w-full ${height} rounded-2xl border-0 bg-base-200`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}

function Details({ restaurant, branch }: { restaurant: string; branch: Branch }) {
  return (
    <>
      <div className="font-semibold">{branch.name}</div>
      {branch.address && <div className="flex gap-2 mt-1 text-sm opacity-80"><MapPin size={15} className="shrink-0 mt-0.5" /> {branch.address}</div>}
      {branch.phone && <a href={`tel:${branch.phone}`} className="flex gap-2 mt-1 text-sm link link-hover"><Phone size={15} className="shrink-0 mt-0.5" /> {branch.phone}</a>}
      <a href={directions(restaurant, branch)} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-outline mt-3 gap-1">
        <Navigation size={12} /> Directions
      </a>
    </>
  );
}

export default function SiteMap({ restaurant, branches, layout, height }: { restaurant: string; branches: Branch[]; layout: string; height: string }) {
  const [current, setCurrent] = useState(0);
  const h = HEIGHTS[height] ?? HEIGHTS.medium;
  if (branches.length === 0) return null;

  if (layout === 'grid' && branches.length > 1) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branches.map((b) => (
          <div key={b.id} className="rounded-2xl bg-base-100 text-base-content shadow-sm overflow-hidden">
            <Frame q={query(restaurant, b)} height={h} title={`Map of ${b.name}`} />
            <div className="p-4"><Details restaurant={restaurant} branch={b} /></div>
          </div>
        ))}
      </div>
    );
  }

  const branch = branches[Math.min(current, branches.length - 1)];

  return (
    <div className={`grid gap-4 ${branches.length > 1 ? 'md:grid-cols-[18rem_1fr]' : 'md:grid-cols-[1fr_16rem]'}`}>
      {branches.length > 1 ? (
        <ul className="space-y-2 md:max-h-[28rem] md:overflow-y-auto order-2 md:order-1">
          {branches.map((b, i) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setCurrent(i)}
                className={`w-full text-left rounded-xl p-3 border transition-colors bg-base-100 text-base-content ${i === current ? 'border-primary ring-1 ring-primary' : 'border-base-300 hover:border-primary/50'}`}
              >
                <div className="font-semibold text-sm">{b.name}</div>
                {b.address && <div className="text-xs opacity-70 mt-0.5">{b.address}</div>}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={branches.length > 1 ? 'order-1 md:order-2' : ''}>
        <Frame q={query(restaurant, branch)} height={h} title={`Map of ${branch.name}`} />
        {branches.length > 1 && (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
            <div><Details restaurant={restaurant} branch={branch} /></div>
          </div>
        )}
      </div>
      {branches.length === 1 && (
        <div className="rounded-2xl bg-base-100 text-base-content p-5 shadow-sm self-start"><Details restaurant={restaurant} branch={branch} /></div>
      )}
    </div>
  );
}
