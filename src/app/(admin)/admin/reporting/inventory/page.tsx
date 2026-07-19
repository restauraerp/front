'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { fetchApi } from '@/lib/api';

const formatCurrency = (value: number | string) => {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function InventoryReportPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchApi('/inventory-items?nopaginate=true')
      .then(res => {
        setItems(res.data || res || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sortedItems = useMemo(() => {
    return [...items].sort((a: any, b: any) => {
      const aStock = Number(a.stock_quantity || 0);
      const bStock = Number(b.stock_quantity || 0);
      return aStock - bStock;
    });
  }, [items]);

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const paginatedData = sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns = [
    { key: 'name', label: 'Item Name' },
    { key: 'category', label: 'Category' },
    { key: 'unit', label: 'Unit' },
    { key: 'unit_price', label: 'Unit Price', render: (row: any) => `৳${formatCurrency(row.unit_price)}` },
    { key: 'stock_quantity', label: 'Stock Quantity', render: (row: any) => {
        const val = Number(row.stock_quantity || 0);
        return <span className={val < 10 ? 'text-error font-bold' : ''}>{val.toFixed(2)}</span>;
    }},
    { key: 'total_value', label: 'Total Value', render: (row: any) => {
        const val = Number(row.stock_quantity || 0) * Number(row.unit_price || 0);
        return `৳${formatCurrency(val)}`;
    }}
  ];

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner text-primary"></span></div>;

  return (
    <Card title="Inventory Stock Report (Low Stock First)">
      <Table columns={columns} data={paginatedData} onEdit={undefined} onDelete={undefined} />
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
          <span className="text-sm">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedItems.length)} of {sortedItems.length} items</span>
          <div className="join">
            <button className="join-item btn btn-sm btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>«</button>
            <button className="join-item btn btn-sm no-animation pointer-events-none">Page {currentPage} of {totalPages}</button>
            <button className="join-item btn btn-sm btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>»</button>
          </div>
        </div>
      )}
    </Card>
  );
}
