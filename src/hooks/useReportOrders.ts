import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

export function useReportOrders() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const filterRange = searchParams.get('range') || 'past_week';
    const customDateFrom = searchParams.get('from') || '';
    const customDateTo = searchParams.get('to') || '';
    const selectedBranch = searchParams.get('branch') || 'all';

    if (filterRange === 'custom' && (!customDateFrom || !customDateTo)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const now = new Date();
    let url = '/orders?nopaginate=1';
    let fromDate = '';
    let toDate = '';

    const getDhakaBoundary = (baseDate: Date, endOfDay = false) => {
      const dhakaStr = baseDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
      const d = new Date(dhakaStr);
      if (endOfDay) d.setHours(23, 59, 59, 999);
      else d.setHours(0, 0, 0, 0);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    if (filterRange === 'today') {
      fromDate = getDhakaBoundary(now, false);
    } else if (filterRange === 'yesterday') {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      fromDate = getDhakaBoundary(y, false);
      toDate = getDhakaBoundary(y, true);
    } else if (filterRange === 'past_week') {
      const w = new Date(now); w.setDate(w.getDate() - 7);
      fromDate = getDhakaBoundary(w, false);
    } else if (filterRange === 'past_28_days') {
      const w = new Date(now); w.setDate(w.getDate() - 28);
      fromDate = getDhakaBoundary(w, false);
    } else if (filterRange === '12_months') {
      const m = new Date(now); m.setMonth(m.getMonth() - 12);
      fromDate = getDhakaBoundary(m, false);
    } else if (filterRange === 'custom') {
      if (customDateFrom) {
        // Parse the input date, assuming it represents a local day in Dhaka
        const cFrom = new Date(`${customDateFrom}T00:00:00`); 
        fromDate = getDhakaBoundary(cFrom, false);
      }
      if (customDateTo) {
        const cTo = new Date(`${customDateTo}T00:00:00`); 
        toDate = getDhakaBoundary(cTo, true);
      }
    }

    if (fromDate) url += `&from=${fromDate}`;
    if (toDate) url += `&to=${toDate}`;
    if (selectedBranch !== 'all') url += `&location_id=${selectedBranch}`;

    fetchApi(url).then(res => {
      setOrders((res.data || res || []).filter((o: any) => o.status !== 'Cancelled' && o.status !== 'Failed'));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [searchParams]);

  return { orders, loading, filterRange: searchParams.get('range') || 'past_week' };
}
