'use client';
import React, { useState } from 'react';
import { BedDouble, CalendarCheck, Check, Users } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { siteTrack, trackingContext } from '@/lib/site/track';
import { storageUrl, type SiteRoomType } from '@/lib/site/types';

type Priced = SiteRoomType & { available?: boolean; fits?: boolean; price?: { nights: number; total: number } };

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plusDays = (s: string, n: number) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return ymd(d); };

/**
 * The website's hotel rooms: the room types, a date search that says what is
 * free and what the stay costs (core-api's GET /site/{code}/rooms), and a
 * booking request with the guest's phone number - not verified; an email is
 * optional, for confirmations. The hotel confirms; nothing here says booked.
 * In the editor's preview it searches and submits nothing.
 */
export default function HotelRooms({ code, rooms, currency, showPrices, preview }: {
  code: string;
  rooms: SiteRoomType[];
  currency: string;
  showPrices: boolean;
  preview?: boolean;
}) {
  const [search, setSearch] = useState(() => {
    const today = ymd(new Date());
    return { check_in: today, check_out: plusDays(today, 1), adults: '2', children: '0' };
  });
  const [results, setResults] = useState<Priced[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [chosen, setChosen] = useState<Priced | null>(null);
  const [guest, setGuest] = useState({ name: '', phone: '', email: '', notes: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const money = (n: number) => `${currency}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const list: Priced[] = results ?? rooms;

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) return;
    setSearching(true); setError(null); setChosen(null);
    try {
      const res = await fetch(`${API_BASE_URL}/site/${encodeURIComponent(code)}/rooms?${new URLSearchParams(search)}`, { headers: { Accept: 'application/json' } });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.errors ? (Object.values(body.errors)[0] as string[])[0] : body?.message || 'Could not check availability.');
      setResults(body.room_types);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview || !chosen) return;
    setStatus('sending'); setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/site/${encodeURIComponent(code)}/room-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...search, adults: Number(search.adults), children: Number(search.children), room_type_id: chosen.id,
          name: guest.name, phone: guest.phone, email: guest.email || null, notes: guest.notes || null, tracking: trackingContext(),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.errors ? (Object.values(body.errors)[0] as string[])[0] : body?.message || 'Your request could not be sent. Please call us.');
      siteTrack('generate_lead', { eventId: `room-${body.request_id}` });
      setStatus('sent');
    } catch (err) {
      setError((err as Error).message);
      setStatus('idle');
    }
  };

  if (status === 'sent' && chosen) {
    return (
      <div className="rounded-2xl bg-base-100 text-base-content p-8 text-center max-w-xl mx-auto">
        <CalendarCheck className="mx-auto text-success" size={40} />
        <h3 className="text-xl font-semibold mt-3">Request sent</h3>
        <p className="opacity-70 mt-1">
          Thank you, {guest.name}. We will call {guest.phone} to confirm your {chosen.name}, {search.check_in} to {search.check_out}.
          {guest.email && ` We have also emailed ${guest.email}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={find} className="rounded-2xl bg-base-100 text-base-content p-4 grid gap-3 grid-cols-2 md:grid-cols-5 items-end max-w-4xl mx-auto">
        <label className="text-xs font-medium">Check-in
          <input required type="date" min={ymd(new Date())} className="input input-bordered w-full mt-1" value={search.check_in}
                 onChange={(e) => setSearch((s) => ({ ...s, check_in: e.target.value, check_out: s.check_out <= e.target.value ? plusDays(e.target.value, 1) : s.check_out }))} />
        </label>
        <label className="text-xs font-medium">Check-out
          <input required type="date" min={plusDays(search.check_in, 1)} className="input input-bordered w-full mt-1" value={search.check_out} onChange={(e) => setSearch({ ...search, check_out: e.target.value })} />
        </label>
        <label className="text-xs font-medium">Adults
          <input required type="number" min={1} max={20} className="input input-bordered w-full mt-1" value={search.adults} onChange={(e) => setSearch({ ...search, adults: e.target.value })} />
        </label>
        <label className="text-xs font-medium">Children
          <input type="number" min={0} max={20} className="input input-bordered w-full mt-1" value={search.children} onChange={(e) => setSearch({ ...search, children: e.target.value })} />
        </label>
        <button type="submit" className="btn btn-primary col-span-2 md:col-span-1" disabled={searching}>
          {searching ? <span className="loading loading-spinner loading-sm" /> : 'Check availability'}
        </button>
      </form>

      {error && <div className="alert alert-error text-sm max-w-4xl mx-auto">{error}</div>}

      <div className={`grid grid-cols-1 ${list.length > 1 ? 'md:grid-cols-2' : 'max-w-xl mx-auto'} ${list.length > 2 ? 'lg:grid-cols-3' : ''} gap-5`}>
        {list.map((r) => (
          <div key={r.id} className={`rounded-2xl overflow-hidden bg-base-100 text-base-content shadow-sm flex flex-col ${chosen?.id === r.id ? 'ring-2 ring-primary' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.photos[0] && <img src={storageUrl(r.photos[0]) ?? ''} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />}
            <div className="p-5 space-y-2 flex-1 flex flex-col">
              <div className="font-semibold text-lg">{r.name}</div>
              <div className="flex flex-wrap gap-x-3 text-sm opacity-80">
                <span className="flex items-center gap-1"><Users size={14} /> {r.max_adults} adult{r.max_adults === 1 ? '' : 's'}{r.max_children ? `, ${r.max_children} child${r.max_children === 1 ? '' : 'ren'}` : ''}</span>
                {r.beds && <span className="flex items-center gap-1"><BedDouble size={14} /> {r.beds}</span>}
                {r.size_sqft && <span>{r.size_sqft} sq ft</span>}
              </div>
              {r.description && <p className="text-sm opacity-80 line-clamp-4">{r.description}</p>}
              {r.amenities.length > 0 && <div className="flex flex-wrap gap-1">{r.amenities.map((a) => <span key={a} className="badge badge-sm badge-ghost">{a}</span>)}</div>}
              <div className="mt-auto pt-2 flex items-end justify-between gap-2">
                {r.price ? (
                  <div><div className="font-bold text-primary text-lg">{money(r.price.total)}</div><div className="text-xs opacity-60">{r.price.nights} night{r.price.nights === 1 ? '' : 's'}</div></div>
                ) : showPrices ? (
                  <div><span className="font-bold text-primary">{money(r.rate)}</span><span className="text-xs opacity-60"> / night</span></div>
                ) : <span />}
                {results && (r.available
                  ? <button className="btn btn-primary btn-sm" onClick={() => setChosen(r)}>{chosen?.id === r.id ? <><Check size={14} /> Chosen</> : 'Request this room'}</button>
                  : <span className="badge badge-ghost">{r.fits === false ? 'Too small for your group' : 'Not free on these dates'}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
      {!results && <p className="text-center text-sm opacity-70">Choose your dates and check availability to request a room.</p>}

      {chosen && (
        <form onSubmit={request} className="rounded-2xl bg-base-100 text-base-content p-5 sm:p-6 max-w-2xl mx-auto grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 font-semibold">{chosen.name}: {search.check_in} to {search.check_out}{chosen.price ? ` - ${money(chosen.price.total)}` : ''}</div>
          <input required maxLength={100} className="input input-bordered w-full" placeholder="Your name" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
          <input required type="tel" maxLength={20} className="input input-bordered w-full" placeholder="Mobile number - we call to confirm" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
          <input type="email" maxLength={191} className="input input-bordered w-full sm:col-span-2" placeholder="Email (optional, for confirmation)" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
          <textarea maxLength={1000} rows={2} className="textarea textarea-bordered w-full sm:col-span-2" placeholder="Arrival time, special requests (optional)" value={guest.notes} onChange={(e) => setGuest({ ...guest, notes: e.target.value })} />
          <button type="submit" className="btn btn-primary sm:col-span-2" disabled={status === 'sending'}>
            {status === 'sending' ? <span className="loading loading-spinner loading-sm" /> : 'Send booking request'}
          </button>
          <p className="text-xs opacity-60 sm:col-span-2 text-center">Nothing is charged online. We confirm your room by phone.</p>
        </form>
      )}
    </div>
  );
}
