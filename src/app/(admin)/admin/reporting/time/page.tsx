'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { formatTaka, formatTakaCompact, formatCount } from '@/lib/format';
import { CHART, axisProps, tooltipProps } from '@/components/reporting/chartTheme';
import {
  ReportLoading, ReportError, ReportEmpty, ReportNeedsDates, StatTile, MetricNote,
} from '@/components/reporting/ReportStates';

interface HourRow {
  hour: number;
  label: string;
  orders: number;
  revenue: number;
}

export default function TimeReportPage() {
  const { period, branch } = useReportFilters();

  const { data, loading, error, reload } = useReport<{ data: HourRow[] }>(
    '/reports/hourly',
    { from: period.from, to: period.to, location_id: branch },
    { skip: period.incomplete },
  );

  const columns = [
    { key: 'label', label: 'Time of Day' },
    { key: 'orders', label: 'Orders', render: (row: HourRow) => formatCount(row.orders) },
    { key: 'revenue', label: 'Revenue (৳)', render: (row: HourRow) => formatTaka(row.revenue) },
  ];

  if (period.incomplete) return <Card><ReportNeedsDates /></Card>;
  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  const rows = data.data;
  const totalOrders = rows.reduce((sum, r) => sum + r.orders, 0);
  const busiest = rows.reduce<HourRow | null>(
    (best, r) => (best === null || r.orders > best.orders ? r : best),
    null,
  );
  const topEarning = rows.reduce<HourRow | null>(
    (best, r) => (best === null || r.revenue > best.revenue ? r : best),
    null,
  );

  if (totalOrders === 0) {
    return (
      <>
        <p className="text-sm text-base-content/60 mb-4">
          Showing <span className="font-semibold text-base-content">{period.label}</span>
        </p>
        <Card><ReportEmpty /></Card>
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile
          label="Busiest Hour"
          value={busiest ? busiest.label : '—'}
          sub={busiest ? `${formatCount(busiest.orders)} orders` : undefined}
          tone="primary"
        />
        <StatTile
          label="Highest Earning Hour"
          value={topEarning ? topEarning.label : '—'}
          sub={topEarning ? formatTaka(topEarning.revenue) : undefined}
          tone="success"
        />
        <StatTile label="Orders in Period" value={formatCount(totalOrders)} tone="info" />
      </div>

      <Card title="Sales by Hour of Day" className="mb-6">
        <MetricNote>
          Every order in the selected period, grouped by the hour of day it was placed
          (restaurant local time).
        </MetricNote>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="label" interval={1} {...axisProps} />
              <YAxis yAxisId="left" tickFormatter={formatTakaCompact} {...axisProps} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} {...axisProps} />
              <Tooltip
                formatter={(value, name) =>
                  [
                    name === 'Revenue' ? formatTaka(Number(value)) : formatCount(Number(value)),
                    String(name),
                  ] as [string, string]
                }
                {...tooltipProps}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={CHART.revenue}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke={CHART.orders}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Hourly Sales Distribution">
        <Table columns={columns} data={rows} onEdit={undefined} onDelete={undefined} />
      </Card>
    </>
  );
}
