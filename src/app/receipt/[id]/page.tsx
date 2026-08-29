'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useBranding } from '@/hooks/useBranding';

export default function ReceiptPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const branding = useBranding();

  useEffect(() => {
    // Printing waits for the restaurant's name as well as the order. Firing at
    // a fixed 500ms raced the settings request and could put a nameless header
    // on paper, which is not something you can take back once it has printed.
    if (!params.id || !branding.loaded) return;

    let printed = false;

    fetchApi(`/orders/${params.id}`)
      .then(res => {
        setOrder(res.data || res);
        setTimeout(() => {
          if (!printed) {
            printed = true;
            window.print();
          }
        }, 300);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => { printed = true; };
  }, [params.id, branding.loaded]);

  if (loading) return <div className="p-10 text-center font-mono">Loading receipt...</div>;
  if (!order) return <div className="p-10 text-center font-mono">Order not found.</div>;

  return (
    <div id="receipt" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', padding: '10px', fontFamily: 'monospace', color: '#000', backgroundColor: '#fff' }}>
      {/* The day's counter number, first thing on the slip. It leads because
          it is the only line anyone reads from across a room; the order id
          below is unique forever but far too long to call out. Orders taken
          before token numbers existed have none, and get no banner. */}
      {order.token_number != null && (
        <div style={{ textAlign: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #000' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.15em' }}>TOKEN</div>
          <div style={{ fontSize: '2.6rem', fontWeight: 'bold', lineHeight: 1 }}>{order.token_number}</div>
        </div>
      )}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        {branding.logo && (
          <img
            src={`/storage/${branding.logo}`}
            alt=""
            style={{ maxWidth: '120px', maxHeight: '80px', margin: '0 auto 8px', display: 'block', objectFit: 'contain' }}
          />
        )}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>
          {(branding.name || 'Receipt').toUpperCase()}
        </h1>
        {branding.address && <p style={{ margin: '0', fontSize: '0.85rem' }}>{branding.address}</p>}
        {branding.phone && <p style={{ margin: '0', fontSize: '0.85rem' }}>{branding.phone}</p>}
      </div>

      <div style={{ borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Order #: {order.id}</span>
          <span>{new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          <span>Type: {order.order_type.replace('_', ' ').toUpperCase()}</span>
          <span>Status: {order.status.toUpperCase()}</span>
        </div>
      </div>

      <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '10px' }}>
        <thead>
          <tr style={{ borderBottom: '1px dashed #000' }}>
            <th style={{ textAlign: 'left', paddingBottom: '5px' }}>Item</th>
            <th style={{ textAlign: 'center', paddingBottom: '5px' }}>Qty</th>
            <th style={{ textAlign: 'right', paddingBottom: '5px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any) => (
            <tr key={item.id}>
              <td style={{ padding: '5px 0' }}>
                <span style={{ opacity: 0.7, marginRight: '4px', fontSize: '0.8rem' }}>#{item.product_id}</span>
                {item.product?.name || 'Unknown Item'}
                {item.product?.type === 'combo' && item.product?.combo_items?.length > 0 && (
                  <div style={{ paddingLeft: '6px', marginTop: '2px' }}>
                    {item.product.combo_items.map((ci: any, i: number) => (
                      <div key={i} style={{ fontSize: '0.7rem', color: '#555' }}>
                        ↳ {ci.quantity > 1 ? `${ci.quantity}× ` : ''}{ci.product?.name || ci.inventory_item?.title || 'Item'}
                      </div>
                    ))}
                  </div>
                )}
                {item.notes && <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>* {item.notes}</div>}
              </td>
              <td style={{ textAlign: 'center', padding: '5px 0' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right', padding: '5px 0' }}>{branding.currency}{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Subtotal</span>
          <span>{branding.currency}{order.subtotal}</span>
        </div>
        {order.discount_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>Discount</span>
            <span>-{branding.currency}{order.discount_amount}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Tax</span>
          <span>{branding.currency}{order.tax_amount}</span>
        </div>
        {order.delivery_charge > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>Delivery</span>
            <span>{branding.currency}{order.delivery_charge}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', marginTop: '10px', borderTop: '1px solid #000', paddingTop: '5px' }}>
          <span>TOTAL</span>
          <span>{branding.currency}{order.total}</span>
        </div>
      </div>

      {order.payments && order.payments.length > 0 && (
        <div style={{ marginTop: '15px', fontSize: '0.85rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 5px 0' }}>PAID VIA {order.payments[0].method.toUpperCase()}</p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.85rem' }}>
        <p style={{ margin: '0' }}>{branding.receiptFooter || 'Thank you for your visit!'}</p>
      </div>

      {/* CSS to optimize for thermal printers */}
      <style dangerouslySetInnerHTML={{__html: `
        @page { margin: 0; }
        body { margin: 0; padding: 0; background: #fff; }
        @media print {
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 10px; }
        }
      `}} />
    </div>
  );
}
