'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { formatTaka } from '@/lib/format';
import {
  ReportLoading, ReportError, StatTile,
} from '@/components/reporting/ReportStates';
import { Table } from '@/components/ui/Table';
import { useTablePagination } from '@/hooks/useTablePagination';
import { ReportPager } from '@/components/reporting/ReportPager';

interface StockRow {
  id: number;
  name: string;
  sku: string | null;
  unit: string | null;
  cost_per_unit: number;
  quantity: number;
  total_value: number;
  is_low: boolean;
  min_stock_level: number;
}

interface InventoryReport {
  scoped_to_location: boolean;
  summary: {
    items_count: number;
    low_stock_count: number;
    total_value: number;
  };
  data: StockRow[];
}

export default function StockValuePage() {
  const { branch } = useReportFilters();

  // Stock value is point-in-time, not date-ranged — the inventory report ignores from/to.
  const { data, loading, error, reload } = useReport<InventoryReport>(
    '/reports/inventory',
    { location_id: branch },
  );

  const rows = React.useMemo(() => data?.data ?? [], [data]);
  const pager = useTablePagination(rows, 20);

  const columns = [
    {
      key: 'name',
      label: 'Item',
      render: (row: StockRow) => (
        <span className={row.is_low ? 'text-error font-semibold' : ''}>
          {row.name}
          {row.is_low && <span className="badge badge-error badge-xs ml-2">Low</span>}
        </span>
      ),
    },
    { key: 'unit', label: 'Unit' },
    { key: 'quantity', label: 'Qty on Hand', render: (row: StockRow) => row.quantity.toFixed(2) },
    { key: 'cost_per_unit', label: 'Cost / Unit (৳)', render: (row: StockRow) => formatTaka(row.cost_per_unit) },
    {
      key: 'total_value',
      label: 'Total Value (৳)',
      render: (row: StockRow) => (
        <span className="font-semibold">{formatTaka(row.total_value)}</span>
      ),
    },
  ];

  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  return (
    <>
      <p className="text-sm text-base-content/60 mb-4">
        Current stock on hand — not date-filtered; always reflects today&apos;s levels.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Total Stock Value" value={formatTaka(data.summary.total_value)} sub="Cost × Qty on hand" tone="primary" />
        <StatTile label="Items Tracked" value={String(data.summary.items_count)} />
        <StatTile label="Low Stock Items" value={String(data.summary.low_stock_count)} tone={data.summary.low_stock_count > 0 ? 'warning' : 'success'} sub={data.summary.low_stock_count > 0 ? 'At or below reorder level' : 'All items are well-stocked'} />
      </div>

      <Card title="Stock Value by Item">
        <Table columns={columns} data={pager.pageRows} onEdit={undefined} onDelete={undefined} />
        <ReportPager {...pager} noun="items" onPrev={pager.prev} onNext={pager.next} />
      </Card>
    </>
  );
}
