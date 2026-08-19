'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { useTablePagination } from '@/hooks/useTablePagination';
import { formatTaka, formatTakaCompact, formatCount } from '@/lib/format';
import { CHART, axisProps, tooltipProps } from '@/components/reporting/chartTheme';
import { ReportPager } from '@/components/reporting/ReportPager';
import {
  ReportLoading, ReportError, ReportEmpty, ReportNeedsDates, MetricNote,
} from '@/components/reporting/ReportStates';

interface StaffRow {
  user_id: number | null;
  name: string;
  orders_count: number;
  revenue: number;
  item_revenue: number;
  discount_total: number;
  collected: number;
  avg_order_value: number;
  share: number;
}

interface StaffReport {
  summary: {
    employees: number;
    total_revenue: number;
    attributed_revenue: number;
    unattributed_orders: number;
  };
  employees: StaffRow[];
}

export default function StaffReportPage() {
  const { period, branch } = useReportFilters();

  const { data, loading, error, reload } = useReport<StaffReport>(
    '/reports/staff',
    { from: period.from, to: period.to, location_id: branch },
    { skip: period.incomplete },
  );

  const rows = React.useMemo(() => data?.employees ?? [], [data]);
  const pager = useTablePagination(rows, 10);

  const columns = [
    { key: 'name', label: 'Employee' },
    { key: 'orders_count', label: 'Orders', render: (row: StaffRow) => formatCount(row.orders_count) },
    { key: 'revenue', label: 'Revenue (৳)', render: (row: StaffRow) => formatTaka(row.revenue) },
    { key: 'avg_order_value', label: 'Avg Order (৳)', render: (row: StaffRow) => formatTaka(row.avg_order_value) },
    { key: 'collected', label: 'Collected (৳)', render: (row: StaffRow) => formatTaka(row.collected) },
    { key: 'share', label: 'Share', render: (row: StaffRow) => `${(row.share * 100).toFixed(1)}%` },
  ];

  if (period.incomplete) return <Card><ReportNeedsDates /></Card>;
  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  // Named employees only, biggest at the top of the axis. The unattributed row
  // is deliberately kept out of the chart - it is usually the largest bar by
  // far and would flatten everyone else into nothing.
  const credited = rows.filter((row) => row.user_id !== null);
  const top10 = [...credited].slice(0, 10).reverse();

  const unattributed = data.summary.unattributed_orders;

  return (
    <>
      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
      </p>

      {unattributed > 0 && (
        <div role="status" className="alert alert-warning mb-6 text-sm">
          <span>
            {formatCount(unattributed)} order{unattributed === 1 ? '' : 's'} in this period
            {' '}were not credited to anyone, so they are excluded from the ranking below.
            Pick an employee at checkout to have a sale counted here.
          </span>
        </div>
      )}

      {top10.length > 0 && (
        <Card title="Revenue by employee" className="mb-6">
          <MetricNote>
            Order totals, including tax and delivery — this reconciles with gross revenue on
            the Sales report, not with item revenue on Products.
          </MetricNote>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} margin={{ top: 5, right: 24, bottom: 5, left: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART.grid} />
                <XAxis type="number" tickFormatter={formatTakaCompact} {...axisProps} />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11, fill: CHART.axis }} stroke={CHART.axis} />
                <Tooltip
                  formatter={(value) => [formatTaka(Number(value)), 'Revenue'] as [string, string]}
                  cursor={{ fill: CHART.cursor }}
                  {...tooltipProps}
                />
                <Bar dataKey="revenue" fill={CHART.revenue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card title="Employee performance">
        {credited.length === 0 ? (
          <ReportEmpty
            title="No sales credited to an employee yet"
            hint="Choose who served the customer at checkout, and their sales will appear here."
          />
        ) : (
          <>
            <Table columns={columns} data={pager.pageRows} onEdit={undefined} onDelete={undefined} />
            <ReportPager {...pager} noun="employees" onPrev={pager.prev} onNext={pager.next} />
          </>
        )}
      </Card>
    </>
  );
}
