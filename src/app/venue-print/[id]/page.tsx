'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useBranding } from '@/hooks/useBranding';
import { EVENT_TYPES, PAYMENT_METHODS, longDate, time12, type BookingDetail } from '@/app/(admin)/admin/venues/types';

/**
 * A venue booking as a document for the customer - A4, branded with the
 * restaurant's own name, logo and contact details.
 *
 * What it is called follows where the booking stands: a Quotation while it
 * is tentative, a Booking confirmation once confirmed, an Invoice once the
 * event is over. Prices are the booking's own (copied when it was priced),
 * so a reprint months later says what was agreed. Opens the print dialog by
 * itself; "Save as PDF" there gives a file to send on WhatsApp or email.
 */
export default function VenuePrintPage() {
  const params = useParams();
  const branding = useBranding();
  const [b, setB] = useState<BookingDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!params.id || !branding.loaded) return;
    let printed = false;
    fetchApi(`/venue-bookings/${params.id}`)
      .then((res: BookingDetail) => {
        setB(res);
        setTimeout(() => { if (!printed) { printed = true; window.print(); } }, 400);
      })
      .catch(() => setFailed(true));
    return () => { printed = true; };
  }, [params.id, branding.loaded]);

  if (failed) return <div className="p-10 text-center">Booking not found.</div>;
  if (!b) return <div className="p-10 text-center">Loading…</div>;

  const c = branding.currency || '৳';
  const money = (n: number) => `${c}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const title = b.status === 'Completed' ? 'Invoice' : b.status === 'Confirmed' ? 'Booking confirmation' : b.status === 'Pending' ? 'Quotation' : `Booking (${b.status.toLowerCase()})`;
  const reference = `VB-${String(b.id).padStart(5, '0')}`;
  const issued = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  const logo = branding.logo ? (/^https?:\/\//.test(branding.logo) ? branding.logo : `/storage/${branding.logo}`) : null;

  const lines: { label: string; detail?: string; amount: number }[] = [
    { label: `Venue: ${b.hall?.name ?? ''}`, detail: `${longDate(b.date)}, ${time12(b.start_time)} - ${time12(b.end_time)}`, amount: b.rent_amount },
    ...(b.package ? [{ label: b.package.name, detail: `${b.guests} guests × ${money(b.package.price_per_person)}`, amount: b.food_amount }] : []),
    ...b.extras.map((x) => ({ label: x.label, amount: x.amount })),
  ];

  return (
    <div className="venue-doc bg-white text-black min-h-screen">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print { .no-print { display: none !important; } body { background: #fff; } }
        .venue-doc { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 13px; }
        .venue-doc table { width: 100%; border-collapse: collapse; }
        .venue-doc th, .venue-doc td { padding: 8px 6px; text-align: left; }
        .venue-doc .num { text-align: right; white-space: nowrap; }
      `}</style>

      <div className="no-print flex justify-end gap-2 p-3 bg-gray-100">
        <button className="btn btn-sm btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
        <button className="btn btn-sm" onClick={() => window.close()}>Close</button>
      </div>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '24px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 24, borderBottom: '2px solid #111', paddingBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo && <img src={logo} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />}
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{branding.name}</div>
              {branding.address && <div>{branding.address}</div>}
              <div>{[branding.phone, branding.email].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
            <div>No. <b>{reference}</b></div>
            <div>Date: {issued}</div>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, margin: '20px 0' }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#555', fontWeight: 600 }}>For</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{b.guest_name}</div>
            <div>{b.guest_phone}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#555', fontWeight: 600 }}>Event</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{b.event_title || EVENT_TYPES[b.event_type]}</div>
            <div>{EVENT_TYPES[b.event_type]} · {b.guests} guests</div>
            <div>{longDate(b.date)}, {time12(b.start_time)} - {time12(b.end_time)}{b.end_date !== b.date ? ' (next day)' : ''}</div>
            <div>{b.hall?.name}{b.location ? `, ${b.location.name}` : ''}</div>
          </div>
        </section>

        <table>
          <thead>
            <tr style={{ borderBottom: '1px solid #111', fontSize: 11, textTransform: 'uppercase', color: '#555' }}>
              <th>Description</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e5e5' }}>
                <td><div style={{ fontWeight: 500 }}>{l.label}</div>{l.detail && <div style={{ color: '#555', fontSize: 12 }}>{l.detail}</div>}</td>
                <td className="num">{money(l.amount)}</td>
              </tr>
            ))}
            {b.discount > 0 && (
              <tr style={{ borderBottom: '1px solid #e5e5e5' }}><td>Discount</td><td className="num">-{money(b.discount)}</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700, fontSize: 15 }}><td className="num">Total</td><td className="num">{money(b.total)}</td></tr>
            {b.payments.map((p) => (
              <tr key={p.id} style={{ color: '#333' }}>
                <td className="num">Paid {new Date(p.paid_at).toLocaleDateString()} ({PAYMENT_METHODS[p.method] ?? p.method}{p.note ? `, ${p.note}` : ''})</td>
                <td className="num">-{money(p.amount)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, fontSize: 15, borderTop: '2px solid #111' }}>
              <td className="num">{b.due > 0 ? 'Balance due' : 'Paid in full'}</td>
              <td className="num">{money(b.due)}</td>
            </tr>
          </tfoot>
        </table>

        {b.notes && (
          <div style={{ marginTop: 16, padding: 10, background: '#f5f5f5', borderRadius: 6, whiteSpace: 'pre-line' }}>{b.notes}</div>
        )}

        <section style={{ marginTop: 20, fontSize: 12, color: '#444' }}>
          {b.status === 'Pending' ? (
            <p>This is a quotation. The venue is not held until the booking is confirmed by {branding.name}.</p>
          ) : b.status === 'Confirmed' ? (
            <p>Your booking is confirmed for the date and time above.{b.due > 0 ? ` The balance of ${money(b.due)} is due before or on the day of the event.` : ''}</p>
          ) : null}
          <p>Prices include the items listed above. Please contact us on {branding.phone ?? 'our number'} with any changes.</p>
        </section>

        <footer style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 56 }}>
          <div style={{ borderTop: '1px solid #111', paddingTop: 6, textAlign: 'center' }}>For {branding.name}</div>
          <div style={{ borderTop: '1px solid #111', paddingTop: 6, textAlign: 'center' }}>Customer</div>
        </footer>
      </div>
    </div>
  );
}
