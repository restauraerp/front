'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: string;
  notes?: string | null;
}

interface Invoice {
  restaurant: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    currency: string;
    logo_url: string | null;
  };
  order: {
    id: number;
    token_number: number | null;
    created_at: string;
    order_type: string | null;
    status_label?: string;
    payment_status: string | null;
    subtotal: string;
    tax_amount: string | null;
    discount_amount: string | null;
    delivery_charge: string | null;
    total: string;
    outlet: string | null;
    customer_name: string | null;
    items: InvoiceItem[];
  };
}

/**
 * An invoice as the customer sees it, opened from a link sent over WhatsApp.
 *
 * Deliberately outside the (admin) group and its layout: whoever opens this has
 * no account, no token and no tenant cookie, and must never be shown a sidebar
 * into somebody else's restaurant. Everything it needs comes from the signed
 * API call below.
 *
 * The `expires` and `signature` in this page's own URL are forwarded untouched
 * to the API, which validates them against its own route. Nothing here inspects
 * or trusts them.
 */
export default function PublicInvoicePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const id = params.id as string;
  const expires = searchParams.get('expires');
  const signature = searchParams.get('signature');

  // Derived during render rather than set from the effect: a link missing its
  // signature is a fact about the URL, knowable without asking the server.
  const error = !expires || !signature
    ? 'This invoice link is incomplete. Please ask the restaurant to send it again.'
    : fetchError;

  useEffect(() => {
    if (!expires || !signature) return;

    const query = new URLSearchParams({ expires, signature });

    // Plain fetch, not fetchApi: that helper attaches a bearer token and a
    // tenant header from cookies this visitor does not have, and would send a
    // signed-in member of staff's credentials to a page meant for a customer.
    fetch(`${API_BASE_URL}/orders/${id}/invoice?${query}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
      .then(async (res) => {
        if (res.status === 403) {
          throw new Error('This invoice link has expired. Please ask the restaurant for a new one.');
        }
        if (!res.ok) {
          throw new Error('This invoice could not be found.');
        }
        return res.json();
      })
      .then(setInvoice)
      .catch((err: Error) => setFetchError(err.message));
  }, [id, expires, signature]);

  if (error) {
    return (
      <main style={styles.page}>
        <div style={{ ...styles.sheet, textAlign: 'center' }}>
          <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p>
        </div>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main style={styles.page}>
        <div style={{ ...styles.sheet, textAlign: 'center', color: '#6b7280' }}>Loading invoice…</div>
      </main>
    );
  }

  const { restaurant, order } = invoice;
  const money = (value: string | null | undefined) =>
    `${restaurant.currency}${Number(value ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main style={styles.page}>
      <div style={styles.sheet}>
        {/* The counter number this order was called by, kept at the top so a
            customer holding the printed slip and the customer holding this link
            are looking at the same number. */}
        {order.token_number != null && (
          <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid #111827' }}>
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.15em', color: '#6b7280' }}>TOKEN</div>
            <div style={{ fontSize: '2.6rem', fontWeight: 700, lineHeight: 1.1 }}>{order.token_number}</div>
          </div>
        )}
        <header style={{ textAlign: 'center', marginBottom: 24 }}>
          {restaurant.logo_url && (
            <img
              src={`/storage/${restaurant.logo_url}`}
              alt=""
              style={{ maxWidth: 140, maxHeight: 90, margin: '0 auto 10px', display: 'block', objectFit: 'contain' }}
            />
          )}
          <h1 style={styles.name}>{restaurant.name}</h1>
          {restaurant.address && <p style={styles.muted}>{restaurant.address}</p>}
          {restaurant.phone && <p style={styles.muted}>{restaurant.phone}</p>}
        </header>

        <div style={styles.metaRow}>
          <span>Invoice #{order.id}</span>
          <span>{new Date(order.created_at).toLocaleString()}</span>
        </div>
        {order.customer_name && (
          <div style={styles.metaRow}><span>Billed to</span><span>{order.customer_name}</span></div>
        )}
        {order.outlet && (
          <div style={styles.metaRow}><span>Outlet</span><span>{order.outlet}</span></div>
        )}

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, textAlign: 'left' }}>Item</th>
              <th style={styles.th}>Qty</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index}>
                <td style={styles.td}>
                  {item.name}
                  {item.notes && <div style={styles.note}>{item.notes}</div>}
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  {money(String(Number(item.price) * Number(item.quantity)))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={styles.totals}>
          <Row label="Subtotal" value={money(order.subtotal)} />
          {Number(order.discount_amount) > 0 && <Row label="Discount" value={`-${money(order.discount_amount)}`} />}
          {Number(order.tax_amount) > 0 && <Row label="Tax" value={money(order.tax_amount)} />}
          {Number(order.delivery_charge) > 0 && <Row label="Delivery" value={money(order.delivery_charge)} />}
          <Row label="Total" value={money(order.total)} strong />
        </div>

        <p style={styles.paid}>
          {order.payment_status === 'paid' ? 'Paid in full — thank you!' : 'Payment outstanding'}
        </p>

        <button type="button" onClick={() => window.print()} style={styles.print} className="no-print">
          Save or print this invoice
        </button>
      </div>

      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: strong ? 700 : 400, fontSize: strong ? '1.05rem' : '0.95rem' }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: '24px 12px', display: 'flex', justifyContent: 'center', color: '#111827' },
  sheet: { background: '#fff', width: '100%', maxWidth: 520, padding: 28, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  name: { fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px' },
  muted: { margin: 0, fontSize: '0.85rem', color: '#6b7280' },
  metaRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4b5563', padding: '3px 0' },
  table: { width: '100%', marginTop: 18, borderCollapse: 'collapse' },
  th: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280', padding: '8px 0', borderBottom: '1px solid #e5e7eb', textAlign: 'center' },
  td: { padding: '8px 0', fontSize: '0.9rem', borderBottom: '1px solid #f3f4f6' },
  note: { fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' },
  totals: { marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 },
  paid: { textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: '#065f46' },
  print: { width: '100%', marginTop: 20, padding: '10px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.9rem' },
};
