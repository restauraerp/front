'use client';

import { Card } from '@/components/ui/Card';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { formatTaka } from '@/lib/format';
import {
  ReportLoading, ReportError, ReportNeedsDates, StatTile,
} from '@/components/reporting/ReportStates';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CHART, axisProps, tooltipProps } from '@/components/reporting/chartTheme';

interface NonInventoryReport {
  summary: { total: number };
  by_category: { category: string; total: number }[];
}

export default function NonInventoryExpensesPage() {
  const { period, branch } = useReportFilters();

  const { data, loading, error, reload } = useReport<NonInventoryReport>(
    '/reports/non-inventory-expenses',
    { from: period.from, to: period.to, location_id: branch },
    { skip: period.incomplete },
  );

  if (period.incomplete) return <Card><ReportNeedsDates /></Card>;
  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  const { summary, by_category } = data;

  return (
    <>
      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
        <span className="ml-2 text-xs">— Rent, salaries, utilities and other non-inventory expenses.</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Total Non-Inventory Expenses" value={formatTaka(summary.total)} sub="Manual expense logs only" tone="warning" />
        <StatTile label="Categories" value={String(by_category.length)} sub="Distinct expense categories" />
        <StatTile
          label="Largest Category"
          value={by_category[0]?.category ?? '—'}
          sub={by_category[0] ? formatTaka(by_category[0].total) : 'No data'}
        />
      </div>

      {by_category.length > 0 && (
        <Card title="Expenses by Category" className="mb-6">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={by_category}
                layout="vertical"
                margin={{ top: 5, right: 30, bottom: 5, left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART.grid} />
                <XAxis type="number" tickFormatter={v => formatTaka(v)} {...axisProps} />
                <YAxis type="category" dataKey="category" width={120} {...axisProps} />
                <Tooltip
                  formatter={(value) => [formatTaka(Number(value)), 'Amount'] as [string, string]}
                  cursor={{ fill: CHART.cursor }}
                  {...tooltipProps}
                />
                <Bar dataKey="total" fill={CHART.orders} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {by_category.length > 0 && (
        <Card title="Category Breakdown">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="text-right">Amount (৳)</th>
                  <th className="text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {by_category.map(row => (
                  <tr key={row.category}>
                    <td className="font-medium">{row.category}</td>
                    <td className="text-right font-semibold text-error">{formatTaka(row.total)}</td>
                    <td className="text-right text-base-content/60">
                      {summary.total > 0 ? `${((row.total / summary.total) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {by_category.length === 0 && (
        <Card>
          <div className="text-center py-16 text-base-content/40">
            <p>No non-inventory expenses recorded in this period.</p>
          </div>
        </Card>
      )}
    </>
  );
}
