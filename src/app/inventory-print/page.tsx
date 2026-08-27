'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useBranding } from '@/hooks/useBranding';

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  unit: string | null;
  cost_per_unit: number;
  min_stock_level: number;
  quantity: number;
  total_value: number;
  is_low: boolean;
}

interface InventoryReportData {
  scoped_to_location: boolean;
  summary: {
    items_count: number;
    low_stock_count: number;
    total_value: number;
  };
  data: InventoryItem[];
}

export default function InventoryReportPrintPage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get('branch') || '';
  const mode = searchParams.get('mode') || 'a4'; // 'a4' or 'thermal'
  const lowOnly = searchParams.get('low_only') === 'true';

  const [report, setReport] = useState<InventoryReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const branding = useBranding();

  useEffect(() => {
    if (!branding.loaded) return;

    let printed = false;
    const query = new URLSearchParams();
    if (branch && branch !== 'all') {
      query.set('location_id', branch);
    }

    fetchApi(`/reports/inventory?${query.toString()}`)
      .then((res: any) => {
        const payload = res?.data?.summary ? res.data : (res?.summary ? res : res?.data);
        if (payload && payload.summary && Array.isArray(payload.data)) {
          let items = payload.data;
          if (lowOnly) {
            items = items.filter((item: InventoryItem) => item.is_low);
          }
          setReport({
            ...payload,
            data: items,
          });
          setTimeout(() => {
            if (!printed) {
              printed = true;
              window.print();
            }
          }, 400);
        } else {
          setError('Invalid inventory report data received.');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load inventory report');
      })
      .finally(() => setLoading(false));

    return () => {
      printed = true;
    };
  }, [branch, branding.loaded, lowOnly]);

  if (loading) {
    return <div className="p-10 text-center font-mono">Loading inventory report for print...</div>;
  }

  if (error || !report || !report.summary || !Array.isArray(report.data)) {
    return <div className="p-10 text-center font-mono text-red-600">{error || 'Report not found.'}</div>;
  }

  const currency = branding.currency || '৳';
  const nowStr = new Date().toLocaleString();

  if (mode === 'thermal') {
    return (
      <div
        id="thermal-inventory"
        style={{
          width: '100%',
          maxWidth: '300px',
          margin: '0 auto',
          padding: '10px',
          fontFamily: 'monospace',
          color: '#000',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 4px 0' }}>
            {(branding.name || 'RestoraERP').toUpperCase()}
          </h1>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
            INVENTORY AUDIT REPORT
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>{nowStr}</div>
          {report.scoped_to_location && (
            <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>Branch Filtered</div>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', marginBottom: '10px', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Items Tracked:</span>
            <strong>{report.summary.items_count}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Low Stock:</span>
            <strong style={{ color: report.summary.low_stock_count > 0 ? '#000' : 'inherit' }}>{report.summary.low_stock_count}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Value:</span>
            <strong>{currency}{Number(report.summary.total_value).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>

        <table style={{ width: '100%', fontSize: '0.75rem', marginBottom: '15px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
              <th style={{ paddingBottom: '4px' }}>Item / SKU</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Sys</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px', width: '45px' }}>Actual</th>
            </tr>
          </thead>
          <tbody>
            {report.data.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px dashed #ccc' }}>
                <td style={{ padding: '4px 0', paddingRight: '4px' }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {item.name} {item.is_low ? '[LOW]' : ''}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#333' }}>
                    {item.sku ? `SKU: ${item.sku} | ` : ''}{item.unit || 'Unit'}
                  </div>
                </td>
                <td style={{ textAlign: 'right', padding: '4px 0', verticalAlign: 'top', fontWeight: 'bold' }}>
                  {item.quantity}
                </td>
                <td style={{ textAlign: 'right', padding: '4px 0', verticalAlign: 'top' }}>
                  [ &nbsp; &nbsp; ]
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px dashed #000', paddingTop: '10px', fontSize: '0.75rem' }}>
          <div>Audit By: ___________________</div>
          <div style={{ marginTop: '6px' }}>Date: ____________________</div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @page { margin: 0; }
          body { margin: 0; padding: 0; background: #fff; }
          @media print {
            body * { visibility: hidden; }
            #thermal-inventory, #thermal-inventory * { visibility: visible; }
            #thermal-inventory { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 8px; }
          }
        ` }} />
      </div>
    );
  }

  // A4 Size Layout
  return (
    <div
      id="a4-inventory"
      style={{
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '24px',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#111827',
        backgroundColor: '#fff',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            {branding.name || 'RestoraERP'}
          </h1>
          {branding.address && <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#4b5563' }}>{branding.address}</p>}
          {branding.phone && <p style={{ margin: '2px 0 0 0', fontSize: '0.875rem', color: '#4b5563' }}>Phone: {branding.phone}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e40af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Inventory Audit Report
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            Generated: {nowStr}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
            Scope: {report.scoped_to_location ? 'Selected Branch' : 'All Outlets'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Total Items</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{report.summary.items_count}</div>
        </div>
        <div style={{ background: report.summary.low_stock_count > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${report.summary.low_stock_count > 0 ? '#fecaca' : '#bbf7d0'}`, padding: '12px 16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: report.summary.low_stock_count > 0 ? '#991b1b' : '#166534', fontWeight: 600 }}>Low Stock Alert</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: report.summary.low_stock_count > 0 ? '#dc2626' : '#15803d', marginTop: '2px' }}>{report.summary.low_stock_count} items</div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Total Stock Value</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
            {currency}{Number(report.summary.total_value).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '30px' }}>
        <thead>
          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>#</th>
            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Item Details</th>
            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>SKU</th>
            <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Unit</th>
            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Cost/Unit</th>
            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Reorder Level</th>
            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>System Stock</th>
            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Stock Value</th>
            <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#334155', width: '100px' }}>Physical Count</th>
          </tr>
        </thead>
        <tbody>
          {report.data.map((item, idx) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ padding: '8px', color: '#64748b' }}>{idx + 1}</td>
              <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>
                {item.name}
                {item.is_low && (
                  <span style={{ marginLeft: '6px', background: '#fee2e2', color: '#991b1b', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    LOW
                  </span>
                )}
              </td>
              <td style={{ padding: '8px', color: '#475569', fontFamily: 'monospace' }}>{item.sku || '-'}</td>
              <td style={{ padding: '8px', textAlign: 'center', color: '#475569' }}>{item.unit || '-'}</td>
              <td style={{ padding: '8px', textAlign: 'right', color: '#0f172a' }}>{currency}{item.cost_per_unit.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>{item.min_stock_level}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: item.is_low ? '#dc2626' : '#0f172a' }}>
                {item.quantity}
              </td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                {currency}{item.total_value.toFixed(2)}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', borderLeft: '1px dashed #cbd5e1' }}>
                <div style={{ borderBottom: '1px solid #94a3b8', width: '80px', margin: '0 auto', height: '18px' }}></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Audit Signature Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', pageBreakInside: 'avoid' }}>
        <div style={{ width: '220px', textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '8px', height: '30px' }}></div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Audited By (Name & Signature)</div>
        </div>
        <div style={{ width: '220px', textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '8px', height: '30px' }}></div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Manager Approval</div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 12mm; }
        body { margin: 0; padding: 0; background: #fff; }
        @media print {
          body * { visibility: hidden; }
          #a4-inventory, #a4-inventory * { visibility: visible; }
          #a4-inventory { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; margin: 0; padding: 0; }
        }
      ` }} />
    </div>
  );
}
