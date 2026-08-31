'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { useTablePagination } from '@/hooks/useTablePagination';
import { formatBucket } from '@/lib/reportRange';
import { formatTaka, formatTakaCompact, formatCount } from '@/lib/format';
import { CHART, axisProps, tooltipProps } from '@/components/reporting/chartTheme';
import { ReportPager } from '@/components/reporting/ReportPager';
import {
  ReportLoading, ReportError, ReportEmpty, ReportNeedsDates, StatTile, MetricNote,
} from '@/components/reporting/ReportStates';

interface SalesSeriesPoint {
  bucket: string;
  orders: number;
  revenue: number;
  item_revenue: number;
  collected: number;
}

interface SalesReport {
  bucket: 'hour' | 'day' | 'month';
  summary: {
    orders_count: number;
    gross_revenue: number;
    item_revenue: number;
    tax_total: number;
    discount_total: number;
    delivery_total: number;
    collected_revenue: number;
    outstanding_revenue: number;
    unpaid_orders: number;
    avg_order_value: number;
  };
  series: SalesSeriesPoint[];
}

export default function SalesReportPage() {
  const { period, branch } = useReportFilters();
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const { data, loading, error, reload } = useReport<SalesReport>(
    '/reports/sales',
    { from: period.from, to: period.to, bucket: period.bucket, location_id: branch },
    { skip: period.incomplete },
  );

  // Newest first in the table, oldest first in the chart.
  const tableRows = React.useMemo(() => (data ? [...data.series].reverse() : []), [data]);
  const pager = useTablePagination(tableRows, 10);

  const granularity = data?.bucket ?? 'day';
  const bucketLabel = granularity === 'hour' ? 'Hour' : granularity === 'month' ? 'Month' : 'Date';

  const columns = [
    {
      key: 'bucket',
      label: bucketLabel,
      render: (row: SalesSeriesPoint) => formatBucket(row.bucket, granularity),
    },
    { key: 'orders', label: 'Orders', render: (row: SalesSeriesPoint) => formatCount(row.orders) },
    { key: 'revenue', label: 'Revenue (৳)', render: (row: SalesSeriesPoint) => formatTaka(row.revenue) },
    { key: 'collected', label: 'Collected (৳)', render: (row: SalesSeriesPoint) => formatTaka(row.collected) },
  ];

  if (period.incomplete) return <Card><ReportNeedsDates /></Card>;
  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  const { summary, series } = data;

  return (
    <>
      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile
          tour="sales-total-revenue"
          label="Total Revenue"
          value={formatTaka(summary.gross_revenue)}
          sub="All orders, incl. tax & delivery"
          tone="primary"
        />
        <StatTile
          tour="sales-collected"
          label="Collected"
          value={formatTaka(summary.collected_revenue)}
          sub={
            summary.outstanding_revenue > 0
              ? `${formatTaka(summary.outstanding_revenue)} outstanding over ${formatCount(summary.unpaid_orders)} unpaid order${summary.unpaid_orders === 1 ? '' : 's'}`
              : 'Every order in this period is paid'
          }
          tone="success"
        />
        <StatTile label="Total Orders" value={formatCount(summary.orders_count)} tone="info" />
        <StatTile
          label="Avg Order Value"
          value={formatTaka(summary.avg_order_value)}
          sub={summary.orders_count === 0 ? 'No orders in this period' : undefined}
        />
      </div>

      <Card title="Revenue Breakdown" className="mb-6">
        <MetricNote>
          Total Revenue is the sum of order totals: item revenue plus tax plus delivery, less
          discounts. The Product Performance tab counts line items only, so it reports the smaller
          item-revenue figure.
        </MetricNote>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Item revenue', value: summary.item_revenue },
            { label: 'Tax', value: summary.tax_total },
            { label: 'Delivery', value: summary.delivery_total },
            { label: 'Discounts', value: -summary.discount_total },
          ].map(({ label, value }) => (
            <div key={label} className="bg-base-200/60 rounded-xl px-4 py-3">
              <div className="text-xs text-base-content/50">{label}</div>
              <div className="text-lg font-semibold mt-0.5">{formatTaka(value)}</div>
            </div>
          ))}
        </div>
      </Card>

      {series.length > 0 && (
        <Card tour="sales-trend" title="Sales Trend" className="mb-6">
          <div className="flex justify-end mb-2">
            <div className="join">
              <button
                className={`join-item btn btn-xs ${chartType === 'bar' ? 'btn-primary' : 'btn-outline border-base-300'}`}
                onClick={() => setChartType('bar')}
              >
                Bar
              </button>
              <button
                className={`join-item btn btn-xs ${chartType === 'line' ? 'btn-primary' : 'btn-outline border-base-300'}`}
                onClick={() => setChartType('line')}
              >
                Line
              </button>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={series} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="bucket" tickFormatter={(v) => formatBucket(v, granularity)} {...axisProps} />
                  <YAxis tickFormatter={formatTakaCompact} {...axisProps} />
                  <Tooltip
                    formatter={(value) => [formatTaka(Number(value)), 'Revenue'] as [string, string]}
                    labelFormatter={(label) => formatBucket(String(label), granularity)}
                    cursor={{ fill: CHART.cursor }}
                    {...tooltipProps}
                  />
                  <Bar dataKey="revenue" fill={CHART.revenue} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={series} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="bucket" tickFormatter={(v) => formatBucket(v, granularity)} {...axisProps} />
                  <YAxis tickFormatter={formatTakaCompact} {...axisProps} />
                  <Tooltip
                    formatter={(value) => [formatTaka(Number(value)), 'Revenue'] as [string, string]}
                    labelFormatter={(label) => formatBucket(String(label), granularity)}
                    {...tooltipProps}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART.revenue}
                    strokeWidth={3}
                    dot={{ r: 3, fill: CHART.revenue }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card title="Sales Data Table">
        {tableRows.length === 0 ? (
          <ReportEmpty />
        ) : (
          <>
            <Table columns={columns} data={pager.pageRows} onEdit={undefined} onDelete={undefined} />
            <ReportPager {...pager} noun="periods" onPrev={pager.prev} onNext={pager.next} />
          </>
        )}
      </Card>
    </>
  );
}
