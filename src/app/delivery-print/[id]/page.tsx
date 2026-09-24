'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useBranding } from '@/hooks/useBranding';

/**
 * The delivery slip.
 *
 * Its job is different from the kitchen ticket (what to cook) and the customer
 * receipt (what was charged): it has to get the bag to the right door and bring
 * back the right money. So it leads with who and where - customer name, phone
 * and delivery address, big enough to read on a doorstep - and states plainly
 * what the rider must collect on delivery, since an unpaid delivery is cash the
 * rider is responsible for. The item list is here only so the bag can be
 * checked before it leaves; prices are on the customer receipt, not this.
 */
export default function DeliveryPrintPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const branding = useBranding();

  useEffect(() => {
    if (!params.id || !branding.loaded) return;

    let printed = false;
    fetchApi(`/orders/${params.id}`)
      .then((res) => {
        setOrder(res.data || res);
        setTimeout(() => {
          if (!printed) { printed = true; window.print(); }
        }, 300);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => { printed = true; };
  }, [params.id, branding.loaded]);

  if (loading) return <div className="p-10 text-center font-mono">Loading delivery slip...</div>;
  if (!order) return <div className="p-10 text-center font-mono">Order not found.</div>;

  const c = branding.currency;
  const name = order.customer?.name || 'Walk-in customer';
  const phone = order.customer?.phone || null;
  const address = order.delivery_address || order.customer?.address || null;
  const paid = order.payment_status === 'paid';
  // What the rider brings back. Outstanding when the API gives it (a due order
  // may be part-paid); the full total otherwise.
  const toCollect = Number(order.amount_outstanding ?? order.total ?? 0);
  const deliveryTime = order.delivery_time ? new Date(order.delivery_time) : null;

  return (
    <div id="delivery" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', padding: '10px', fontFamily: 'monospace', color: '#000', backgroundColor: '#fff' }}>
      {order.token_number != null && (
        <div style={{ textAlign: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #000' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.15em' }}>TOKEN</div>
          <div style={{ fontSize: '2.6rem', fontWeight: 'bold', lineHeight: 1 }}>{order.token_number}</div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
        {/* The slip may be handed or sent to the customer, so it carries the
            restaurant's mark like the receipt does. */}
        {branding.logo && (
          <img
            src={`/storage/${branding.logo}`}
            alt=""
            style={{ maxWidth: '120px', maxHeight: '80px', margin: '0 auto 8px', display: 'block', objectFit: 'contain' }}
          />
        )}
        {branding.name && (
          <p style={{ fontSize: '0.9rem', margin: '0 0 4px 0', fontWeight: 'bold' }}>{branding.name.toUpperCase()}</p>
        )}
        {branding.phone && <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem' }}>{branding.phone}</p>}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>DELIVERY SLIP</h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '10px' }}>
        <span>Order #: {order.id}</span>
        <span>{new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>

      {deliveryTime && (
        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '10px', border: '1px solid #000', padding: '4px' }}>
          DELIVER BY {deliveryTime.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
        </div>
      )}

      {/* The whole point of the slip. Boxed and large so it reads at a glance. */}
      <div style={{ border: '2px solid #000', padding: '8px', marginBottom: '10px' }}>
        <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '4px' }}>DELIVER TO</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 'bold', lineHeight: 1.2 }}>{name}</div>
        {phone && (
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '4px' }}>☎ {phone}</div>
        )}
        {address ? (
          <div style={{ fontSize: '1rem', marginTop: '6px', lineHeight: 1.3 }}>{address}</div>
        ) : (
          <div style={{ fontSize: '0.85rem', marginTop: '6px', fontStyle: 'italic' }}>No address on file — call the customer.</div>
        )}
        {(order.latitude && order.longitude) && (
          <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>GPS: {order.latitude}, {order.longitude}</div>
        )}
      </div>

      {/* Bag check: what should be in it, no prices. */}
      <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '4px' }}>ITEMS</div>
      <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '10px' }}>
        <tbody>
          {order.items?.map((item: any) => (
            <tr key={item.id} style={{ borderBottom: '1px dashed #ccc' }}>
              <td style={{ padding: '4px 0', textAlign: 'left', width: '2.2rem', fontWeight: 'bold' }}>{item.quantity}×</td>
              <td style={{ padding: '4px 0' }}>
                {item.product?.name || 'Item'}
                {item.notes && <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>* {item.notes}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Money the rider is accountable for. */}
      <div style={{ border: '2px solid #000', padding: '8px', marginBottom: '10px', textAlign: 'center' }}>
        {paid ? (
          <>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>PAID — COLLECT NOTHING</div>
            <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>Order total {c}{Number(order.total ?? 0).toFixed(2)}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em' }}>COLLECT ON DELIVERY</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', lineHeight: 1.1 }}>{c}{toCollect.toFixed(2)}</div>
            {order.payment_status === 'due' && (
              <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>On account — balance of {c}{Number(order.total ?? 0).toFixed(2)}</div>
            )}
          </>
        )}
      </div>

      {order.due_note && (
        <div style={{ fontSize: '0.8rem', marginBottom: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>Note: </span>{order.due_note}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '0.8rem' }}>
        <div style={{ marginBottom: '18px' }}>Rider: ____________________</div>
        <div>Received by: ________________</div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @page { margin: 0; }
        body { margin: 0; padding: 0; background: #fff; }
        @media print {
          body * { visibility: hidden; }
          #delivery, #delivery * { visibility: visible; }
          #delivery { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 10px; }
        }
      `}} />
    </div>
  );
}
