'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatCurrency = (value: number | string) => {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function ReportingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRange, setFilterRange] = useState('past_week');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [chartType, setChartType] = useState('bar');
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('all');

  useEffect(() => {
    fetchApi('/locations?nopaginate=true').then(res => {
      setLocations(res.data || res || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (filterRange === 'custom' && (!customDateFrom || !customDateTo)) {
      return;
    }

    setLoading(true);
    const now = new Date();
    let url = '/orders?nopaginate=1';
    let fromDate = '';
    let toDate = '';

    if (filterRange === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      fromDate = d.toISOString();
    } else if (filterRange === 'yesterday') {
      const d = new Date();
      d.setDate(now.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      fromDate = d.toISOString();
      const endD = new Date();
      endD.setDate(now.getDate() - 1);
      endD.setHours(23, 59, 59, 999);
      toDate = endD.toISOString();
    } else if (filterRange === 'past_week') {
      const d = new Date();
      d.setDate(now.getDate() - 7);
      fromDate = d.toISOString();
    } else if (filterRange === 'past_28_days') {
      const d = new Date();
      d.setDate(now.getDate() - 28);
      fromDate = d.toISOString();
    } else if (filterRange === '12_months') {
      const d = new Date();
      d.setMonth(now.getMonth() - 12);
      fromDate = d.toISOString();
    } else if (filterRange === 'custom') {
      if (customDateFrom) fromDate = new Date(customDateFrom).toISOString();
      if (customDateTo) {
        const d = new Date(customDateTo);
        d.setHours(23, 59, 59, 999);
        toDate = d.toISOString();
      }
    }

    if (fromDate) url += `&from=${fromDate}`;
    if (toDate) url += `&to=${toDate}`;
    if (selectedBranch !== 'all') {
      url += `&location_id=${selectedBranch}`;
    }

    fetchApi(url).then(res => {
      setOrders(res.data || res || []);
      setLoading(false);
      setCurrentPage(1);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [filterRange, customDateFrom, customDateTo, selectedBranch]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => order.status !== 'Cancelled' && order.status !== 'Failed');
  }, [orders]);

  const { totalRevenue, totalOrders, dailyData } = useMemo(() => {
    let rev = 0;
    let count = 0;
    const map: Record<string, any> = {};

    filteredOrders.forEach(order => {
      count++;
      const amount = Number(order.total || 0);
      rev += amount;

      const d = new Date(order.created_at);
      let dateStr = '';
      if (filterRange === 'today' || filterRange === 'yesterday') {
        const hours = d.getHours().toString().padStart(2, '0');
        dateStr = `${hours}:00`;
      } else if (filterRange === '12_months' || filterRange === 'all_time') {
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        dateStr = `${year}-${month}`;
      } else {
        dateStr = d.toISOString().split('T')[0];
      }

      if (!map[dateStr]) {
        map[dateStr] = { date: dateStr, orders: 0, revenue: 0 };
      }
      map[dateStr].orders++;
      map[dateStr].revenue += amount;
    });

    const data = Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date));

    return { totalRevenue: rev, totalOrders: count, dailyData: data };
  }, [filteredOrders, filterRange]);

  const reversedDailyData = [...dailyData].reverse();

  const totalPages = Math.ceil(reversedDailyData.length / itemsPerPage);
  const paginatedData = reversedDailyData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns = [
    { key: 'date', label: (filterRange === 'today' || filterRange === 'yesterday') ? 'Time' : (filterRange === '12_months' || filterRange === 'all_time' ? 'Month' : 'Date') },
    { key: 'orders', label: 'Total Orders' },
    { key: 'revenue', label: 'Revenue (৳)', render: (row: any) => `৳${formatCurrency(row.revenue)}` }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Reporting & Analytics</h1>
          <p className="text-sm text-base-content/50 mt-1">View your order analytics and sales report</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="select select-bordered" 
            value={selectedBranch} 
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="all">All Branches</option>
            {locations.map((loc: any) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>

          {filterRange === 'custom' && (
            <div className="flex gap-2 items-center mr-2 bg-base-100 p-1 rounded-xl border border-base-200">
              <input type="date" className="input input-sm border-none focus:outline-none" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} />
              <span className="text-xs text-base-content/50">to</span>
              <input type="date" className="input input-sm border-none focus:outline-none" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} />
            </div>
          )}
          <select 
            className="select select-bordered" 
            value={filterRange} 
            onChange={(e) => setFilterRange(e.target.value)}
          >
            <option value="today">Daily Sales Report (Today)</option>
            <option value="yesterday">Yesterday</option>
            <option value="past_week">Past Week</option>
            <option value="past_28_days">Past 28 Days</option>
            <option value="12_months">Past 12 Months</option>
            <option value="all_time">All Time</option>
            <option value="custom">Custom Range</option>
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
              <div className="stat-value text-success text-3xl">৳{formatCurrency(totalRevenue)}</div>
            </div>
            <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
              <div className="stat-title text-xs">Total Orders</div>
              <div className="stat-value text-primary text-3xl">{totalOrders}</div>
            </div>
            <div className="stat bg-base-100 border border-base-200 rounded-2xl shadow-sm">
              <div className="stat-title text-xs">Avg Order Value</div>
              <div className="stat-value text-info text-3xl">
                ৳{formatCurrency(totalOrders > 0 ? (totalRevenue / totalOrders) : 0)}
              </div>
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
                <span className="text-sm text-base-content/60">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, reversedDailyData.length)} of {reversedDailyData.length} entries
                </span>
                <div className="join">
                  <button 
                    className="join-item btn btn-sm btn-outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    «
                  </button>
                  <button className="join-item btn btn-sm no-animation pointer-events-none">
                    Page {currentPage} of {totalPages}
                  </button>
                  <button 
                    className="join-item btn btn-sm btn-outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
