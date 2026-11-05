'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { BedDouble, CalendarRange, ChevronLeft, ChevronRight, ConciergeBell, Pencil, Phone, Plus, Search, Trash2, Upload, Users, X } from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Modal, useDialogs } from '@/components/ui/Dialogs';
import RoomBookingForm from './RoomBookingForm';
import RoomBookingDetail from './RoomBookingDetail';
import { STATUS_BADGE, addDays, money, shortDate, storageUrl, ymd, type RoomBookingDetail as Detail, type RoomBookingSummary, type RoomType } from './types';

/**
 * Hotel rooms (the `hotel` add-on module).
 *
 *   - Front desk: today's arrivals, who is in house, today's departures,
 *     upcoming stays, requests from the website, past stays.
 *   - Availability: free rooms per type for the next two weeks; click a
 *     night to book it.
 *   - Rooms: room types (rates, capacity, photos) and their numbered rooms.
 *
 * Availability, pricing and double-booking are core-api's.
 */

type Tab = 'desk' | 'availability' | 'rooms';
type View = 'arrivals' | 'in_house' | 'departures' | 'upcoming' | 'pending' | 'past' | 'all';
const VIEWS: { key: View; label: string }[] = [
  { key: 'arrivals', label: 'Arriving today' },
  { key: 'in_house', label: 'In house' },
  { key: 'departures', label: 'Leaving today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'pending', label: 'Requests' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
];

export default function HotelPage() {
  const [tab, setTab] = useState<Tab>('desk');
  const [types, setTypes] = useState<RoomType[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<{ booking: Detail | null; initial?: { room_type_id?: number; check_in?: string } } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);

  const loadTypes = useCallback(async () => {
    try { setTypes((await fetchApi('/hotel/room-types')).room_types); } catch (err) { setError(apiErrorMessage(err, 'Could not load the rooms.')); setTypes([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadTypes, 0);
    fetchApi('/locations').then((res) => setLocations((res?.data ?? res ?? []).map((l: { id: number; name: string }) => ({ id: l.id, name: l.name })))).catch(() => {});
    return () => clearTimeout(t);
  }, [loadTypes]);

  const open = async (id: number) => {
    try { setDetail(await fetchApi(`/hotel/bookings/${id}`)); } catch (err) { setError(apiErrorMessage(err, 'Could not open the booking.')); }
  };
  const changed = () => setRefresh((n) => n + 1);
  const bookable = (types ?? []).some((t) => t.is_active && (t.rooms ?? []).some((r) => r.in_service));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <h1 className="text-2xl font-bold flex items-center gap-2"><BedDouble className="text-primary" /> Hotel</h1>
          <p className="text-sm text-base-content/60">Rooms, stays and the front desk. Guests can request rooms on your website with their phone number.</p>
        </div>
        <button className="btn btn-primary btn-sm gap-1" disabled={!bookable} onClick={() => setForm({ booking: null })}><Plus size={16} /> New booking</button>
      </div>

      <div role="tablist" className="tabs tabs-border">
        <button role="tab" className={`tab gap-1 ${tab === 'desk' ? 'tab-active' : ''}`} onClick={() => setTab('desk')}><ConciergeBell size={14} /> Front desk</button>
        <button role="tab" className={`tab gap-1 ${tab === 'availability' ? 'tab-active' : ''}`} onClick={() => setTab('availability')}><CalendarRange size={14} /> Availability</button>
        <button role="tab" className={`tab gap-1 ${tab === 'rooms' ? 'tab-active' : ''}`} onClick={() => setTab('rooms')}><BedDouble size={14} /> Rooms</button>
      </div>

      {error && <div role="alert" className="alert alert-error text-sm py-2"><span className="flex-1">{error}</span><button className="btn btn-xs btn-ghost" onClick={() => setError(null)}><X size={12} /></button></div>}
      {notice && <div role="status" className="alert alert-success text-sm py-2"><span className="flex-1">{notice}</span><button className="btn btn-xs btn-ghost" onClick={() => setNotice(null)}><X size={12} /></button></div>}

      {types !== null && !bookable && tab !== 'rooms' && (
        <div className="alert alert-info text-sm"><BedDouble size={16} /> Start by adding your room types and room numbers.<button className="btn btn-xs" onClick={() => setTab('rooms')}>Set up rooms</button></div>
      )}

      {tab === 'desk' && <FrontDesk refresh={refresh} onOpen={open} />}
      {tab === 'availability' && <Availability refresh={refresh} onBook={(room_type_id, check_in) => setForm({ booking: null, initial: { room_type_id, check_in } })} />}
      {tab === 'rooms' && <RoomSetup types={types} locations={locations} onChanged={loadTypes} onError={setError} />}

      {detail && <RoomBookingDetail key={detail.id} booking={detail} onClose={() => setDetail(null)} onChanged={changed} onEdit={(b) => { setDetail(null); setForm({ booking: b }); }} />}
      {form && types && (
        <RoomBookingForm
          booking={form.booking}
          types={types}
          initial={form.initial}
          onClose={() => setForm(null)}
          onSaved={(saved) => { setForm(null); changed(); setNotice(form.booking ? 'Booking updated.' : `Booking for ${saved.guest_name} saved.`); setDetail(saved); }}
        />
      )}
    </div>
  );
}

function FrontDesk({ refresh, onOpen }: { refresh: number; onOpen: (id: number) => void }) {
  const [view, setView] = useState<View>('arrivals');
  const [rows, setRows] = useState<RoomBookingSummary[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { const t = setTimeout(() => setSearch(query.trim()), 350); return () => clearTimeout(t); }, [query]);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ view });
    if (search) params.set('q', search);
    const load = () => fetchApi(`/hotel/bookings?${params}`).then((res) => { if (live) { setRows(res.data); setCounts(res.counts); } }).catch(() => { if (live) setRows([]); });
    load();
    // New website requests show up without a reload.
    const timer = setInterval(load, 60000);
    return () => { live = false; clearInterval(timer); };
  }, [view, search, refresh]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="tabs tabs-box tabs-sm">
          {VIEWS.map(({ key, label }) => (
            <button key={key} role="tab" className={`tab gap-1 ${view === key ? 'tab-active' : ''}`} onClick={() => { setRows(null); setView(key); }}>
              {label}{counts[key] ? <span className={`badge badge-xs ${key === 'pending' ? 'badge-warning' : 'badge-ghost'}`}>{counts[key]}</span> : null}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <label className="input input-sm input-bordered flex items-center gap-2 w-full sm:w-60">
          <Search size={14} className="opacity-50" />
          <input className="grow" placeholder="Name, phone or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      {rows === null ? <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
        : rows.length === 0 ? <p className="text-center py-12 text-base-content/60">No stays here.</p>
          : (
            <ul className="space-y-2">
              {rows.map((b) => (
                <li key={b.id}>
                  <button onClick={() => onOpen(b.id)} className={`w-full text-left rounded-xl border bg-base-100 p-4 flex flex-col sm:flex-row gap-3 hover:border-primary ${b.status === 'Pending' ? 'border-warning/60' : 'border-base-200'}`}>
                    <div className="sm:w-44 shrink-0">
                      <div className="text-sm font-semibold text-primary">{shortDate(b.check_in)} → {shortDate(b.check_out)}</div>
                      <div className="text-xs text-base-content/60">{b.nights} night{b.nights === 1 ? '' : 's'}</div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{b.guest_name}</span>
                        <span className={`badge badge-sm ${STATUS_BADGE[b.status] ?? 'badge-ghost'}`}>{b.status === 'Pending' ? 'Request' : b.status}</span>
                        {b.source === 'website' && <span className="badge badge-sm badge-ghost">Website</span>}
                      </div>
                      <div className="text-sm text-base-content/70 flex flex-wrap gap-x-3">
                        <span>{b.room_type?.name}{b.room ? ` · Room ${b.room.number}` : ''}</span>
                        <span className="flex items-center gap-1"><Users size={13} /> {b.adults}{b.children ? `+${b.children}` : ''}</span>
                        <span className="flex items-center gap-1"><Phone size={13} /> {b.guest_phone}</span>
                      </div>
                    </div>
                    <div className="sm:text-right text-sm shrink-0">
                      <div className="font-semibold">{money(b.total)}</div>
                      <div className={b.due > 0 ? 'text-warning' : 'text-success'}>{b.due > 0 ? `${money(b.due)} due` : 'Paid'}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
    </div>
  );
}

type Grid = { from: string; types: { id: number; name: string; rooms: number; nights: Record<string, { free: number; pending: number }> }[] };

/** Free rooms per type per night - the classic hotel grid. Click a night to book it. */
function Availability({ refresh, onBook }: { refresh: number; onBook: (typeId: number, date: string) => void }) {
  const [from, setFrom] = useState(() => ymd(new Date()));
  const [grid, setGrid] = useState<Grid | null>(null);
  const days = 14;

  useEffect(() => {
    let live = true;
    fetchApi(`/hotel/availability?from=${from}&days=${days}`).then((res: Grid) => { if (live) setGrid(res); }).catch(() => {});
    return () => { live = false; };
  }, [from, refresh]);

  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
  const today = ymd(new Date());

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="btn btn-sm btn-ghost btn-square" onClick={() => setFrom(addDays(from, -7))} aria-label="Earlier"><ChevronLeft size={16} /></button>
        <span className="font-medium text-sm">{shortDate(from)} - {shortDate(addDays(from, days - 1))}</span>
        <button className="btn btn-sm btn-ghost btn-square" onClick={() => setFrom(addDays(from, 7))} aria-label="Later"><ChevronRight size={16} /></button>
        <button className="btn btn-sm btn-ghost" onClick={() => setFrom(today)}>Today</button>
        <span className="text-xs text-base-content/60 ml-auto">Rooms free each night · <span className="text-warning">+n</span> requests waiting</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-base-200">
        <table className="table table-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-base-100 z-10">Room type</th>
              {dates.map((d) => {
                const dt = new Date(`${d}T00:00:00`);
                const weekend = dt.getDay() === 5 || dt.getDay() === 6;
                return <th key={d} className={`text-center text-xs ${weekend ? 'bg-base-200' : ''} ${d === today ? 'text-primary' : ''}`}>{dt.toLocaleDateString(undefined, { weekday: 'short' })}<br />{dt.getDate()}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {(grid?.types ?? []).map((t) => (
              <tr key={t.id}>
                <td className="sticky left-0 bg-base-100 z-10 whitespace-nowrap"><div className="font-medium">{t.name}</div><div className="text-xs text-base-content/50">{t.rooms} rooms</div></td>
                {dates.map((d) => {
                  const n = t.nights[d];
                  const free = n?.free ?? 0;
                  return (
                    <td key={d} className="p-1 text-center">
                      <button
                        disabled={d < today || free < 1}
                        onClick={() => onBook(t.id, d)}
                        className={`w-full rounded-md py-1 text-sm font-semibold ${free < 1 ? 'bg-error/15 text-error' : free <= Math.max(1, Math.floor(t.rooms / 4)) ? 'bg-warning/20' : 'bg-success/15 text-success'} ${d < today ? 'opacity-40' : 'hover:ring-1 hover:ring-primary'}`}
                        title={free < 1 ? 'Full' : `${free} free - click to book`}
                      >
                        {free}{n?.pending ? <span className="text-warning text-[10px] align-top"> +{n.pending}</span> : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {grid && grid.types.length === 0 && <p className="text-center py-8 text-base-content/60">No room types switched on.</p>}
      </div>
    </div>
  );
}

const emptyType = { location_id: '', name: '', description: '', max_adults: '2', max_children: '0', rate: '', weekend_rate: '', beds: '', size_sqft: '', amenities: '', photos: [] as string[], is_active: true };

/** Room types with their rooms - add rooms in ranges ("101-110"), take one out of service. */
function RoomSetup({ types, locations, onChanged, onError }: {
  types: RoomType[] | null;
  locations: { id: number; name: string }[];
  onChanged: () => void;
  onError: (m: string) => void;
}) {
  const [editing, setEditing] = useState<{ id: number | null; form: typeof emptyType } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomInput, setRoomInput] = useState<Record<number, string>>({});
  const { confirm, dialog } = useDialogs();

  const startEdit = (t: RoomType) => setEditing({ id: t.id, form: {
    location_id: String(t.location?.id ?? ''), name: t.name, description: t.description ?? '', max_adults: String(t.max_adults), max_children: String(t.max_children),
    rate: String(t.rate), weekend_rate: t.weekend_rate !== null ? String(t.weekend_rate) : '', beds: t.beds ?? '', size_sqft: t.size_sqft ? String(t.size_sqft) : '',
    amenities: t.amenities.join(', '), photos: t.photos, is_active: t.is_active,
  } });

  const set = (key: keyof typeof emptyType) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    editing && setEditing({ ...editing, form: { ...editing.form, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value } });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true); setError(null);
    const f = editing.form;
    try {
      await fetchApi(editing.id ? `/hotel/room-types/${editing.id}` : '/hotel/room-types', {
        method: editing.id ? 'PUT' : 'POST',
        body: JSON.stringify({
          location_id: Number(f.location_id), name: f.name, description: f.description || null, max_adults: Number(f.max_adults), max_children: Number(f.max_children) || 0,
          rate: Number(f.rate), weekend_rate: f.weekend_rate === '' ? null : Number(f.weekend_rate), beds: f.beds || null, size_sqft: f.size_sqft ? Number(f.size_sqft) : null,
          amenities: f.amenities.split(',').map((a) => a.trim()).filter(Boolean), photos: f.photos, is_active: f.is_active,
        }),
      });
      setEditing(null);
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the room type.'));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (files: FileList) => {
    if (!editing) return;
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const file of Array.from(files).slice(0, 12 - editing.form.photos.length)) {
        const body = new FormData();
        body.append('image', file);
        paths.push((await fetchApi('/hotel/photos', { method: 'POST', body })).path);
      }
      setEditing({ ...editing, form: { ...editing.form, photos: [...editing.form.photos, ...paths] } });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not upload the photo.'));
    } finally {
      setUploading(false);
    }
  };

  const addRooms = async (typeId: number) => {
    const numbers = (roomInput[typeId] ?? '').trim();
    if (!numbers) return;
    try { await fetchApi(`/hotel/room-types/${typeId}/rooms`, { method: 'POST', body: JSON.stringify({ numbers }) }); setRoomInput({ ...roomInput, [typeId]: '' }); onChanged(); } catch (err) { onError(apiErrorMessage(err, 'Could not add the rooms.')); }
  };

  const toggleRoom = async (roomId: number, inService: boolean) => {
    try { await fetchApi(`/hotel/rooms/${roomId}`, { method: 'PUT', body: JSON.stringify({ in_service: inService }) }); onChanged(); } catch (err) { onError(apiErrorMessage(err, 'Could not update the room.')); }
  };

  const removeRoom = async (roomId: number, number: string) => {
    if (!(await confirm({ title: `Delete room ${number}?`, message: 'To stop selling it for a while, take it out of service instead.', action: 'Delete room' }))) return;
    try { await fetchApi(`/hotel/rooms/${roomId}`, { method: 'DELETE' }); onChanged(); } catch (err) { onError(apiErrorMessage(err, 'Could not delete the room.')); }
  };

  const removeType = async (t: RoomType) => {
    if (!(await confirm({ title: `Delete ${t.name}?`, message: 'Its rooms and past stays are deleted too. To stop selling it, switch it off instead.', action: 'Delete room type' }))) return;
    try { await fetchApi(`/hotel/room-types/${t.id}`, { method: 'DELETE' }); onChanged(); } catch (err) { onError(apiErrorMessage(err, 'Could not delete the room type.')); }
  };

  return (
    <div className="space-y-3">
      {dialog}
      <div className="flex justify-between items-center">
        <p className="text-sm text-base-content/60">Room types are what guests book; rooms are the numbered rooms of each. Friday and Saturday nights use the weekend rate when one is set.</p>
        <button className="btn btn-sm btn-primary gap-1" onClick={() => setEditing({ id: null, form: { ...emptyType, location_id: String(locations[0]?.id ?? '') } })}><Plus size={14} /> Add room type</button>
      </div>
      {types === null ? <span className="loading loading-spinner" /> : types.length === 0 ? <p className="text-center py-10 text-base-content/60">No room types yet.</p> : (
        <div className="grid lg:grid-cols-2 gap-3">
          {types.map((t) => (
            <div key={t.id} className={`rounded-xl border p-4 space-y-3 ${t.is_active ? 'border-base-200 bg-base-100' : 'border-dashed border-base-300 opacity-70'}`}>
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.photos[0] && <img src={storageUrl(t.photos[0])} alt="" className="w-24 h-20 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold flex items-center gap-2">{t.name}{!t.is_active && <span className="badge badge-sm">Off</span>}</div>
                  <div className="text-sm">{money(t.rate)}/night{t.weekend_rate !== null ? ` · ${money(t.weekend_rate)} Fri-Sat` : ''}</div>
                  <div className="text-xs text-base-content/60">{t.max_adults} adults{t.max_children ? `, ${t.max_children} children` : ''}{t.beds ? ` · ${t.beds}` : ''}{t.location ? ` · ${t.location.name}` : ''}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button className="btn btn-xs btn-ghost" onClick={() => startEdit(t)}><Pencil size={12} /> Edit</button>
                  <button className="btn btn-xs btn-ghost text-error" onClick={() => removeType(t)}><Trash2 size={12} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(t.rooms ?? []).map((r) => (
                  <span key={r.id} className={`badge gap-1 ${r.in_service ? 'badge-outline' : 'badge-ghost line-through'}`}>
                    {r.number}
                    <button className="opacity-60 hover:opacity-100 text-[10px]" onClick={() => toggleRoom(r.id, !r.in_service)} title={r.in_service ? 'Take out of service' : 'Back in service'}>{r.in_service ? 'off' : 'on'}</button>
                    <button className="opacity-60 hover:opacity-100" onClick={() => removeRoom(r.id, r.number)} aria-label={`Delete room ${r.number}`}><X size={10} /></button>
                  </span>
                ))}
                {(t.rooms ?? []).length === 0 && <span className="text-xs text-warning">No rooms yet - add their numbers below.</span>}
              </div>
              <div className="join w-full">
                <input className="input input-sm input-bordered join-item w-full" placeholder="Room numbers: 101-110 or 201, 202" value={roomInput[t.id] ?? ''} onChange={(e) => setRoomInput({ ...roomInput, [t.id]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRooms(t.id); } }} />
                <button className="btn btn-sm join-item" onClick={() => addRooms(t.id)}>Add rooms</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} wide>
          <form className="space-y-3" onSubmit={save}>
            <h3 className="font-semibold text-lg">{editing.id ? 'Edit room type' : 'Add room type'}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Name</span>
                <input required maxLength={120} className="input input-bordered w-full" placeholder="Deluxe Double" value={editing.form.name} onChange={set('name')} />
              </label>
              {locations.length > 1 ? (
                <label className="block"><span className="label-text text-xs font-medium mb-1 block">Branch</span>
                  <select className="select select-bordered w-full" value={editing.form.location_id} onChange={set('location_id')}>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </label>
              ) : <div />}
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Rate per night (৳)</span>
                <input required type="number" min={0} className="input input-bordered w-full" value={editing.form.rate} onChange={set('rate')} />
              </label>
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Weekend rate - Fri &amp; Sat nights (optional)</span>
                <input type="number" min={0} className="input input-bordered w-full" value={editing.form.weekend_rate} onChange={set('weekend_rate')} />
              </label>
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Adults</span>
                <input required type="number" min={1} max={20} className="input input-bordered w-full" value={editing.form.max_adults} onChange={set('max_adults')} />
              </label>
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Children</span>
                <input type="number" min={0} max={20} className="input input-bordered w-full" value={editing.form.max_children} onChange={set('max_children')} />
              </label>
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Beds</span>
                <input maxLength={120} className="input input-bordered w-full" placeholder="1 king bed" value={editing.form.beds} onChange={set('beds')} />
              </label>
              <label className="block"><span className="label-text text-xs font-medium mb-1 block">Size (sq ft)</span>
                <input type="number" min={1} className="input input-bordered w-full" value={editing.form.size_sqft} onChange={set('size_sqft')} />
              </label>
              <label className="block sm:col-span-2"><span className="label-text text-xs font-medium mb-1 block">Amenities (comma separated)</span>
                <input className="input input-bordered w-full" placeholder="AC, Wi-Fi, TV, Hot water, Breakfast" value={editing.form.amenities} onChange={set('amenities')} />
              </label>
              <label className="block sm:col-span-2"><span className="label-text text-xs font-medium mb-1 block">Description</span>
                <textarea maxLength={3000} rows={3} className="textarea textarea-bordered w-full" value={editing.form.description} onChange={set('description')} />
              </label>
            </div>
            <div>
              <span className="label-text text-xs font-medium mb-1 block">Photos ({editing.form.photos.length}/12)</span>
              <div className="flex flex-wrap gap-2">
                {editing.form.photos.map((p) => (
                  <div key={p} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={storageUrl(p)} alt="" className="w-20 h-16 rounded object-cover" />
                    <button type="button" className="btn btn-xs btn-circle absolute -top-2 -right-2" onClick={() => setEditing({ ...editing, form: { ...editing.form, photos: editing.form.photos.filter((x) => x !== p) } })} aria-label="Remove photo"><X size={10} /></button>
                  </div>
                ))}
                {editing.form.photos.length < 12 && (
                  <label className="btn btn-sm btn-outline h-16 w-20">
                    {uploading ? <span className="loading loading-spinner loading-xs" /> : <Upload size={14} />}
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
                  </label>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={editing.form.is_active} onChange={set('is_active')} /> Taking bookings
            </label>
            {error && <div role="alert" className="alert alert-error text-sm py-2 whitespace-pre-line">{error}</div>}
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? <span className="loading loading-spinner loading-sm" /> : 'Save room type'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
