'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import AccountingFilterBar from '@/components/accounting/AccountingFilterBar';

function LedgersPageContent() {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page') || '1';
  const locationId = searchParams.get('location_id') || 'all';
  const filterRange = searchParams.get('range') || 'all_time';
  const customDateFrom = searchParams.get('from') || '';
  const customDateTo = searchParams.get('to') || '';

  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(parseInt(pageParam));
  const [totalPages, setTotalPages] = useState(1);

  // Sync internal page state with URL search param if it changes
  useEffect(() => {
    setPage(parseInt(pageParam));
  }, [pageParam]);

  useEffect(() => {
    loadData();
  }, [page, locationId, filterRange, customDateFrom, customDateTo]);

  const loadData = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      query.append('page', page.toString());
      if (locationId !== 'all') query.append('location_id', locationId);

      const now = new Date();
      let computedStartDate = '';
      let computedEndDate = '';

      const getDhakaBoundary = (baseDate: Date, endOfDay = false) => {
        const dhakaStr = baseDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
        const d = new Date(dhakaStr);
        if (endOfDay) d.setHours(23, 59, 59, 999);
        else d.setHours(0, 0, 0, 0);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };

      if (filterRange === 'today') {
        computedStartDate = getDhakaBoundary(now, false);
      } else if (filterRange === 'yesterday') {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        computedStartDate = getDhakaBoundary(y, false);
        computedEndDate = getDhakaBoundary(y, true);
      } else if (filterRange === 'past_week') {
        const w = new Date(now); w.setDate(w.getDate() - 7);
        computedStartDate = getDhakaBoundary(w, false);
      } else if (filterRange === 'past_28_days') {
        const w = new Date(now); w.setDate(w.getDate() - 28);
        computedStartDate = getDhakaBoundary(w, false);
      } else if (filterRange === '12_months') {
        const m = new Date(now); m.setMonth(m.getMonth() - 12);
        computedStartDate = getDhakaBoundary(m, false);
      } else if (filterRange === 'custom') {
        if (customDateFrom) {
          const cFrom = new Date(`${customDateFrom}T00:00:00`); 
          computedStartDate = getDhakaBoundary(cFrom, false);
        }
        if (customDateTo) {
          const cTo = new Date(`${customDateTo}T00:00:00`); 
          computedEndDate = getDhakaBoundary(cTo, true);
        }
      }

      if (computedStartDate) query.append('start_date', computedStartDate);
      if (computedEndDate) query.append('end_date', computedEndDate);

      const res = await fetchApi(`/accounting-ledgers?${query.toString()}`);
      if (res && res.data && Array.isArray(res.data)) {
         setLedgers(res.data);
         setTotalPages(res.last_page || 1);
      } else if (res && res.data && res.data.data && Array.isArray(res.data.data)) {
         setLedgers(res.data.data);
         setTotalPages(res.data.last_page || 1);
      } else {
         setLedgers(res.data || res || []);
         setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'transaction_type', label: 'Type' },
    { key: 'amount', label: 'Amount (৳)' },
    { key: 'description', label: 'Description' },
    { 
      key: 'created_at', 
      label: 'Date & Time',
      render: (row: any) => new Date(row.created_at).toLocaleString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
      })
    }
  ];

  const getRowClassName = (row: any) => {
    const type = (row.transaction_type || '').toLowerCase();
    
    // Inflows (Credits)
    if (['credit', 'income', 'sale'].includes(type)) {
      return 'bg-success/10';
    }
    
    // Outflows (Debits)
    if (['debit', 'expense', 'salary', 'purchase'].includes(type)) {
      return 'bg-error/10';
    }
    
    return '';
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h1>Accounting Ledgers</h1>
        <p style={{ color: 'var(--text-muted)' }}>View all automated financial transactions.</p>
      </div>

      <AccountingFilterBar />

      <Card>
        {loading ? (
          <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary"></span></div>
        ) : (
          <>
            <Table columns={columns} data={ledgers} rowClassName={getRowClassName} />
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 pb-2">
                <div className="join">
                  <button className="join-item btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>«</button>
                  <button className="join-item btn btn-sm bg-base-100 cursor-default">Page {page} of {totalPages}</button>
                  <button className="join-item btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>»</button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export default function LedgersPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><span className="loading loading-spinner text-primary"></span></div>}>
      <LedgersPageContent />
    </Suspense>
  );
}
