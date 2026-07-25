'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { useTablePagination } from '@/hooks/useTablePagination';
import { formatTaka, formatTakaCompact, formatQuantity, formatCount } from '@/lib/format';
import { CHART, axisProps, tooltipProps } from '@/components/reporting/chartTheme';
import { ReportPager } from '@/components/reporting/ReportPager';
import {
  ReportLoading, ReportError, ReportEmpty, ReportNeedsDates, MetricNote,
} from '@/components/reporting/ReportStates';

interface ProductRow {
  product_id: number | null;
  name: string;
  quantity: number;
  revenue: number;
  orders: number;
}

export default function ProductReportPage() {
  const { period, branch } = useReportFilters();

  const { data, loading, error, reload } = useReport<{ data: ProductRow[] }>(
    '/reports/products',
    { from: period.from, to: period.to, location_id: branch },
    { skip: period.incomplete },
  );

  const rows = React.useMemo(() => data?.data ?? [], [data]);
  const pager = useTablePagination(rows, 10);

  const columns = [
    { key: 'name', label: 'Product Name' },
    { key: 'quantity', label: 'Quantity Sold', render: (row: ProductRow) => formatQuantity(row.quantity) },
    { key: 'orders', label: 'Orders', render: (row: ProductRow) => formatCount(row.orders) },
    { key: 'revenue', label: 'Item Revenue (৳)', render: (row: ProductRow) => formatTaka(row.revenue) },
  ];

  if (period.incomplete) return <Card><ReportNeedsDates /></Card>;
  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  // Chart reads top-down, so the biggest seller sits at the top of the axis.
  const top10 = [...rows].slice(0, 10).reverse();

  return (
    <>
      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
      </p>

      {top10.length > 0 && (
        <Card title="Top 10 Revenue Generating Products" className="mb-6">
          <MetricNote>
            Item revenue only — quantity × unit price, before tax, delivery and order-level
            discounts.
          </MetricNote>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} margin={{ top: 5, right: 24, bottom: 5, left: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART.grid} />
                <XAxis type="number" tickFormatter={formatTakaCompact} {...axisProps} />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11, fill: CHART.axis }} stroke={CHART.axis} />
                <Tooltip
                  formatter={(value) => [formatTaka(Number(value)), 'Item revenue'] as [string, string]}
                  cursor={{ fill: CHART.cursor }}
                  {...tooltipProps}
                />
                <Bar dataKey="revenue" fill={CHART.revenue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card title="Product Sales Data">
        {rows.length === 0 ? (
          <ReportEmpty
            title="No products sold in this period"
            hint="Try widening the date range or selecting a different branch."
          />
        ) : (
          <>
            <Table columns={columns} data={pager.pageRows} onEdit={undefined} onDelete={undefined} />
            <ReportPager {...pager} noun="products" onPrev={pager.prev} onNext={pager.next} />
          </>
        )}
      </Card>
    </>
  );
}
