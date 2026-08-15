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

interface ExpenseReport {
  summary: {
    operational_expenses: number;
    purchase_expenses: number;
    total_expenses: number;
  };
  by_category: { category: string; total: number }[];
}

export default function ExpensesReportPage() {
  const { period, branch } = useReportFilters();

  const { data, loading, error, reload } = useReport<ExpenseReport>(
    '/reports/expenses',
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
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Operational Expenses" value={formatTaka(summary.operational_expenses)} sub="Logged manual expenses" tone="warning" />
        <StatTile label="Purchase Expenses" value={formatTaka(summary.purchase_expenses)} sub="Inventory purchase orders" />
        <StatTile label="Total Expenses" value={formatTaka(summary.total_expenses)} sub="All outflows combined" tone="primary" />
      </div>

      {by_category.length > 0 && (
        <Card title="Expenses by Category" className="mb-6">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={by_category}
                layout="vertical"
                margin={{ top: 5, right: 30, bottom: 5, left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART.grid} />
                <XAxis type="number" tickFormatter={v => formatTaka(v)} {...axisProps} />
                <YAxis type="category" dataKey="category" width={100} {...axisProps} />
                <Tooltip
                  formatter={(value) => [formatTaka(Number(value)), 'Amount'] as [string, string]}
                  cursor={{ fill: CHART.cursor }}
                  {...tooltipProps}
                />
                <Bar dataKey="total" fill={CHART.revenue} radius={[0, 4, 4, 0]} />
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
                  <th className="text-right">% of Operational</th>
                </tr>
              </thead>
              <tbody>
                {by_category.map(row => (
                  <tr key={row.category}>
                    <td className="font-medium">{row.category}</td>
                    <td className="text-right font-semibold text-error">{formatTaka(row.total)}</td>
                    <td className="text-right text-base-content/60">
                      {summary.operational_expenses > 0
                        ? `${((row.total / summary.operational_expenses) * 100).toFixed(1)}%`
                        : '—'}
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
            <p>No operational expenses recorded in this period.</p>
          </div>
        </Card>
      )}
    </>
  );
}
