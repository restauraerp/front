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
  const deliveryCharge = Number(order.delivery_charge ?? 0);
  const discount = Number(order.discount_amount ?? 0);
  // The rider carrying this order, if one has been assigned. deliveries comes
  // back newest-first, so the first with a rider is the current assignment.
  const rider = (order.deliveries ?? []).map((d: any) => d.rider).find(Boolean) || null;

  return (
    <div id="delivery" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', padding: '10px', fontFamily: 'monospace', color: '#000', backgroundColor: '#fff' }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
        <span>Order #: {order.id}</span>
        <span>{new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>
      {/* Token kept small here - it matters at the counter, not on a doorstep. */}
      {order.token_number != null && (
        <div style={{ fontSize: '0.75rem', marginBottom: '10px' }}>Token #{order.token_number}</div>
      )}

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

      {/* Items with their prices, so the slip doubles as the bill the customer
          sees. */}
      <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '4px' }}>ITEMS</div>
      <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '10px' }}>
        <thead>
          <tr style={{ borderBottom: '1px dashed #000' }}>
            <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item</th>
            <th style={{ textAlign: 'center', paddingBottom: '4px', width: '2rem' }}>Qty</th>
            <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any) => (
            <tr key={item.id}>
              <td style={{ padding: '4px 0' }}>
                {item.product?.name || 'Item'}
                {item.notes && <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>* {item.notes}</div>}
              </td>
              <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>{c}{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Price breakdown, delivery charge called out on its own line. */}
      <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Subtotal</span><span>{c}{Number(order.subtotal ?? 0).toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Discount</span><span>-{c}{discount.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Tax</span><span>{c}{Number(order.tax_amount ?? 0).toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Delivery charge</span><span>{c}{deliveryCharge.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', marginTop: '6px', borderTop: '1px solid #000', paddingTop: '5px' }}>
          <span>TOTAL</span><span>{c}{Number(order.total ?? 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Money the rider is accountable for. */}
      <div style={{ border: '2px solid #000', padding: '8px', margin: '10px 0', textAlign: 'center' }}>
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

      {/* Who is carrying it, when a rider has been assigned. */}
      {rider && (
        <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '4px' }}>RIDER</div>
          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{rider.name}</div>
          {rider.phone && <div style={{ fontSize: '0.95rem' }}>☎ {rider.phone}</div>}
        </div>
      )}

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
