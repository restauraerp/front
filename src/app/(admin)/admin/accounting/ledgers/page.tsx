'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';

export default function LedgersPage() {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/accounting-ledgers?page=${page}`);
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
      <div style={{ marginBottom: '2rem' }}>
        <h1>Accounting Ledgers</h1>
        <p style={{ color: 'var(--text-muted)' }}>View all automated financial transactions.</p>
      </div>

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
