'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck, Check, Copy, Globe, MapPin, Pencil, Phone, PhoneCall, Plus, RotateCcw, Search, Users, X, Armchair, UserCheck, UserX, Ban, Store, Mail,
} from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Modal, useDialogs } from '@/components/ui/Dialogs';

/**
 * Table bookings: the restaurant's side.
 *
 * Website requests land under Requests, Pending, with the guest's phone
 * number. Staff call the guest (the number is a tap-to-call link), note the
 * call, and approve - optionally giving a table - or decline with a reason.
 * Approved bookings move through Seated and Completed, or No-show. Staff take
 * phone and walk-in bookings here too.
 *
 * Statuses and what may follow each come from core-api (`next` on every
 * booking), so this page never offers a step the API would refuse.
 */

type Booking = {
  id: number;
  status: string;
  next: string[];
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  guests: number | null;
  at: string | null;
  date: string | null;
  time: string | null;
  location: { id: number; name: string } | null;
  table: { id: number; name: string; capacity: number | null } | null;
  notes: string | null;
  source: string;
  decline_reason: string | null;
  handled_by: string | null;
  handled_at: string | null;
  called_at: string | null;
  called_by: string | null;
  last_emailed_at: string | null;
  created_at: string | null;
};

type Location = { id: number; name: string };
type TableRow = { id: number; name: string; capacity: number | null };
type View = 'requests' | 'today' | 'upcoming' | 'past' | 'all';

const VIEWS: { key: View; label: string }[] = [
  { key: 'requests', label: 'Requests' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
];

const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-warning',
  Confirmed: 'badge-success',
  Seated: 'badge-info',
  Completed: 'badge-ghost',
  Declined: 'badge-error',
  Cancelled: 'badge-error badge-outline',
  'No-show': 'badge-neutral',
};

/** What each move is called on its button, and how it looks. */
const ACTIONS: Record<string, { label: string; className: string; Icon: typeof Check }> = {
  Confirmed: { label: 'Approve', className: 'btn-success', Icon: Check },
  Declined: { label: 'Decline', className: 'btn-error btn-outline', Icon: X },
  Seated: { label: 'Seated', className: 'btn-info', Icon: Armchair },
  Completed: { label: 'Completed', className: 'btn-ghost border-base-300', Icon: UserCheck },
  'No-show': { label: 'No-show', className: 'btn-ghost border-base-300', Icon: UserX },
  Cancelled: { label: 'Cancel booking', className: 'btn-ghost text-error', Icon: Ban },
  Pending: { label: 'Reopen', className: 'btn-ghost border-base-300', Icon: RotateCcw },
};

const DECLINE_REASONS = ['Fully booked at that time', 'Closed on that day', 'Could not reach the guest', 'Too large a group for us'];

const dayLabel = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

const time12 = (t: string | null) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const ago = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

