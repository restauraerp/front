'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useBranding } from '@/hooks/useBranding';
import { PAYMENT_METHODS, type RoomBookingDetail } from '@/app/(admin)/admin/hotel/types';

/**
 * A room booking as a document for the guest - a Booking confirmation, or an
 * Invoice once they have checked out - branded with the hotel's own name and
 * details, night by night at the rates agreed. Opens the print dialog itself.
 */
export default function RoomPrintPage() {
  const params = useParams();
  const branding = useBranding();
  const [b, setB] = useState<RoomBookingDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!params.id || !branding.loaded) return;
    let printed = false;
    fetchApi(`/hotel/bookings/${params.id}`)
      .then((res: RoomBookingDetail) => { setB(res); setTimeout(() => { if (!printed) { printed = true; window.print(); } }, 400); })
      .catch(() => setFailed(true));
    return () => { printed = true; };
  }, [params.id, branding.loaded]);

  if (failed) return <div className="p-10 text-center">Booking not found.</div>;
  if (!b) return <div className="p-10 text-center">Loading…</div>;

  const c = branding.currency || '৳';
  const money = (n: number) => `${c}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const date = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const title = b.status === 'Checked out' ? 'Invoice' : b.status === 'Pending' ? 'Booking request' : 'Booking confirmation';
  const logo = branding.logo ? (/^https?:\/\//.test(branding.logo) ? branding.logo : `/storage/${branding.logo}`) : null;

  return (
    <div className="bg-white text-black min-h-screen" style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>
      <style>{`@page { size: A4; margin: 14mm; } @media print { .no-print { display: none !important; } } td, th { padding: 6px; text-align: left; } .num { text-align: right; white-space: nowrap; }`}</style>
      <div className="no-print flex justify-end gap-2 p-3 bg-gray-100">
        <button className="btn btn-sm btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
        <button className="btn btn-sm" onClick={() => window.close()}>Close</button>
      </div>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: 24 }}>
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
            <div style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase' }}>{title}</div>
            <div>No. <b>RB-{String(b.id).padStart(5, '0')}</b></div>
            <div>Date: {new Date().toLocaleDateString()}</div>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, margin: '20px 0' }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#555', fontWeight: 600 }}>Guest</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{b.guest_name}</div>
            <div>{b.guest_phone}</div>
            {b.guest_email && <div>{b.guest_email}</div>}
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#555', fontWeight: 600 }}>Stay</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{b.room_type?.name}{b.room ? ` · Room ${b.room.number}` : ''}</div>
            <div>Check-in {date(b.check_in)}</div>
            <div>Check-out {date(b.check_out)}</div>
            <div>{b.nights} night{b.nights === 1 ? '' : 's'} · {b.adults} adult{b.adults === 1 ? '' : 's'}{b.children ? `, ${b.children} child${b.children === 1 ? '' : 'ren'}` : ''}</div>
          </div>
        </section>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #111', fontSize: 11, textTransform: 'uppercase', color: '#555' }}><th>Description</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {b.nightly_rates.map((n) => <tr key={n.date} style={{ borderBottom: '1px solid #eee' }}><td>Night of {date(n.date)}</td><td className="num">{money(n.rate)}</td></tr>)}
            {b.extras.map((x, i) => <tr key={i} style={{ borderBottom: '1px solid #eee' }}><td>{x.label}</td><td className="num">{money(x.amount)}</td></tr>)}
            {b.discount > 0 && <tr style={{ borderBottom: '1px solid #eee' }}><td>Discount</td><td className="num">-{money(b.discount)}</td></tr>}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700, fontSize: 15 }}><td className="num">Total</td><td className="num">{money(b.total)}</td></tr>
            {b.payments.map((p) => <tr key={p.id}><td className="num">Paid {new Date(p.paid_at).toLocaleDateString()} ({PAYMENT_METHODS[p.method] ?? p.method})</td><td className="num">-{money(p.amount)}</td></tr>)}
            <tr style={{ fontWeight: 700, fontSize: 15, borderTop: '2px solid #111' }}><td className="num">{b.due > 0 ? 'Balance due' : 'Paid in full'}</td><td className="num">{money(b.due)}</td></tr>
          </tfoot>
        </table>
        {b.notes && <div style={{ marginTop: 16, padding: 10, background: '#f5f5f5', borderRadius: 6, whiteSpace: 'pre-line' }}>{b.notes}</div>}
        <footer style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 56 }}>
          <div style={{ borderTop: '1px solid #111', paddingTop: 6, textAlign: 'center' }}>For {branding.name}</div>
          <div style={{ borderTop: '1px solid #111', paddingTop: 6, textAlign: 'center' }}>Guest</div>
        </footer>
      </div>
    </div>
  );
}
