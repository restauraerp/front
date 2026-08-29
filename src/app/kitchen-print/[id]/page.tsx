'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useBranding } from '@/hooks/useBranding';

export default function KitchenPrintPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const branding = useBranding();

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

  if (loading) return <div className="p-10 text-center font-mono">Loading KOT...</div>;
  if (!order) return <div className="p-10 text-center font-mono">Order not found.</div>;

  return (
    <div id="kot" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', padding: '10px', fontFamily: 'monospace', color: '#000', backgroundColor: '#fff' }}>
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
      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
        {branding.name && (
          <p style={{ fontSize: '0.9rem', margin: '0 0 4px 0', fontWeight: 'bold' }}>{branding.name.toUpperCase()}</p>
        )}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>KITCHEN ORDER TICKET</h1>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0' }}>{order.order_type.replace('_', ' ').toUpperCase()}</h2>
      </div>

      <div style={{ borderBottom: '2px dashed #000', paddingBottom: '10px', marginBottom: '10px', fontSize: '1rem', fontWeight: 'bold' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Order #: {order.id}</span>
          <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {/* The date, which this slip never carried. A ticket pulled off the
            spike the next morning, or kept for a dispute, said only that it
            was placed at 7:42 - with no way to tell which day. */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.85rem', fontWeight: 'normal' }}>
          <span>{new Date(order.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        {order.table && (
          <div style={{ marginTop: '5px' }}>
            <span>Table: {order.table.name}</span>
          </div>
        )}
      </div>

      <table style={{ width: '100%', fontSize: '1.1rem', marginBottom: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '1px dashed #000' }}>
            <th style={{ textAlign: 'center', paddingBottom: '5px', width: '20%' }}>Qty</th>
            <th style={{ textAlign: 'left', paddingBottom: '5px' }}>Item</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any, index: number) => (
            <tr key={item.id} style={{ borderBottom: '1px dotted #ccc' }}>
              <td style={{ textAlign: 'center', padding: '10px 0', verticalAlign: 'top', fontWeight: 'bold', fontSize: '1.2rem' }}>
                {item.quantity}x
              </td>
              <td style={{ padding: '10px 0', fontWeight: 'bold' }}>
                <span style={{ opacity: 0.7, fontSize: '0.9rem', marginRight: '6px' }}>#{item.product_id}</span>
                {item.product?.name || 'Unknown Item'}
                {item.product?.type === 'combo' && item.product?.combo_items?.length > 0 && (
                  <div style={{ marginTop: '4px', paddingLeft: '8px' }}>
                    {item.product.combo_items.map((ci: any, i: number) => (
                      <div key={i} style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>
                        ↳ {ci.quantity > 1 ? `${ci.quantity}× ` : ''}{ci.product?.name || ci.inventory_item?.title || 'Item'}
                      </div>
                    ))}
                  </div>
                )}
                {item.notes && (
                  <div style={{ fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 'normal', marginTop: '4px' }}>
                    * Note: {item.notes}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* CSS to optimize for thermal printers */}
      <style dangerouslySetInnerHTML={{__html: `
        @page { margin: 0; }
        body { margin: 0; padding: 0; background: #fff; }
        @media print {
          body * { visibility: hidden; }
          #kot, #kot * { visibility: visible; }
          #kot { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 10px; }
        }
      `}} />
    </div>
  );
}
