'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';

export default function LedgersPage() {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/accounting-ledgers');
      setLedgers(res.data || res || []);
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
    { key: 'created_at', label: 'Date' }
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Accounting Ledgers</h1>
        <p style={{ color: 'var(--text-muted)' }}>View all automated financial transactions.</p>
      </div>

      <Card>
        {loading ? <p>Loading ledgers...</p> : <Table columns={columns} data={ledgers} />}
      </Card>
    </div>
  );
}
