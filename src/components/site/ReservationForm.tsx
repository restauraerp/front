'use client';
import React, { useState } from 'react';
import { siteTrack, trackingContext } from '@/lib/site/track';
import { CalendarCheck } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

/**
 * The Reservations section's form - the one part of a site that sends data.
 *
 * Posts to core-api's POST /site/{code}/reservations, which files the request
 * in Bookings as Pending for the restaurant to confirm. The guest is kept
 * informed by email - no phone or WhatsApp verification; the phone is the
 * number staff call. Nothing here claims a table is booked.
 * In the editor's preview it does not submit.
 */
export default function ReservationForm({ code, locations, preview }: {
  code: string;
  locations: { id: number; name: string }[];
  preview?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', location_id: String(locations[0]?.id ?? ''), date: today, time: '19:00', guests: '2', notes: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) return;
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/site/${encodeURIComponent(code)}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, location_id: Number(form.location_id), guests: Number(form.guests), notes: form.notes || null, tracking: trackingContext() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const first = body?.errors ? (Object.values(body.errors)[0] as string[])[0] : null;
        throw new Error(first || body?.message || 'Your request could not be sent. Please call us instead.');
      }
      siteTrack('generate_lead', { eventId: `reservation-${body.reservation_id}` });
      setStatus('sent');
    } catch (err) {
      setError((err as Error).message);
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <div className="rounded-2xl bg-base-100 text-base-content p-8 text-center max-w-xl mx-auto">
        <CalendarCheck className="mx-auto text-success" size={40} />
        <h3 className="text-xl font-semibold mt-3">Request sent</h3>
        <p className="opacity-70 mt-1">Thank you, {form.name}. We have emailed {form.email} and will confirm your table shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-base-100 text-base-content p-5 sm:p-6 max-w-2xl mx-auto grid gap-3 sm:grid-cols-2">
      <input required maxLength={100} className="input input-bordered w-full" placeholder="Your name" value={form.name} onChange={set('name')} />
      <input required type="tel" maxLength={20} className="input input-bordered w-full" placeholder="Mobile number" value={form.phone} onChange={set('phone')} />
      <input required type="email" maxLength={191} className="input input-bordered w-full sm:col-span-2" placeholder="Email - we confirm here" value={form.email} onChange={set('email')} />
      {locations.length > 1 && (
        <select required className="select select-bordered w-full sm:col-span-2" value={form.location_id} onChange={set('location_id')}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}
      <input required type="date" min={today} className="input input-bordered w-full" value={form.date} onChange={set('date')} />
      <div className="grid grid-cols-2 gap-3">
        <input required type="time" className="input input-bordered w-full" value={form.time} onChange={set('time')} />
        <select className="select select-bordered w-full" value={form.guests} onChange={set('guests')} aria-label="Guests">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
        </select>
      </div>
      <textarea maxLength={500} rows={2} className="textarea textarea-bordered w-full sm:col-span-2" placeholder="Anything we should know? (optional)" value={form.notes} onChange={set('notes')} />
      {error && <div className="alert alert-error text-sm sm:col-span-2">{error}</div>}
      <button type="submit" className="btn btn-primary sm:col-span-2" disabled={status === 'sending'}>
        {status === 'sending' ? <span className="loading loading-spinner loading-sm" /> : 'Request a table'}
      </button>
    </form>
  );
}
