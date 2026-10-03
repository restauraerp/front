'use client';
import React, { useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { siteTrack, trackingContext } from '@/lib/site/track';
import { API_BASE_URL } from '@/lib/api';
import type { SiteVenue } from '@/lib/site/types';

const EVENT_TYPES: Record<string, string> = {
  birthday: 'Birthday', wedding: 'Wedding', holud: 'Gaye holud', aqiqah: 'Aqiqah', engagement: 'Engagement',
  anniversary: 'Anniversary', corporate: 'Corporate event', meeting: 'Meeting', reunion: 'Reunion', other: 'Other',
};

/**
 * The Venues section's enquiry form. Posts to core-api's
 * POST /site/{code}/venue-enquiries, which files it in Venues as a tentative
 * booking. The guest is kept informed by email - no phone or WhatsApp
 * verification; the phone is a contact number. Nothing here says the venue
 * is booked. In the editor's preview it does not submit.
 */
export default function VenueEnquiryForm({ code, venues, preview, selected }: {
  code: string;
  venues: SiteVenue[];
  preview?: boolean;
  selected?: number | null;
}) {
  const [form, setForm] = useState(() => ({
    name: '', email: '', phone: '', hall_id: String(selected ?? venues[0]?.id ?? ''), event_type: 'birthday',
    date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), start_time: '18:00', end_time: '22:00', guests: '50', notes: '',
  }));
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
      const res = await fetch(`${API_BASE_URL}/site/${encodeURIComponent(code)}/venue-enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, hall_id: Number(form.hall_id), guests: Number(form.guests), notes: form.notes || null, tracking: trackingContext() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const first = body?.errors ? (Object.values(body.errors)[0] as string[])[0] : null;
        throw new Error(first || body?.message || 'Your enquiry could not be sent. Please call us instead.');
      }
      siteTrack('generate_lead', { eventId: `venue-${body.enquiry_id}` });
      setStatus('sent');
    } catch (err) {
      setError((err as Error).message);
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <div className="rounded-2xl bg-base-100 text-base-content p-8 text-center max-w-xl mx-auto">
        <PartyPopper className="mx-auto text-success" size={40} />
        <h3 className="text-xl font-semibold mt-3">Enquiry sent</h3>
        <p className="opacity-70 mt-1">Thank you, {form.name}. We have emailed {form.email} and will get back to you about your event.</p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={submit} className="rounded-2xl bg-base-100 text-base-content p-5 sm:p-6 max-w-2xl mx-auto grid gap-3 sm:grid-cols-2">
      <input required maxLength={100} className="input input-bordered w-full" placeholder="Your name" value={form.name} onChange={set('name')} />
      <input required type="email" maxLength={191} className="input input-bordered w-full" placeholder="Email - we reply here" value={form.email} onChange={set('email')} />
      <input required type="tel" maxLength={20} className="input input-bordered w-full sm:col-span-2" placeholder="Mobile number" value={form.phone} onChange={set('phone')} />
      {venues.length > 1 && (
        <select required className="select select-bordered w-full" value={form.hall_id} onChange={set('hall_id')} aria-label="Venue">
          {venues.map((v) => <option key={v.id} value={v.id}>{v.name}{v.capacity ? ` (up to ${v.capacity})` : ''}</option>)}
        </select>
      )}
      <select className={`select select-bordered w-full ${venues.length > 1 ? '' : 'sm:col-span-2'}`} value={form.event_type} onChange={set('event_type')} aria-label="Event">
        {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input required type="date" min={today} className="input input-bordered w-full" value={form.date} onChange={set('date')} aria-label="Date" />
      <input required type="number" min={1} max={5000} className="input input-bordered w-full" placeholder="Guests" value={form.guests} onChange={set('guests')} aria-label="Guests" />
      <label className="flex items-center gap-2 text-sm">From <input required type="time" className="input input-bordered w-full" value={form.start_time} onChange={set('start_time')} /></label>
      <label className="flex items-center gap-2 text-sm">To <input required type="time" className="input input-bordered w-full" value={form.end_time} onChange={set('end_time')} /></label>
      <textarea maxLength={1000} rows={2} className="textarea textarea-bordered w-full sm:col-span-2" placeholder="Tell us about your event (optional)" value={form.notes} onChange={set('notes')} />
      {error && <div className="alert alert-error text-sm sm:col-span-2">{error}</div>}
      <button type="submit" className="btn btn-primary sm:col-span-2" disabled={status === 'sending'}>
        {status === 'sending' ? <span className="loading loading-spinner loading-sm" /> : 'Send enquiry'}
      </button>
    </form>
  );
}
