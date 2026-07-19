'use client';
import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { useReportOrders } from '@/hooks/useReportOrders';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatCurrency = (value: number | string) => {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ProductReportPage() {
  const { orders, loading } = useReportOrders();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const productData = useMemo(() => {
    const map: Record<string, any> = {};
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach((item: any) => {
          const name = item.product?.name || 'Unknown Product';
          if (!map[name]) {
            map[name] = { name, qty: 0, revenue: 0 };
          }
          const itemQty = Number(item.quantity || 0);
          const itemPrice = Number(item.price || 0);
          map[name].qty += itemQty;
          map[name].revenue += (itemQty * itemPrice);
        });
      }
    });
    return Object.values(map).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [orders]);

  const top10 = productData.slice(0, 10);
  
  const totalPages = Math.ceil(productData.length / itemsPerPage);
  const paginatedData = productData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns = [
    { key: 'name', label: 'Product Name' },
    { key: 'qty', label: 'Quantity Sold' },
    { key: 'revenue', label: 'Total Revenue (৳)', render: (row: any) => `৳${formatCurrency(row.revenue)}` }
  ];

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner text-primary"></span></div>;

  return (
    <>
      {top10.length > 0 && (
        <Card title="Top 10 Revenue Generating Products" className="mb-6">
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" tickFormatter={(v) => `৳${v}`} />
                <YAxis dataKey="name" type="category" tick={{fontSize: 11}} stroke="#9ca3af" width={150} />
                <Tooltip formatter={(value: any) => [`৳${formatCurrency(value)}`, 'Revenue']} labelStyle={{color: '#1f2937'}} cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card title="Product Sales Data">
        <Table columns={columns} data={paginatedData} onEdit={undefined} onDelete={undefined} />
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
            <span className="text-sm">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, productData.length)} of {productData.length} products</span>
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
