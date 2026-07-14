'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';

export default function ReceiptPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchApi(`/orders/${params.id}`)
        .then(res => {
          setOrder(res.data || res);
          // Wait for render then print
          setTimeout(() => {
            window.print();
          }, 500);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) return <div className="p-10 text-center font-mono">Loading receipt...</div>;
  if (!order) return <div className="p-10 text-center font-mono">Order not found.</div>;

  return (
    <div id="receipt" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', padding: '10px', fontFamily: 'monospace', color: '#000', backgroundColor: '#fff' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>RESTORA ERP</h1>
        <p style={{ margin: '0', fontSize: '0.85rem' }}>123 Restaurant Street</p>
        <p style={{ margin: '0', fontSize: '0.85rem' }}>Phone: +880 1234-567890</p>
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
                {item.notes && <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>* {item.notes}</div>}
              </td>
              <td style={{ textAlign: 'center', padding: '5px 0' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right', padding: '5px 0' }}>৳{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Subtotal</span>
          <span>৳{order.subtotal}</span>
        </div>
        {order.discount_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>Discount</span>
            <span>-৳{order.discount_amount}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Tax</span>
          <span>৳{order.tax_amount}</span>
        </div>
        {order.delivery_charge > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>Delivery</span>
            <span>৳{order.delivery_charge}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', marginTop: '10px', borderTop: '1px solid #000', paddingTop: '5px' }}>
          <span>TOTAL</span>
          <span>৳{order.total}</span>
        </div>
      </div>

      {order.payments && order.payments.length > 0 && (
        <div style={{ marginTop: '15px', fontSize: '0.85rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 5px 0' }}>PAID VIA {order.payments[0].method.toUpperCase()}</p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.85rem' }}>
        <p style={{ margin: '0' }}>Thank you for your visit!</p>
        <p style={{ margin: '0', fontSize: '0.75rem', marginTop: '5px' }}>Powered by RestoraERP</p>
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
