'use client';
import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useReportOrders } from '@/hooks/useReportOrders';

const formatCurrency = (value: number | string) => {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function SalesReportPage() {
  const { orders, loading, filterRange } = useReportOrders();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [chartType, setChartType] = useState('bar');

  const { totalRevenue, totalOrders, dailyData } = useMemo(() => {
    let rev = 0; let count = 0;
    const map: Record<string, any> = {};

    orders.forEach(order => {
      count++;
      const amount = Number(order.total || 0);
      rev += amount;
      const d = new Date(order.created_at);
      let dateStr = '';
      if (filterRange === 'today' || filterRange === 'yesterday') {
        dateStr = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else if (filterRange === '12_months' || filterRange === 'all_time') {
        dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        dateStr = d.toISOString().split('T')[0];
      }
      if (!map[dateStr]) map[dateStr] = { date: dateStr, orders: 0, revenue: 0 };
      map[dateStr].orders++;
      map[dateStr].revenue += amount;
    });

    const data = Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date));
    return { totalRevenue: rev, totalOrders: count, dailyData: data };
  }, [orders, filterRange]);

  const reversedDailyData = [...dailyData].reverse();
  const totalPages = Math.ceil(reversedDailyData.length / itemsPerPage);
  const paginatedData = reversedDailyData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns = [
    { key: 'date', label: (filterRange === 'today' || filterRange === 'yesterday') ? 'Time' : (filterRange === '12_months' || filterRange === 'all_time' ? 'Month' : 'Date') },
    { key: 'orders', label: 'Total Orders' },
    { key: 'revenue', label: 'Revenue (৳)', render: (row: any) => `৳${formatCurrency(row.revenue)}` }
  ];

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner text-primary"></span></div>;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-title text-xs">Total Revenue</div>
          <div className="stat-value text-success text-3xl">৳{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-title text-xs">Total Orders</div>
          <div className="stat-value text-primary text-3xl">{totalOrders}</div>
        </div>
        <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <div className="stat-title text-xs">Avg Order Value</div>
          <div className="stat-value text-info text-3xl">৳{formatCurrency(totalOrders > 0 ? (totalRevenue / totalOrders) : 0)}</div>
        </div>
      </div>

      {dailyData.length > 0 && (
        <Card title="Sales Trend">
          <div className="flex justify-end mb-2">
            <div className="join">
              <button className={`join-item btn btn-xs ${chartType === 'bar' ? 'btn-primary' : 'btn-outline border-base-300'}`} onClick={() => setChartType('bar')}>Bar</button>
              <button className={`join-item btn btn-xs ${chartType === 'line' ? 'btn-primary' : 'btn-outline border-base-300'}`} onClick={() => setChartType('line')}>Line</button>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" />
                  <YAxis tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" tickFormatter={(v) => `৳${formatCurrency(v)}`} />
                  <Tooltip formatter={(value: any) => [`৳${formatCurrency(value)}`, 'Revenue']} labelStyle={{color: '#1f2937'}} cursor={{fill: '#f3f4f6'}} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" />
                  <YAxis tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" tickFormatter={(v) => `৳${formatCurrency(v)}`} />
                  <Tooltip formatter={(value: any) => [`৳${formatCurrency(value)}`, 'Revenue']} labelStyle={{color: '#1f2937'}} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card title="Sales Data Table">
        <Table columns={columns} data={paginatedData} onEdit={undefined} onDelete={undefined} />
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
            <span className="text-sm">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, reversedDailyData.length)} of {reversedDailyData.length} entries</span>
            <div className="join">
              <button className="join-item btn btn-sm btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>«</button>
              <button className="join-item btn btn-sm no-animation pointer-events-none">Page {currentPage} of {totalPages}</button>
              <button className="join-item btn btn-sm btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>»</button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
