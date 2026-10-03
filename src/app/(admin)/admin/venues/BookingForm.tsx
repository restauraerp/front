'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Plus, Trash2, X } from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Modal } from '@/components/ui/Dialogs';
import { EVENT_TYPES, money, time12, type BookingDetail, type Quote, type Venue, type VenuePackage } from './types';

/**
 * A venue booking, new or changed. As it is filled in, core-api prices it
 * and says what it would clash with (POST /venue-bookings/quote) - the same
 * calculation the save uses, so the total shown is the total stored.
 */
export default function BookingForm({ booking, venues, packages, initialDate, onClose, onSaved }: {
  booking: BookingDetail | null;
  venues: Venue[];
  packages: VenuePackage[];
  initialDate?: string;
  onClose: () => void;
  onSaved: (saved: BookingDetail) => void;
}) {
  const active = venues.filter((v) => v.is_active || v.id === booking?.hall?.id);
  // Lazily: the default date reads the clock, which may only happen once.
  const [form, setForm] = useState(() => ({
    hall_id: String(booking?.hall?.id ?? active[0]?.id ?? ''),
    date: booking?.date ?? initialDate ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    start_time: booking?.start_time ?? '18:00',
    end_time: booking?.end_time ?? '22:00',
    guests: String(booking?.guests ?? 100),
    event_type: booking?.event_type ?? 'birthday',
    event_title: booking?.event_title ?? '',
    name: booking?.guest_name ?? '',
    phone: booking?.guest_phone ?? '',
    email: booking?.guest_email ?? '',
    package_id: booking?.package?.id ? String(booking.package.id) : '',
    discount: String(booking?.discount ?? 0),
    notes: booking?.notes ?? '',
    status: 'Pending',
  }));
  const [extras, setExtras] = useState<{ label: string; amount: string }[]>((booking?.extras ?? []).map((e) => ({ label: e.label, amount: String(e.amount) })));
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pricing = useMemo(() => ({
    hall_id: Number(form.hall_id),
    date: form.date,
    start_time: form.start_time,
    end_time: form.end_time,
    guests: Number(form.guests) || 1,
    event_type: form.event_type,
    package_id: form.package_id ? Number(form.package_id) : null,
    extras: extras.filter((e) => e.label.trim() && e.amount !== '').map((e) => ({ label: e.label.trim(), amount: Number(e.amount) })),
    discount: Number(form.discount) || 0,
  }), [form.hall_id, form.date, form.start_time, form.end_time, form.guests, form.event_type, form.package_id, form.discount, extras]);

  // Re-priced as it is filled in, a moment after the typing stops.
  useEffect(() => {
    if (!pricing.hall_id || !pricing.date || !pricing.start_time || !pricing.end_time) return;
    let active = true;
    const t = setTimeout(() => {
      fetchApi('/venue-bookings/quote', { method: 'POST', body: JSON.stringify({ ...pricing, booking_id: booking?.id ?? null }) })
        .then((res: Quote) => { if (active) { setQuote(res); setQuoteError(null); } })
        .catch((err) => { if (active) { setQuote(null); setQuoteError(apiErrorMessage(err, 'Could not price this booking.')); } });
    }, 350);
    return () => { active = false; clearTimeout(t); };
  }, [pricing, booking?.id]);

  const confirmedClash = quote?.clashes.find((c) => c.status === 'Confirmed');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = { ...pricing, event_title: form.event_title || null, name: form.name, phone: form.phone, email: form.email || null, notes: form.notes || null, ...(booking ? {} : { status: form.status }) };
      const saved = booking
        ? await fetchApi(`/venue-bookings/${booking.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await fetchApi('/venue-bookings', { method: 'POST', body: JSON.stringify(body) });
      onSaved(saved);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the booking.'));
    } finally {
      setSaving(false);
    }
  };

  const label = (text: string) => <span className="label-text text-xs font-medium mb-1 block">{text}</span>;

  return (
    <Modal onClose={onClose} wide>
      <form className="space-y-4" onSubmit={save}>
        <h3 className="font-semibold text-lg">{booking ? 'Edit venue booking' : 'New venue booking'}</h3>
        {active.length === 0 && <div className="alert alert-warning text-sm">Add a venue first, in the Venues tab.</div>}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="block">{label('Venue')}
            <select required className="select select-bordered w-full" value={form.hall_id} onChange={set('hall_id')}>
              {active.map((v) => <option key={v.id} value={v.id}>{v.name}{v.location ? ` - ${v.location.name}` : ''} (up to {v.capacity})</option>)}
            </select>
          </label>
          <label className="block">{label('Event')}
            <select className="select select-bordered w-full" value={form.event_type} onChange={set('event_type')}>
              {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block">{label('Title (optional)')}
            <input maxLength={150} className="input input-bordered w-full" placeholder="e.g. Rahim & Sumi's wedding" value={form.event_title} onChange={set('event_title')} />
          </label>
          <label className="block">{label('Date')}
            <input required type="date" className="input input-bordered w-full" value={form.date} onChange={set('date')} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">{label('From')}
              <input required type="time" className="input input-bordered w-full" value={form.start_time} onChange={set('start_time')} />
            </label>
            <label className="block">{label('To')}
              <input required type="time" className="input input-bordered w-full" value={form.end_time} onChange={set('end_time')} />
            </label>
          </div>
          <label className="block">{label('Guests')}
            <input required type="number" min={1} max={5000} className="input input-bordered w-full" value={form.guests} onChange={set('guests')} />
          </label>
          <label className="block">{label('Guest name')}
            <input required maxLength={100} className="input input-bordered w-full" value={form.name} onChange={set('name')} />
          </label>
          <label className="block">{label('Phone (to confirm)')}
            <input required type="tel" inputMode="tel" maxLength={20} placeholder="01XXXXXXXXX" className="input input-bordered w-full" value={form.phone} onChange={set('phone')} />
          </label>
          <label className="block">{label('Email (booking emails go here)')}
            <input type="email" maxLength={191} placeholder="guest@example.com" className="input input-bordered w-full" value={form.email} onChange={set('email')} />
          </label>
          <label className="block">{label('Food package')}
            <select className="select select-bordered w-full" value={form.package_id} onChange={set('package_id')}>
              <option value="">No package (venue only)</option>
              {packages.filter((p) => p.is_active || String(p.id) === form.package_id).map((p) => <option key={p.id} value={p.id}>{p.name} - {money(p.price_per_person)}/person</option>)}
            </select>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            {label('Extras (decoration, sound, photography...)')}
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => setExtras([...extras, { label: '', amount: '' }])}><Plus size={12} /> Add</button>
          </div>
          <div className="space-y-2">
            {extras.map((x, i) => (
              <div key={i} className="flex gap-2">
                <input className="input input-sm input-bordered flex-1" maxLength={80} placeholder="Stage decoration" value={x.label} onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
                <input className="input input-sm input-bordered w-32" type="number" min={0} placeholder="Amount" value={x.amount} onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} />
                <button type="button" className="btn btn-sm btn-ghost btn-square text-error" onClick={() => setExtras(extras.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">{label('Notes')}
            <textarea maxLength={2000} rows={3} className="textarea textarea-bordered w-full" placeholder="Menu changes, timings, contact on the day..." value={form.notes} onChange={set('notes')} />
          </label>
          <div className="rounded-xl bg-base-200 p-3 text-sm space-y-1">
            {quote ? (
              <>
                <div className="flex justify-between"><span>Venue rent{quote.price.hours ? ` (${quote.price.hours} h)` : ''}</span><span>{money(quote.price.rent_amount)}</span></div>
                {quote.price.food_amount > 0 && <div className="flex justify-between"><span>{quote.price.package_name} × {pricing.guests}</span><span>{money(quote.price.food_amount)}</span></div>}
                {quote.price.extras_amount > 0 && <div className="flex justify-between"><span>Extras</span><span>{money(quote.price.extras_amount)}</span></div>}
                <label className="flex justify-between items-center gap-2"><span>Discount</span>
                  <input type="number" min={0} className="input input-xs input-bordered w-28 text-right" value={form.discount} onChange={set('discount')} />
                </label>
                <div className="flex justify-between font-semibold text-base border-t border-base-300 pt-1"><span>Total</span><span>{money(quote.price.total)}</span></div>
                {booking && booking.paid > 0 && <div className="flex justify-between text-xs text-base-content/60"><span>Paid so far</span><span>{money(booking.paid)}</span></div>}
              </>
            ) : <span className="text-base-content/60">{quoteError ?? 'Pricing…'}</span>}
          </div>
        </div>

        {quote?.warnings.map((w) => <div key={w} className="alert alert-warning text-sm py-2"><AlertTriangle size={16} /> {w}</div>)}
        {quote && quote.clashes.length > 0 && (
          <div className={`alert text-sm py-2 ${confirmedClash ? 'alert-error' : 'alert-warning'}`}>
            <AlertTriangle size={16} />
            <div>
              <div className="font-medium">{confirmedClash ? 'This venue is already booked then.' : 'Another enquiry is pencilled in for this time.'}</div>
              {quote.clashes.map((c) => (
                <div key={c.id} className="text-xs">{c.status}: {c.guest_name} - {c.event_title || EVENT_TYPES[c.event_type]}, {time12(c.start_time)}-{time12(c.end_time)}</div>
              ))}
            </div>
          </div>
        )}

        {!booking && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">Save as</span>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" className="radio radio-sm" checked={form.status === 'Pending'} onChange={() => setForm({ ...form, status: 'Pending' })} /> Tentative - an enquiry or hold</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" className="radio radio-sm radio-success" checked={form.status === 'Confirmed'} onChange={() => setForm({ ...form, status: 'Confirmed' })} disabled={!!confirmedClash} /> Confirmed</label>
          </div>
        )}

        {error && <div role="alert" className="alert alert-error text-sm py-2 whitespace-pre-line">{error}</div>}
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}><X size={16} /> Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || active.length === 0 || (!!confirmedClash && (form.status === 'Confirmed' || booking?.status === 'Confirmed'))}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : <Check size={16} />} {booking ? 'Save changes' : 'Save booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