export default function BookingsPage() {
  const [view, setView] = useState<View>('requests');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [counts, setCounts] = useState({ requests: 0, today: 0, upcoming: 0 });
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [approving, setApproving] = useState<Booking | null>(null);
  const [declining, setDeclining] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | 'new' | null>(null);
  const { confirm, dialog } = useDialogs();

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ view });
      if (locationId) params.set('location_id', locationId);
      if (search) params.set('q', search);
      const res = await fetchApi(`/reservations?${params}`);
      setBookings(res.data);
      setCounts(res.counts);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the bookings.'));
      setBookings([]);
    }
  }, [view, locationId, search]);

  useEffect(() => {
    // Initial and on filter change; then every minute, so a new website
    // request shows up without a reload.
    const first = setTimeout(load, 0);
    const timer = setInterval(load, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [load]);

  useEffect(() => {
    fetchApi('/locations').then((res) => setLocations((res?.data ?? res ?? []).map((l: Location) => ({ id: l.id, name: l.name })))).catch(() => {});
  }, []);

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const replace = (updated: Booking) => setBookings((list) => list?.map((b) => (b.id === updated.id ? updated : b)) ?? null);

  const move = async (booking: Booking, status: string, extra: Record<string, unknown> = {}) => {
    setBusyId(booking.id); setError(null);
    try {
      replace(await fetchApi(`/reservations/${booking.id}/status`, { method: 'POST', body: JSON.stringify({ status, ...extra }) }));
      setNotice(
        status === 'Confirmed' ? `${booking.guest_name}'s booking is approved.`
          : status === 'Declined' ? `${booking.guest_name}'s booking is declined.`
            : `Marked ${status.toLowerCase()}.`,
      );
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update the booking.'));
    } finally {
      setBusyId(null);
    }
  };

  const act = async (booking: Booking, status: string) => {
    if (status === 'Confirmed' && booking.status === 'Pending') return setApproving(booking);
    if (status === 'Declined') return setDeclining(booking);
    if (status === 'Cancelled' && !(await confirm({
      title: `Cancel ${booking.guest_name}'s booking?`,
      message: booking.guest_email ? `The guest is emailed at ${booking.guest_email}. It can be reopened later.` : 'There is no email on this booking - let the guest know by phone. It can be reopened later.',
      action: 'Cancel booking',
    }))) return;
    if (status === 'No-show' && !(await confirm({ title: 'Mark as a no-show?', message: `${booking.guest_name} did not come.`, action: 'Mark no-show', tone: 'btn-warning' }))) return;
    move(booking, status);
  };

  const markCalled = async (booking: Booking) => {
    setBusyId(booking.id);
    try { replace(await fetchApi(`/reservations/${booking.id}/called`, { method: 'POST' })); } catch (err) { setError(apiErrorMessage(err, 'Could not save that.')); } finally { setBusyId(null); }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setNotice(`Copied ${text}`); } catch { /* the number is on screen to copy by hand */ }
  };

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck className="text-primary" /> Table bookings</h1>
          <p className="text-sm text-base-content/60">Call the guest, then approve or decline. Requests from your website arrive here.</p>
        </div>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => setEditing('new')}><Plus size={16} /> New booking</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="tabs tabs-box tabs-sm">
          {VIEWS.map(({ key, label }) => {
            const n = key === 'requests' ? counts.requests : key === 'today' ? counts.today : key === 'upcoming' ? counts.upcoming : 0;
            return (
              <button key={key} role="tab" className={`tab gap-1 ${view === key ? 'tab-active' : ''}`} onClick={() => { setBookings(null); setView(key); }}>
                {label}
                {n > 0 && <span className={`badge badge-xs ${key === 'requests' ? 'badge-warning' : 'badge-ghost'}`}>{n}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <label className="input input-sm input-bordered flex items-center gap-2 w-full sm:w-60">
          <Search size={14} className="opacity-50" />
          <input className="grow" placeholder="Name or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {locations.length > 1 && (
          <select className="select select-sm select-bordered" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">All branches</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      {error && <div role="alert" className="alert alert-error text-sm py-2"><span className="flex-1">{error}</span><button className="btn btn-xs btn-ghost" onClick={() => setError(null)}><X size={12} /></button></div>}
      {notice && <div role="status" className="alert alert-success text-sm py-2"><span className="flex-1">{notice}</span><button className="btn btn-xs btn-ghost" onClick={() => setNotice(null)}><X size={12} /></button></div>}

      {bookings === null ? (
        <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary" /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-base-content/60">
          <CalendarCheck className="mx-auto mb-2 opacity-40" size={40} />
          {view === 'requests' ? 'No booking requests waiting. New ones from your website appear here.' : 'No bookings here.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              busy={busyId === b.id}
              onAct={(status) => act(b, status)}
              onCalled={() => markCalled(b)}
              onCopy={copy}
              onEdit={() => setEditing(b)}
            />
          ))}
        </ul>
      )}

      {approving && (
        <ApproveModal
          booking={approving}
          onClose={() => setApproving(null)}
          onApprove={(tableId) => { const b = approving; setApproving(null); move(b, 'Confirmed', tableId ? { table_id: tableId } : {}); }}
        />
      )}
      {declining && (
        <DeclineModal
          booking={declining}
          onClose={() => setDeclining(null)}
          onDecline={(reason) => { const b = declining; setDeclining(null); move(b, 'Declined', { reason: reason || null }); }}
        />
      )}
      {editing && (
        <BookingForm
          booking={editing === 'new' ? null : editing}
          locations={locations}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => { setEditing(null); setNotice(created ? `Booking for ${saved.guest_name} added.` : 'Booking updated.'); load(); }}
        />
      )}
    </div>
  );
}

