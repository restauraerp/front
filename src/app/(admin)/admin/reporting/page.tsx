'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRange, setFilterRange] = useState('12_months');

  useEffect(() => {
    fetchApi('/orders?nopaginate=1').then(res => {
      setOrders(res.data || res || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    let cutoff = new Date(0); // all time

    if (filterRange === 'today') {
      cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
    } else if (filterRange === 'past_week') {
      cutoff = new Date();
      cutoff.setDate(now.getDate() - 7);
    } else if (filterRange === 'past_28_days') {
      cutoff = new Date();
      cutoff.setDate(now.getDate() - 28);
    } else if (filterRange === '12_months') {
      cutoff = new Date();
      cutoff.setMonth(now.getMonth() - 12);
    }

    return orders.filter(order => {
      if (order.status === 'Cancelled' || order.status === 'Failed') return false;
      const orderDate = new Date(order.created_at);
      return orderDate >= cutoff;
    });
  }, [orders, filterRange]);

  const { totalRevenue, totalOrders, dailyData } = useMemo(() => {
    let rev = 0;
    let count = 0;
    const map: Record<string, any> = {};

    filteredOrders.forEach(order => {
      count++;
      const amount = Number(order.total || 0);
      rev += amount;

      const dateStr = new Date(order.created_at).toISOString().split('T')[0];
      if (!map[dateStr]) {
        map[dateStr] = { date: dateStr, orders: 0, revenue: 0 };
      }
      map[dateStr].orders++;
      map[dateStr].revenue += amount;
    });

    const data = Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date));

    return { totalRevenue: rev, totalOrders: count, dailyData: data };
  }, [filteredOrders]);

  const reversedDailyData = [...dailyData].reverse();

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'orders', label: 'Total Orders' },
    { key: 'revenue', label: 'Revenue (৳)', render: (row: any) => `৳${row.revenue.toFixed(2)}` }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Reporting & Analytics</h1>
          <p className="text-sm text-base-content/50 mt-1">View your order analytics and sales report</p>
        </div>
        
        <div>
          <select 
            className="select select-bordered" 
            value={filterRange} 
            onChange={(e) => setFilterRange(e.target.value)}
          >
            <option value="today">Daily Sales Report</option>
            <option value="past_week">Past Week</option>
            <option value="past_28_days">Past 28 Days</option>
            <option value="12_months">Past 12 Months</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <p>Loading analytics data...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
              <div className="stat-title text-xs">Total Revenue</div>
              <div className="stat-value text-success text-3xl">৳{totalRevenue.toFixed(2)}</div>
            </div>
            <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
              <div className="stat-title text-xs">Total Orders</div>
              <div className="stat-value text-primary text-3xl">{totalOrders}</div>
            </div>
            <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
              <div className="stat-title text-xs">Avg Order Value</div>
              <div className="stat-value text-info text-3xl">
                ৳{totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>

          {dailyData.length > 0 && (
            <Card title="Sales Trend">
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" />
                    <YAxis tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" tickFormatter={(v) => `৳${v}`} />
                    <Tooltip formatter={(value: any) => [`৳${Number(value || 0).toFixed(2)}`, 'Revenue']} labelStyle={{color: '#1f2937'}} />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card title="Sales Data Table">
            <Table columns={columns} data={reversedDailyData} onEdit={undefined} onDelete={undefined} />
          </Card>
        </>
      )}
    </div>
  );
}
