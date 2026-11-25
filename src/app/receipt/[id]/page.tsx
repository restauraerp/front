'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { useBranding } from '@/hooks/useBranding';
import { displayFacebookUrl } from '@/lib/facebook';

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

  const isMinimal = branding.isMinimalReceipt;
  const scale = branding.receiptScaleFactor || 1.0;

  return (
    <div
      id="receipt"
      style={{
        width: '100%',
        maxWidth: isMinimal ? '280px' : '300px',
        margin: '0 auto',
        padding: isMinimal ? '4px 6px' : '10px',
        fontFamily: 'monospace',
        color: '#000',
        backgroundColor: '#fff',
        fontSize: `${(0.85 * scale).toFixed(3)}rem`,
        lineHeight: isMinimal ? 1.2 : 1.4,
      }}
    >
      {/* ── Detailed Mode: Full Large Token Banner ── */}
      {!isMinimal && order.token_number != null && (
        <div style={{ textAlign: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #000' }}>
          <div style={{ fontSize: `${(0.75 * scale).toFixed(3)}rem`, letterSpacing: '0.15em' }}>TOKEN</div>
          <div style={{ fontSize: `${(2.6 * scale).toFixed(3)}rem`, fontWeight: 'bold', lineHeight: 1 }}>{order.token_number}</div>
        </div>
      )}

      {/* ── Detailed Mode: Standard Header ── */}
      {!isMinimal && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {branding.logo && (
            <img
              src={`/storage/${branding.logo}`}
              alt=""
              style={{ maxWidth: '120px', maxHeight: '80px', margin: '0 auto 8px', display: 'block', objectFit: 'contain' }}
            />
          )}
          <h1 style={{ fontSize: `${(1.5 * scale).toFixed(3)}rem`, fontWeight: 'bold', margin: '0 0 5px 0' }}>
            {(branding.name || 'Receipt').toUpperCase()}
          </h1>
          {branding.address && <p style={{ margin: '0', fontSize: `${(0.85 * scale).toFixed(3)}rem` }}>{branding.address}</p>}
          {branding.phone && <p style={{ margin: '0', fontSize: `${(0.85 * scale).toFixed(3)}rem` }}>{branding.phone}</p>}
        </div>
      )}

      {/* ── Minimal Mode: Ultra-Compact Roll-Saving Header ── */}
      {isMinimal && (
        <div style={{ textAlign: 'center', marginBottom: '4px', borderBottom: '1px dashed #000', paddingBottom: '4px' }}>
          <h1 style={{ fontSize: `${(1.1 * scale).toFixed(3)}rem`, fontWeight: 'bold', margin: '0' }}>
            {(branding.name || 'Receipt').toUpperCase()}
          </h1>
          {branding.phone && (
            <p style={{ margin: '0', fontSize: `${(0.75 * scale).toFixed(3)}rem`, color: '#333' }}>{branding.phone}</p>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '3px',
              fontSize: `${(0.75 * scale).toFixed(3)}rem`,
              fontWeight: 600,
            }}
          >
            {order.token_number != null ? <span>#TOKEN {order.token_number}</span> : <span>ORD #{order.id}</span>}
            {order.token_number != null && <span>ORD #{order.id}</span>}
            <span>{new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}

      {/* ── Detailed Mode: Order Metadata ── */}
      {!isMinimal && (
        <div style={{ borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px', fontSize: `${(0.85 * scale).toFixed(3)}rem` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Order #: {order.id}</span>
            <span>{new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            <span>Type: {order.order_type.replace('_', ' ').toUpperCase()}</span>
            <span>Status: {order.status.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* ── Items Table ── */}
      <table style={{ width: '100%', fontSize: `${(0.85 * scale).toFixed(3)}rem`, marginBottom: isMinimal ? '4px' : '10px' }}>
        <thead>
          <tr style={{ borderBottom: '1px dashed #000' }}>
            <th style={{ textAlign: 'left', paddingBottom: isMinimal ? '2px' : '5px' }}>Item</th>
            <th style={{ textAlign: 'center', paddingBottom: isMinimal ? '2px' : '5px' }}>Qty</th>
            <th style={{ textAlign: 'right', paddingBottom: isMinimal ? '2px' : '5px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any) => (
            <tr key={item.id}>
              <td style={{ padding: isMinimal ? '2px 0' : '5px 0' }}>
                {!isMinimal && (
                  <span style={{ opacity: 0.7, marginRight: '4px', fontSize: `${(0.8 * scale).toFixed(3)}rem` }}>
                    #{item.product_id}
                  </span>
                )}
                {item.product?.name || 'Unknown Item'}
                {item.product?.type === 'combo' && item.product?.combo_items?.length > 0 && (
                  <div style={{ paddingLeft: '6px', marginTop: '1px' }}>
                    {item.product.combo_items.map((ci: any, i: number) => (
                      <div key={i} style={{ fontSize: `${(0.7 * scale).toFixed(3)}rem`, color: '#555' }}>
                        ↳ {ci.quantity > 1 ? `${ci.quantity}× ` : ''}{ci.product?.name || ci.inventory_item?.title || 'Item'}
                      </div>
                    ))}
                  </div>
                )}
                {item.notes && (
                  <div style={{ fontSize: `${(0.72 * scale).toFixed(3)}rem`, fontStyle: 'italic' }}>* {item.notes}</div>
                )}
              </td>
              <td style={{ textAlign: 'center', padding: isMinimal ? '2px 0' : '5px 0', verticalAlign: 'top' }}>
                {item.quantity}
              </td>
              <td style={{ textAlign: 'right', padding: isMinimal ? '2px 0' : '5px 0', verticalAlign: 'top' }}>
                {branding.currency}{(item.price * item.quantity).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals & Summary ── */}
      <div style={{ borderTop: '1px dashed #000', paddingTop: isMinimal ? '4px' : '10px', fontSize: `${(0.85 * scale).toFixed(3)}rem` }}>
        {(!isMinimal || order.discount_amount > 0 || order.tax_amount > 0 || order.delivery_charge > 0) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMinimal ? '2px' : '5px' }}>
            <span>Subtotal</span>
            <span>{branding.currency}{order.subtotal}</span>
          </div>
        )}
        {order.discount_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMinimal ? '2px' : '5px' }}>
            <span>Discount</span>
            <span>-{branding.currency}{order.discount_amount}</span>
          </div>
        )}
        {order.tax_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMinimal ? '2px' : '5px' }}>
            <span>Tax</span>
            <span>{branding.currency}{order.tax_amount}</span>
          </div>
        )}
        {order.delivery_charge > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMinimal ? '2px' : '5px' }}>
            <span>Delivery</span>
            <span>{branding.currency}{order.delivery_charge}</span>
          </div>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: `${(1.0 * scale).toFixed(3)}rem`,
            marginTop: isMinimal ? '3px' : '10px',
            borderTop: '1px solid #000',
            paddingTop: isMinimal ? '2px' : '5px',
          }}
        >
          <span>TOTAL</span>
          <span>{branding.currency}{order.total}</span>
        </div>
      </div>

      {order.payments && order.payments.length > 0 && (
        <div style={{ marginTop: isMinimal ? '4px' : '15px', fontSize: `${(0.8 * scale).toFixed(3)}rem`, textAlign: 'center' }}>
          <p style={{ margin: '0' }}>PAID VIA {order.payments[0].method.toUpperCase()}</p>
        </div>
      )}

      {/* Settings > Facebook page. In detailed mode only: saves ~40mm of paper roll in minimal mode. */}
      {!isMinimal && branding.facebookQr && branding.facebookPage && (
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: `${(0.8 * scale).toFixed(3)}rem` }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>Follow us on Facebook</p>
          <QRCodeSVG value={branding.facebookPage} size={120} level="M" marginSize={1} style={{ display: 'block', margin: '0 auto' }} />
          <p style={{ margin: '4px 0 0 0', fontSize: `${(0.7 * scale).toFixed(3)}rem`, wordBreak: 'break-all' }}>{displayFacebookUrl(branding.facebookPage)}</p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: isMinimal ? '6px' : '30px', fontSize: `${(0.8 * scale).toFixed(3)}rem` }}>
        <p style={{ margin: '0' }}>{branding.receiptFooter || 'Thank you for your visit!'}</p>
      </div>

      {/* CSS to optimize for thermal printers */}
      <style dangerouslySetInnerHTML={{__html: `
        @page { margin: 0; }
        body { margin: 0; padding: 0; background: #fff; }
        @media print {
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: ${isMinimal ? '4px 6px' : '10px'}; }
        }
      `}} />
    </div>
  );
}
