'use client';
import React, { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { useReportOrders } from '@/hooks/useReportOrders';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatCurrency = (value: number | string) => {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function TimeReportPage() {
  const { orders, loading } = useReportOrders();

  const hourlyData = useMemo(() => {
    const map: Record<string, any> = {};
    for (let i = 0; i < 24; i++) {
      const hourStr = `${i.toString().padStart(2, '0')}:00`;
      map[hourStr] = { time: hourStr, orders: 0, revenue: 0 };
    }

    orders.forEach(order => {
      const d = new Date(order.created_at);
      const hourStr = `${d.getHours().toString().padStart(2, '0')}:00`;
      map[hourStr].orders++;
      map[hourStr].revenue += Number(order.total || 0);
    });
    return Object.values(map);
  }, [orders]);

  const columns = [
    { key: 'time', label: 'Time of Day' },
    { key: 'orders', label: 'Total Orders' },
    { key: 'revenue', label: 'Revenue (৳)', render: (row: any) => `৳${formatCurrency(row.revenue)}` }
  ];

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner text-primary"></span></div>;

  return (
    <>
      <Card title="Sales by Hour of Day" className="mb-6">
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" />
              <YAxis tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" yAxisId="left" tickFormatter={(v) => `৳${formatCurrency(v)}`} />
              <YAxis tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" yAxisId="right" orientation="right" />
              <Tooltip formatter={(value: any, name: any) => [name === 'revenue' ? `৳${formatCurrency(value)}` : value, name === 'revenue' ? 'Revenue' : 'Orders']} labelStyle={{color: '#1f2937'}} />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="revenue" />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Hourly Sales Distribution">
        <Table columns={columns} data={hourlyData} onEdit={undefined} onDelete={undefined} />
      </Card>
    </>
  );
}
