'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, List, PartyPopper, Pencil, Plus, Search, Trash2, Users, UtensilsCrossed, Warehouse, X, Phone } from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Modal, useDialogs } from '@/components/ui/Dialogs';
import BookingForm from './BookingForm';
import BookingDetail from './BookingDetail';
import { EVENT_TYPES, STATUS_BADGE, longDate, money, time12, type BookingDetail as Detail, type BookingSummary, type Venue, type VenuePackage } from './types';

/**
 * Venue booking: the restaurant's halls hired out for events.
 *
 *   - Bookings: upcoming, tentative and past events, or a month calendar.
 *   - Venues: the halls - rent, guest range, cleanup time between events.
 *   - Packages: per-person food menus a booking can include.
 *
 * Pricing, double-booking and the balance due are core-api's; this page
 * shows what it answers.
 */

type Tab = 'bookings' | 'calendar' | 'venues' | 'packages';
type View = 'upcoming' | 'pending' | 'past' | 'all';

export default function VenuesPage() {
  const [tab, setTab] = useState<Tab>('bookings');
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [packages, setPackages] = useState<VenuePackage[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [counts, setCounts] = useState({ pending: 0, upcoming: 0 });
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<{ booking: Detail | null; date?: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSetup = useCallback(async () => {
    try {
      const [v, p] = await Promise.all([fetchApi('/venues'), fetchApi('/venue-packages')]);
      setVenues(v.venues);
      setPackages(p.packages);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the venues.'));
      setVenues([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadSetup, 0);
    fetchApi('/locations').then((res) => setLocations((res?.data ?? res ?? []).map((l: { id: number; name: string }) => ({ id: l.id, name: l.name })))).catch(() => {});
    return () => clearTimeout(t);
  }, [loadSetup]);

  const openBooking = async (id: number) => {
    try { setDetail(await fetchApi(`/venue-bookings/${id}`)); } catch (err) { setError(apiErrorMessage(err, 'Could not open the booking.')); }
  };

  const changed = () => setRefresh((n) => n + 1);

  const tabs: { key: Tab; label: string; Icon: typeof List }[] = [
    { key: 'bookings', label: 'Bookings', Icon: List },
    { key: 'calendar', label: 'Calendar', Icon: CalendarDays },
    { key: 'venues', label: 'Venues', Icon: Warehouse },
    { key: 'packages', label: 'Food packages', Icon: UtensilsCrossed },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <h1 className="text-2xl font-bold flex items-center gap-2"><PartyPopper className="text-primary" /> Venue booking</h1>
          <p className="text-sm text-base-content/60">Weddings, birthdays, holud, corporate events - your halls, their prices and every booking.</p>
        </div>
        <button className="btn btn-primary btn-sm gap-1" disabled={!venues?.length} onClick={() => setForm({ booking: null })}><Plus size={16} /> New booking</button>
      </div>

      <div role="tablist" className="tabs tabs-border">
        {tabs.map(({ key, label, Icon }) => (
          <button key={key} role="tab" className={`tab gap-1 ${tab === key ? 'tab-active' : ''}`} onClick={() => setTab(key)}>
            <Icon size={14} /> {label}
            {key === 'bookings' && counts.pending > 0 && <span className="badge badge-xs badge-warning">{counts.pending}</span>}
          </button>
        ))}
      </div>

      {error && <div role="alert" className="alert alert-error text-sm py-2"><span className="flex-1">{error}</span><button className="btn btn-xs btn-ghost" onClick={() => setError(null)}><X size={12} /></button></div>}
      {notice && <div role="status" className="alert alert-success text-sm py-2"><span className="flex-1">{notice}</span><button className="btn btn-xs btn-ghost" onClick={() => setNotice(null)}><X size={12} /></button></div>}

      {venues !== null && venues.length === 0 && tab !== 'venues' && tab !== 'packages' && (
        <div className="alert alert-info text-sm">
          <Warehouse size={16} /> Start by adding your halls in the Venues tab - their capacity, rent and cleanup time.
          <button className="btn btn-xs" onClick={() => setTab('venues')}>Add a venue</button>
        </div>
      )}

      {tab === 'bookings' && <BookingList refresh={refresh} onCounts={setCounts} onOpen={openBooking} />}
      {tab === 'calendar' && <Calendar refresh={refresh} venues={venues ?? []} onOpen={openBooking} onNew={(date) => venues?.length && setForm({ booking: null, date })} />}
      {tab === 'venues' && <VenueManager venues={venues} locations={locations} onChanged={loadSetup} onError={setError} />}
      {tab === 'packages' && <PackageManager packages={packages} onChanged={loadSetup} onError={setError} />}

      {detail && (
        <BookingDetail
          key={detail.id}
          booking={detail}
          onClose={() => setDetail(null)}
          onChanged={() => changed()}
          onEdit={(b) => { setDetail(null); setForm({ booking: b }); }}
        />
      )}
      {form && venues && (
        <BookingForm
          booking={form.booking}
          venues={venues}
          packages={packages}
          initialDate={form.date}
          onClose={() => setForm(null)}
          onSaved={(saved) => { setForm(null); changed(); setNotice(form.booking ? 'Booking updated.' : `Booking for ${saved.guest_name} saved.`); setDetail(saved); }}
        />
      )}
    </div>
  );
}

function BookingRow({ b, onOpen }: { b: BookingSummary; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className={`w-full text-left rounded-xl border bg-base-100 p-4 flex flex-col sm:flex-row gap-3 hover:border-primary ${b.status === 'Pending' ? 'border-warning/60' : 'border-base-200'}`}>
        <div className="sm:w-36 shrink-0">
          <div className="text-sm font-semibold text-primary">{longDate(b.date)}</div>
          <div className="text-lg font-bold">{time12(b.start_time)}</div>
          <div className="text-xs text-base-content/60">to {time12(b.end_time)}{b.end_date !== b.date ? ' (next day)' : ''}</div>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{b.event_title || EVENT_TYPES[b.event_type]}</span>
            <span className={`badge badge-sm ${STATUS_BADGE[b.status] ?? 'badge-ghost'}`}>{b.status === 'Pending' ? 'Tentative' : b.status}</span>
            <span className="badge badge-sm badge-ghost">{EVENT_TYPES[b.event_type]}</span>
          </div>
          <div className="text-sm text-base-content/70 flex flex-wrap gap-x-3">
            <span>{b.hall?.name}{b.location ? ` · ${b.location.name}` : ''}</span>
            <span className="flex items-center gap-1"><Users size={13} /> {b.guests}</span>
            <span className="flex items-center gap-1"><Phone size={13} /> {b.guest_name}, {b.guest_phone}</span>
          </div>
        </div>
        <div className="sm:text-right text-sm shrink-0">
          <div className="font-semibold">{money(b.total)}</div>
          <div className={b.due > 0 ? 'text-warning' : 'text-success'}>{b.due > 0 ? `${money(b.due)} due` : 'Paid'}</div>
        </div>
      </button>
    </li>
  );
}

function BookingList({ refresh, onCounts, onOpen }: { refresh: number; onCounts: (c: { pending: number; upcoming: number }) => void; onOpen: (id: number) => void }) {
  const [view, setView] = useState<View>('upcoming');
  const [rows, setRows] = useState<BookingSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ view });
    if (search) params.set('q', search);
    fetchApi(`/venue-bookings?${params}`).then((res) => {
      if (!active) return;
      setRows(res.data);
      onCounts(res.counts);
    }).catch(() => { if (active) setRows([]); });
    return () => { active = false; };
  }, [view, search, refresh, onCounts]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="tabs tabs-box tabs-sm">
          {(['upcoming', 'pending', 'past', 'all'] as View[]).map((v) => (
            <button key={v} role="tab" className={`tab ${view === v ? 'tab-active' : ''}`} onClick={() => { setRows(null); setView(v); }}>
              {v === 'pending' ? 'Tentative' : v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <label className="input input-sm input-bordered flex items-center gap-2 w-full sm:w-64">
          <Search size={14} className="opacity-50" />
          <input className="grow" placeholder="Name, phone or event" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      {rows === null ? <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
        : rows.length === 0 ? <p className="text-center py-12 text-base-content/60">No bookings here.</p>
          : <ul className="space-y-2">{rows.map((b) => <BookingRow key={b.id} b={b} onOpen={() => onOpen(b.id)} />)}</ul>}
    </div>
  );
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** A month of bookings, by day. Click a day to book it, a booking to open it. */
function Calendar({ refresh, venues, onOpen, onNew }: { refresh: number; venues: Venue[]; onOpen: (id: number) => void; onNew: (date: string) => void }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [hallId, setHallId] = useState('');
  const [rows, setRows] = useState<BookingSummary[]>([]);

  const days = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - ((start.getDay() + 6) % 7)); // weeks start on Monday
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ from: ymd(days[0]), to: ymd(days[41]) });
    if (hallId) params.set('hall_id', hallId);
    fetchApi(`/venue-bookings?${params}`).then((res) => { if (active) setRows(res.data); }).catch(() => {});
    return () => { active = false; };
  }, [days, hallId, refresh]);

  const byDay = useMemo(() => {
    const map: Record<string, BookingSummary[]> = {};
    for (const b of rows) if (b.status !== 'Declined' && b.status !== 'Cancelled') (map[b.date] ??= []).push(b);
    return map;
  }, [rows]);

  const today = ymd(new Date());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-sm btn-ghost btn-square" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <h2 className="font-semibold w-40 text-center">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <button className="btn btn-sm btn-ghost btn-square" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
        <button className="btn btn-sm btn-ghost" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</button>
        <div className="flex-1" />
        {venues.length > 1 && (
          <select className="select select-sm select-bordered" value={hallId} onChange={(e) => setHallId(e.target.value)}>
            <option value="">All venues</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
        <span className="flex items-center gap-2 text-xs"><span className="badge badge-xs badge-success" /> Confirmed <span className="badge badge-xs badge-warning" /> Tentative</span>
      </div>
      <div className="grid grid-cols-7 text-xs font-medium text-base-content/60 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <div key={key} className={`min-h-24 rounded-lg border p-1 text-xs flex flex-col gap-1 ${inMonth ? 'bg-base-100 border-base-200' : 'bg-base-200/40 border-transparent text-base-content/40'} ${key === today ? 'ring-1 ring-primary' : ''}`}>
              <button className="text-left font-medium hover:text-primary" onClick={() => key >= today && onNew(key)} title={key >= today ? 'New booking on this day' : undefined}>{d.getDate()}</button>
              {(byDay[key] ?? []).map((b) => (
                <button key={b.id} onClick={() => onOpen(b.id)}
                        className={`text-left rounded px-1 py-0.5 truncate ${b.status === 'Pending' ? 'bg-warning/20 border border-dashed border-warning' : b.status === 'Completed' ? 'bg-base-200' : 'bg-success/20'}`}
                        title={`${b.event_title || EVENT_TYPES[b.event_type]} - ${b.hall?.name}`}>
                  {time12(b.start_time)} {b.hall?.name}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const emptyVenue = { location_id: '', name: '', description: '', capacity: '100', min_guests: '', price: '', rent_type: 'per_event', buffer_minutes: '60', is_active: true };

function VenueManager({ venues, locations, onChanged, onError }: {
  venues: Venue[] | null;
  locations: { id: number; name: string }[];
  onChanged: () => void;
  onError: (m: string) => void;
}) {
  const [editing, setEditing] = useState<{ id: number | null; form: typeof emptyVenue } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useDialogs();

  const startNew = () => setEditing({ id: null, form: { ...emptyVenue, location_id: String(locations[0]?.id ?? '') } });
  const startEdit = (v: Venue) => setEditing({ id: v.id, form: {
    location_id: String(v.location?.id ?? ''), name: v.name, description: v.description ?? '', capacity: String(v.capacity ?? ''),
    min_guests: v.min_guests ? String(v.min_guests) : '', price: String(v.price), rent_type: v.rent_type, buffer_minutes: String(v.buffer_minutes), is_active: v.is_active,
  } });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true); setError(null);
    const f = editing.form;
    const body = {
      location_id: Number(f.location_id), name: f.name, description: f.description || null, capacity: Number(f.capacity),
      min_guests: f.min_guests ? Number(f.min_guests) : null, price: Number(f.price), rent_type: f.rent_type,
      buffer_minutes: Number(f.buffer_minutes), is_active: f.is_active,
    };
    try {
      await fetchApi(editing.id ? `/venues/${editing.id}` : '/venues', { method: editing.id ? 'PUT' : 'POST', body: JSON.stringify(body) });
      setEditing(null);
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the venue.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (v: Venue) => {
    if (!(await confirm({ title: `Delete ${v.name}?`, message: 'Past bookings in it are deleted too. To stop taking bookings but keep its history, switch it off instead.', action: 'Delete venue' }))) return;
    try { await fetchApi(`/venues/${v.id}`, { method: 'DELETE' }); onChanged(); } catch (err) { onError(apiErrorMessage(err, 'Could not delete the venue.')); }
  };

  const set = (key: keyof typeof emptyVenue) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    editing && setEditing({ ...editing, form: { ...editing.form, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value } });

  return (
    <div className="space-y-3">
      {dialog}
      <div className="flex justify-between items-center">
        <p className="text-sm text-base-content/60">Your halls and rooms for events. The cleanup time is kept free after each event before the next can start.</p>
        <button className="btn btn-sm btn-primary gap-1" onClick={startNew}><Plus size={14} /> Add venue</button>
      </div>
      {venues === null ? <span className="loading loading-spinner" /> : venues.length === 0 ? <p className="text-center py-10 text-base-content/60">No venues yet.</p> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {venues.map((v) => (
            <div key={v.id} className={`rounded-xl border p-4 space-y-2 ${v.is_active ? 'border-base-200 bg-base-100' : 'border-dashed border-base-300 opacity-70'}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="font-semibold">{v.name}</div>
                  <div className="text-xs text-base-content/60">{v.location?.name}</div>
                </div>
                {!v.is_active && <span className="badge badge-sm">Off</span>}
              </div>
              <div className="text-sm space-y-0.5">
                <div>{v.min_guests ? `${v.min_guests}-` : 'Up to '}{v.capacity} guests</div>
                <div className="font-medium">{money(v.price)} {v.rent_type === 'per_hour' ? 'per hour' : 'per event'}</div>
                <div className="text-xs text-base-content/60">{v.buffer_minutes} min cleanup between events</div>
              </div>
              {v.description && <p className="text-xs text-base-content/70 line-clamp-3">{v.description}</p>}
              <div className="flex gap-1">
                <button className="btn btn-xs btn-ghost" onClick={() => startEdit(v)}><Pencil size={12} /> Edit</button>
                <button className="btn btn-xs btn-ghost text-error" onClick={() => remove(v)}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <form className="space-y-3" onSubmit={save}>
            <h3 className="font-semibold text-lg">{editing.id ? 'Edit venue' : 'Add venue'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2"><span className="label-text text-xs font-medium mb-1 block">Name</span>
                <input required maxLength={120} className="input input-bordered w-full" placeholder="Grand Hall" value={editing.form.name} onChange={set('name')} />
              </label>
              {locations.length > 1 && (
                <label className="block col-span-2"><span className="label-text text-xs font-medium mb-1 block">Branch</span>
                  <select className="select select-bordered w-full" value={editing.form.location_id} onChange={set('location_id')}>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </label>
              )}
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Most guests</span>
                <input required type="number" min={1} className="input input-bordered w-full" value={editing.form.capacity} onChange={set('capacity')} />
              </label>
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Fewest guests (optional)</span>
                <input type="number" min={1} className="input input-bordered w-full" value={editing.form.min_guests} onChange={set('min_guests')} />
              </label>
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Rent (৳)</span>
                <input required type="number" min={0} className="input input-bordered w-full" value={editing.form.price} onChange={set('price')} />
              </label>
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Charged</span>
                <select className="select select-bordered w-full" value={editing.form.rent_type} onChange={set('rent_type')}>
                  <option value="per_event">Per event</option>
                  <option value="per_hour">Per hour</option>
                </select>
              </label>
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Cleanup time (minutes)</span>
                <input type="number" min={0} max={720} className="input input-bordered w-full" value={editing.form.buffer_minutes} onChange={set('buffer_minutes')} />
              </label>
              <label className="flex items-center gap-2 cursor-pointer self-end pb-3">
                <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={editing.form.is_active} onChange={set('is_active')} /> Taking bookings
              </label>
              <label className="block col-span-2"><span className="label-text text-xs font-medium mb-1 block">Description (optional)</span>
                <textarea maxLength={2000} rows={2} className="textarea textarea-bordered w-full" placeholder="Air-conditioned, stage, sound system, parking for 30 cars..." value={editing.form.description} onChange={set('description')} />
              </label>
            </div>
            {error && <div role="alert" className="alert alert-error text-sm py-2 whitespace-pre-line">{error}</div>}
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? <span className="loading loading-spinner loading-sm" /> : 'Save venue'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const emptyPackage = { name: '', description: '', price_per_person: '', min_guests: '', is_active: true };

function PackageManager({ packages, onChanged, onError }: { packages: VenuePackage[]; onChanged: () => void; onError: (m: string) => void }) {
  const [editing, setEditing] = useState<{ id: number | null; form: typeof emptyPackage } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useDialogs();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true); setError(null);
    const f = editing.form;
    try {
      await fetchApi(editing.id ? `/venue-packages/${editing.id}` : '/venue-packages', {
        method: editing.id ? 'PUT' : 'POST',
        body: JSON.stringify({ name: f.name, description: f.description || null, price_per_person: Number(f.price_per_person), min_guests: f.min_guests ? Number(f.min_guests) : null, is_active: f.is_active }),
      });
      setEditing(null);
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the package.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: VenuePackage) => {
    if (!(await confirm({ title: `Delete ${p.name}?`, message: 'Bookings that include it keep its name and price.', action: 'Delete package' }))) return;
    try { await fetchApi(`/venue-packages/${p.id}`, { method: 'DELETE' }); onChanged(); } catch (err) { onError(apiErrorMessage(err, 'Could not delete the package.')); }
  };

  const set = (key: keyof typeof emptyPackage) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    editing && setEditing({ ...editing, form: { ...editing.form, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value } });

  return (
    <div className="space-y-3">
      {dialog}
      <div className="flex justify-between items-center">
        <p className="text-sm text-base-content/60">Per-person menus for events. A booking keeps the price agreed, even if you change it here later.</p>
        <button className="btn btn-sm btn-primary gap-1" onClick={() => setEditing({ id: null, form: emptyPackage })}><Plus size={14} /> Add package</button>
      </div>
      {packages.length === 0 ? <p className="text-center py-10 text-base-content/60">No food packages yet. Venue-only bookings work without one.</p> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {packages.map((p) => (
            <div key={p.id} className={`rounded-xl border p-4 space-y-2 ${p.is_active ? 'border-base-200 bg-base-100' : 'border-dashed border-base-300 opacity-70'}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 font-semibold">{p.name}</div>
                {!p.is_active && <span className="badge badge-sm">Off</span>}
              </div>
              <div className="font-medium">{money(p.price_per_person)} <span className="text-sm font-normal text-base-content/60">per person{p.min_guests ? `, ${p.min_guests}+ guests` : ''}</span></div>
              {p.description && <p className="text-xs text-base-content/70 whitespace-pre-line line-clamp-4">{p.description}</p>}
              <div className="flex gap-1">
                <button className="btn btn-xs btn-ghost" onClick={() => setEditing({ id: p.id, form: { name: p.name, description: p.description ?? '', price_per_person: String(p.price_per_person), min_guests: p.min_guests ? String(p.min_guests) : '', is_active: p.is_active } })}><Pencil size={12} /> Edit</button>
                <button className="btn btn-xs btn-ghost text-error" onClick={() => remove(p)}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <form className="space-y-3" onSubmit={save}>
            <h3 className="font-semibold text-lg">{editing.id ? 'Edit package' : 'Add food package'}</h3>
            <label className="block"><span className="label-text text-xs font-medium mb-1 block">Name</span>
              <input required maxLength={120} className="input input-bordered w-full" placeholder="Wedding Platter" value={editing.form.name} onChange={set('name')} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Price per person (৳)</span>
                <input required type="number" min={0} className="input input-bordered w-full" value={editing.form.price_per_person} onChange={set('price_per_person')} />
              </label>
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Fewest guests (optional)</span>
                <input type="number" min={1} className="input input-bordered w-full" value={editing.form.min_guests} onChange={set('min_guests')} />
              </label>
            </div>
            <label className="block"><span className="label-text text-xs font-medium mb-1 block">What it includes</span>
              <textarea maxLength={2000} rows={4} className="textarea textarea-bordered w-full" placeholder={'Kacchi biryani\nChicken roast\nBorhani\nFirni'} value={editing.form.description} onChange={set('description')} />
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={editing.form.is_active} onChange={set('is_active')} /> Offered for new bookings
            </label>
            {error && <div role="alert" className="alert alert-error text-sm py-2 whitespace-pre-line">{error}</div>}
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? <span className="loading loading-spinner loading-sm" /> : 'Save package'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