function BookingCard({ booking: b, busy, onAct, onCalled, onCopy, onEdit }: {
  booking: Booking;
  busy: boolean;
  onAct: (status: string) => void;
  onCalled: () => void;
  onCopy: (text: string) => void;
  onEdit: () => void;
}) {
  const open = ['Pending', 'Confirmed', 'Seated'].includes(b.status);
  // Approve first, the rest after; Reopen and Cancel last.
  const order = ['Confirmed', 'Seated', 'Completed', 'Declined', 'No-show', 'Pending', 'Cancelled'];
  const actions = [...b.next].sort((x, y) => order.indexOf(x) - order.indexOf(y));

  return (
    <li className={`rounded-xl border bg-base-100 p-4 flex flex-col md:flex-row gap-4 ${b.status === 'Pending' ? 'border-warning/60' : 'border-base-200'}`}>
      <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-0 md:w-32 shrink-0">
        <div className="text-sm font-semibold text-primary">{b.date ? dayLabel(b.date) : '—'}</div>
        <div className="text-2xl font-bold leading-tight">{time12(b.time)}</div>
        <div className="text-xs text-base-content/60">{b.date}</div>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-lg">{b.guest_name || 'Guest'}</span>
          <span className={`badge badge-sm ${STATUS_BADGE[b.status] ?? 'badge-ghost'}`}>{b.status}</span>
          <span className="badge badge-sm badge-ghost gap-1">{b.source === 'website' ? <><Globe size={10} /> Website</> : <><Store size={10} /> Staff</>}</span>
        </div>

        {b.guest_phone && (
          <div className="flex flex-wrap items-center gap-2">
            <a href={`tel:${b.guest_phone}`} className="btn btn-sm btn-outline btn-primary gap-1"><Phone size={14} /> {b.guest_phone}</a>
            <button className="btn btn-sm btn-ghost btn-square" onClick={() => onCopy(b.guest_phone!)} aria-label="Copy number"><Copy size={14} /></button>
            {open && (
              b.called_at
                ? <span className="text-xs text-success flex items-center gap-1"><PhoneCall size={12} /> Called {ago(b.called_at)}{b.called_by ? ` by ${b.called_by}` : ''}</span>
                : <button className="btn btn-xs btn-ghost border-base-300" disabled={busy} onClick={onCalled}><PhoneCall size={12} /> I called the guest</button>
            )}
          </div>
        )}

        {b.guest_email
          ? <div className="text-xs text-base-content/60 flex items-center gap-1"><Mail size={12} /> <a className="link link-hover" href={`mailto:${b.guest_email}`}>{b.guest_email}</a>{b.last_emailed_at ? ` · emailed ${ago(b.last_emailed_at)}` : ''}</div>
          : open && <div className="text-xs text-base-content/50 flex items-center gap-1"><Mail size={12} /> No email - the guest is not emailed about this booking</div>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-base-content/70">
          <span className="flex items-center gap-1"><Users size={14} /> {b.guests} guest{b.guests === 1 ? '' : 's'}</span>
          {b.location && <span className="flex items-center gap-1"><MapPin size={14} /> {b.location.name}</span>}
          {b.table && <span className="flex items-center gap-1"><Armchair size={14} /> Table {b.table.name}{b.table.capacity ? ` (${b.table.capacity} seats)` : ''}</span>}
        </div>
        {b.notes && <p className="text-sm bg-base-200 rounded-lg px-3 py-2 whitespace-pre-line">{b.notes}</p>}
        {b.decline_reason && <p className="text-sm text-error">Declined: {b.decline_reason}</p>}
        {b.handled_by && b.handled_at && (
          <p className="text-xs text-base-content/50">{b.status === 'Declined' ? 'Declined' : 'Approved'} by {b.handled_by}, {ago(b.handled_at)}</p>
        )}
        {b.source === 'website' && b.created_at && <p className="text-xs text-base-content/50">Requested {ago(b.created_at)}</p>}
      </div>

      <div className="flex md:flex-col flex-wrap gap-2 md:w-40 shrink-0 md:items-stretch">
        {actions.map((status) => {
          const a = ACTIONS[status];
          if (!a) return null;
          return (
            <button key={status} className={`btn btn-sm gap-1 ${a.className}`} disabled={busy} onClick={() => onAct(status)}>
              {busy ? <span className="loading loading-spinner loading-xs" /> : <a.Icon size={14} />} {a.label}
            </button>
          );
        })}
        {open && <button className="btn btn-sm btn-ghost gap-1" disabled={busy} onClick={onEdit}><Pencil size={14} /> Edit</button>}
      </div>
    </li>
  );
}

/** Approve, optionally giving the booking a table at its branch. */
function ApproveModal({ booking, onClose, onApprove }: { booking: Booking; onClose: () => void; onApprove: (tableId: number | null) => void }) {
  const [tables, setTables] = useState<TableRow[] | null>(null);
  const [tableId, setTableId] = useState<number | null>(booking.table?.id ?? null);

  useEffect(() => {
    if (!booking.location) return;
    fetchApi(`/locations/${booking.location.id}/tables`).then((res) => setTables(res?.data ?? res ?? [])).catch(() => setTables([]));
  }, [booking.location]);

  const fits = (t: TableRow) => !t.capacity || !booking.guests || t.capacity >= booking.guests;

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Approve {booking.guest_name}&apos;s booking</h3>
        <p className="text-sm text-base-content/70">
          {booking.guests} guests, {booking.date && dayLabel(booking.date)} at {time12(booking.time)}{booking.location ? `, ${booking.location.name}` : ''}.
          Have you called <a className="link link-primary" href={`tel:${booking.guest_phone}`}>{booking.guest_phone}</a> to confirm?
        </p>
        <div>
          <span className="label-text text-xs font-medium mb-2 block">Table (optional)</span>
          {tables === null ? <span className="loading loading-spinner loading-sm" /> : tables.length === 0 ? (
            <p className="text-xs text-base-content/60">No tables set up at this branch.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`btn btn-sm ${tableId === null ? 'btn-primary' : 'btn-ghost border-base-300'}`} onClick={() => setTableId(null)}>No table yet</button>
              {tables.map((t) => (
                <button key={t.id} type="button" onClick={() => setTableId(t.id)}
                        className={`btn btn-sm ${tableId === t.id ? 'btn-primary' : 'btn-ghost border-base-300'} ${fits(t) ? '' : 'opacity-60'}`}
                        title={fits(t) ? undefined : 'Fewer seats than guests'}>
                  {t.name}{t.capacity ? ` · ${t.capacity}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-success gap-1" onClick={() => onApprove(tableId)}><Check size={16} /> Approve</button>
        </div>
      </div>
    </Modal>
  );
}

/** Decline, with a reason kept on the booking (the guest is not told automatically). */
function DeclineModal({ booking, onClose, onDecline }: { booking: Booking; onClose: () => void; onDecline: (reason: string) => void }) {
  const [reason, setReason] = useState('');

  return (
    <Modal onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onDecline(reason.trim()); }}>
        <h3 className="font-semibold text-lg">Decline {booking.guest_name}&apos;s booking?</h3>
        <p className="text-sm text-base-content/70">
          {booking.guest_email
            ? <>They are emailed at {booking.guest_email}{reason ? ' with your reason' : ''}. You can also call <a className="link link-primary" href={`tel:${booking.guest_phone}`}>{booking.guest_phone}</a>.</>
            : <>There is no email on this booking - please call <a className="link link-primary" href={`tel:${booking.guest_phone}`}>{booking.guest_phone}</a> to let them know.</>}
        </p>
        <div className="flex flex-wrap gap-1">
          {DECLINE_REASONS.map((r) => (
            <button key={r} type="button" className={`badge badge-lg cursor-pointer ${reason === r ? 'badge-primary' : 'badge-ghost'}`} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
        <label className="block">
          <span className="label-text text-xs font-medium mb-1 block">Reason (optional, for your records)</span>
          <textarea className="textarea textarea-bordered w-full" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Keep it</button>
          <button type="submit" className="btn btn-error gap-1"><X size={16} /> Decline booking</button>
        </div>
      </form>
    </Modal>
  );
}

/** A booking taken by staff, or an existing one changed. */
function BookingForm({ booking, locations, onClose, onSaved }: {
  booking: Booking | null;
  locations: Location[];
  onClose: () => void;
  onSaved: (saved: Booking, created: boolean) => void;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState({
    name: booking?.guest_name ?? '',
    phone: booking?.guest_phone ?? '',
    email: booking?.guest_email ?? '',
    location_id: String(booking?.location?.id ?? locations[0]?.id ?? ''),
    date: booking?.date ?? today,
    time: booking?.time ?? '19:00',
    guests: String(booking?.guests ?? 2),
    table_id: booking?.table ? String(booking.table.id) : '',
    notes: booking?.notes ?? '',
  });
  const [tables, setTables] = useState<TableRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.location_id) return;
    let active = true;
    fetchApi(`/locations/${form.location_id}/tables`).then((res) => { if (active) setTables(res?.data ?? res ?? []); }).catch(() => { if (active) setTables([]); });
    return () => { active = false; };
  }, [form.location_id]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value, ...(key === 'location_id' ? { table_id: '' } : {}) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = {
        ...form,
        location_id: Number(form.location_id),
        guests: Number(form.guests),
        table_id: form.table_id ? Number(form.table_id) : null,
        notes: form.notes || null,
        email: form.email || null,
      };
      const saved = booking
        ? await fetchApi(`/reservations/${booking.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await fetchApi('/reservations', { method: 'POST', body: JSON.stringify(body) });
      onSaved(saved, !booking);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the booking.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <form className="space-y-3" onSubmit={save}>
        <h3 className="font-semibold text-lg">{booking ? 'Edit booking' : 'New booking'}</h3>
        {!booking && <p className="text-sm text-base-content/60">A booking taken by phone or at the door is approved as you add it.</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className="label-text text-xs font-medium mb-1 block">Guest name</span>
            <input required maxLength={100} className="input input-bordered w-full" value={form.name} onChange={set('name')} />
          </label>
          <label className="block"><span className="label-text text-xs font-medium mb-1 block">Phone (to confirm)</span>
            <input required type="tel" inputMode="tel" maxLength={20} placeholder="01XXXXXXXXX" className="input input-bordered w-full" value={form.phone} onChange={set('phone')} />
          </label>
          <label className="block sm:col-span-2"><span className="label-text text-xs font-medium mb-1 block">Email (optional - the guest is emailed when approved, declined or cancelled)</span>
            <input type="email" maxLength={191} placeholder="guest@example.com" className="input input-bordered w-full" value={form.email} onChange={set('email')} />
          </label>
          <label className="block"><span className="label-text text-xs font-medium mb-1 block">Date</span>
            <input required type="date" className="input input-bordered w-full" value={form.date} onChange={set('date')} />
          </label>
          <label className="block"><span className="label-text text-xs font-medium mb-1 block">Time</span>
            <input required type="time" className="input input-bordered w-full" value={form.time} onChange={set('time')} />
          </label>
          <label className="block"><span className="label-text text-xs font-medium mb-1 block">Guests</span>
            <input required type="number" min={1} max={200} className="input input-bordered w-full" value={form.guests} onChange={set('guests')} />
          </label>
          {locations.length > 1 && (
            <label className="block"><span className="label-text text-xs font-medium mb-1 block">Branch</span>
              <select required className="select select-bordered w-full" value={form.location_id} onChange={set('location_id')}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          )}
          {tables.length > 0 && (
            <label className="block"><span className="label-text text-xs font-medium mb-1 block">Table (optional)</span>
              <select className="select select-bordered w-full" value={form.table_id} onChange={set('table_id')}>
                <option value="">No table yet</option>
                {tables.map((t) => <option key={t.id} value={t.id}>{t.name}{t.capacity ? ` (${t.capacity} seats)` : ''}</option>)}
              </select>
            </label>
          )}
        </div>
        <label className="block"><span className="label-text text-xs font-medium mb-1 block">Notes</span>
          <textarea maxLength={500} rows={2} className="textarea textarea-bordered w-full" placeholder="Birthday, high chair, window seat…" value={form.notes} onChange={set('notes')} />
        </label>
        {error && <div role="alert" className="alert alert-error text-sm py-2 whitespace-pre-line">{error}</div>}
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : <Check size={16} />} {booking ? 'Save changes' : 'Add booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
