'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Plus, Trash2, X } from 'lucide-react';
import { fetchApi, apiErrorMessage } from '@/lib/api';
import { Modal } from '@/components/ui/Dialogs';
import { addDays, money, shortDate, ymd, type Quote, type RoomBookingDetail, type RoomType } from './types';

/**
 * A room booking, new or changed. Priced and checked against availability by
 * core-api as it is filled in (POST /hotel/bookings/quote) - the same
 * calculation the save uses.
 */
export default function RoomBookingForm({ booking, types, initial, onClose, onSaved }: {
  booking: RoomBookingDetail | null;
  types: RoomType[];
  initial?: { room_type_id?: number; check_in?: string };
  onClose: () => void;
  onSaved: (saved: RoomBookingDetail) => void;
}) {
  const active = types.filter((t) => t.is_active || t.id === booking?.room_type?.id);
  const [form, setForm] = useState(() => {
    const checkIn = booking?.check_in ?? initial?.check_in ?? ymd(new Date());
    return {
      room_type_id: String(booking?.room_type?.id ?? initial?.room_type_id ?? active[0]?.id ?? ''),
      check_in: checkIn,
      check_out: booking?.check_out ?? addDays(checkIn, 1),
      adults: String(booking?.adults ?? 2),
      children: String(booking?.children ?? 0),
      name: booking?.guest_name ?? '',
      phone: booking?.guest_phone ?? '',
      email: booking?.guest_email ?? '',
      discount: String(booking?.discount ?? 0),
      notes: booking?.notes ?? '',
      status: 'Confirmed',
    };
  });
  const [extras, setExtras] = useState<{ label: string; amount: string }[]>((booking?.extras ?? []).map((e) => ({ label: e.label, amount: String(e.amount) })));
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => {
      const next = { ...f, [key]: e.target.value };
      // Moving check-in past check-out keeps the stay's length.
      if (key === 'check_in' && next.check_out <= next.check_in) next.check_out = addDays(next.check_in, 1);
      return next;
    });

  const stay = useMemo(() => ({
    room_type_id: Number(form.room_type_id),
    check_in: form.check_in,
    check_out: form.check_out,
    adults: Number(form.adults) || 1,
    children: Number(form.children) || 0,
    extras: extras.filter((e) => e.label.trim() && e.amount !== '').map((e) => ({ label: e.label.trim(), amount: Number(e.amount) })),
    discount: Number(form.discount) || 0,
  }), [form.room_type_id, form.check_in, form.check_out, form.adults, form.children, form.discount, extras]);

  useEffect(() => {
    if (!stay.room_type_id || !stay.check_in || !stay.check_out || stay.check_out <= stay.check_in) return;
    let live = true;
    const t = setTimeout(() => {
      fetchApi('/hotel/bookings/quote', { method: 'POST', body: JSON.stringify({ ...stay, booking_id: booking?.id ?? null }) })
        .then((res: Quote) => { if (live) { setQuote(res); setQuoteError(null); } })
        .catch((err) => { if (live) { setQuote(null); setQuoteError(apiErrorMessage(err, 'Could not price this stay.')); } });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [stay, booking?.id]);

  const full = !!quote?.full_night;
  const holds = booking ? ['Confirmed', 'Checked in'].includes(booking.status) : form.status === 'Confirmed';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = { ...stay, name: form.name, phone: form.phone, email: form.email || null, notes: form.notes || null, ...(booking ? {} : { status: form.status }) };
      const saved = booking
        ? await fetchApi(`/hotel/bookings/${booking.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await fetchApi('/hotel/bookings', { method: 'POST', body: JSON.stringify(body) });
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
        <h3 className="font-semibold text-lg">{booking ? 'Edit room booking' : 'New room booking'}</h3>
        {active.length === 0 && <div className="alert alert-warning text-sm">Add a room type and its rooms first, in Rooms.</div>}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="block">{label('Room type')}
            <select required className="select select-bordered w-full" value={form.room_type_id} onChange={set('room_type_id')}>
              {active.map((t) => <option key={t.id} value={t.id}>{t.name} - {money(t.rate)}/night</option>)}
            </select>
          </label>
          <label className="block">{label('Check-in')}
            <input required type="date" className="input input-bordered w-full" value={form.check_in} onChange={set('check_in')} />
          </label>
          <label className="block">{label('Check-out')}
            <input required type="date" min={addDays(form.check_in, 1)} className="input input-bordered w-full" value={form.check_out} onChange={set('check_out')} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">{label('Adults')}
              <input required type="number" min={1} max={20} className="input input-bordered w-full" value={form.adults} onChange={set('adults')} />
            </label>
            <label className="block">{label('Children')}
              <input type="number" min={0} max={20} className="input input-bordered w-full" value={form.children} onChange={set('children')} />
            </label>
          </div>
          <label className="block">{label('Guest name')}
            <input required maxLength={100} className="input input-bordered w-full" value={form.name} onChange={set('name')} />
          </label>
          <label className="block">{label('Phone')}
            <input required type="tel" inputMode="tel" maxLength={20} placeholder="01XXXXXXXXX" className="input input-bordered w-full" value={form.phone} onChange={set('phone')} />
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">{label('Email (optional - confirmations go here)')}
            <input type="email" maxLength={191} className="input input-bordered w-full" value={form.email} onChange={set('email')} />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            {label('Extras (breakfast, airport pickup, extra bed...)')}
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => setExtras([...extras, { label: '', amount: '' }])}><Plus size={12} /> Add</button>
          </div>
          <div className="space-y-2">
            {extras.map((x, i) => (
              <div key={i} className="flex gap-2">
                <input className="input input-sm input-bordered flex-1" maxLength={80} placeholder="Airport pickup" value={x.label} onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
                <input className="input input-sm input-bordered w-32" type="number" min={0} placeholder="Amount" value={x.amount} onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} />
                <button type="button" className="btn btn-sm btn-ghost btn-square text-error" onClick={() => setExtras(extras.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">{label('Notes')}
            <textarea maxLength={2000} rows={3} className="textarea textarea-bordered w-full" placeholder="Late arrival, extra pillows..." value={form.notes} onChange={set('notes')} />
          </label>
          <div className="rounded-xl bg-base-200 p-3 text-sm space-y-1">
            {quote ? (
              <>
                {quote.price.nightly_rates.length <= 7
                  ? quote.price.nightly_rates.map((n) => <div key={n.date} className="flex justify-between text-xs"><span>{shortDate(n.date)}</span><span>{money(n.rate)}</span></div>)
                  : <div className="flex justify-between"><span>{quote.price.nights} nights</span><span>{money(quote.price.room_amount)}</span></div>}
                {quote.price.extras_amount > 0 && <div className="flex justify-between"><span>Extras</span><span>{money(quote.price.extras_amount)}</span></div>}
                <label className="flex justify-between items-center gap-2"><span>Discount</span>
                  <input type="number" min={0} className="input input-xs input-bordered w-28 text-right" value={form.discount} onChange={set('discount')} />
                </label>
                <div className="flex justify-between font-semibold text-base border-t border-base-300 pt-1"><span>Total ({quote.price.nights} night{quote.price.nights === 1 ? '' : 's'})</span><span>{money(quote.price.total)}</span></div>
                <div className={`text-xs ${quote.free > 0 ? 'text-success' : 'text-error'}`}>{quote.free > 0 ? `${quote.free} room${quote.free === 1 ? '' : 's'} free for these nights` : 'No room free for every night'}</div>
              </>
            ) : <span className="text-base-content/60">{quoteError ?? 'Pricing…'}</span>}
          </div>
        </div>

        {quote?.warnings.map((w) => <div key={w} className="alert alert-warning text-sm py-2"><AlertTriangle size={16} /> {w}</div>)}
        {full && holds && (
          <div className="alert alert-error text-sm py-2"><AlertTriangle size={16} /> Fully booked on the night of {shortDate(quote!.full_night!)} - choose other dates or another room type, or save it as a request.</div>
        )}

        {!booking && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">Save as</span>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" className="radio radio-sm radio-success" checked={form.status === 'Confirmed'} onChange={() => setForm({ ...form, status: 'Confirmed' })} /> Confirmed</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" className="radio radio-sm" checked={form.status === 'Pending'} onChange={() => setForm({ ...form, status: 'Pending' })} /> Request - holds no room</label>
          </div>
        )}

        {error && <div role="alert" className="alert alert-error text-sm py-2 whitespace-pre-line">{error}</div>}
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}><X size={16} /> Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || active.length === 0 || (full && holds)}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : <Check size={16} />} {booking ? 'Save changes' : 'Save booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
