'use client';

import { Card } from '@/components/ui/Card';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { formatTaka } from '@/lib/format';
import {
  ReportLoading, ReportError, ReportNeedsDates, StatTile, MetricNote,
} from '@/components/reporting/ReportStates';

interface ProfitReport {
  summary: {
    revenue: number;
    other_income: number;
    total_income: number;
    operational_expenses: number;
    purchase_expenses: number;
    total_expenses: number;
    net_profit: number;
    margin_pct: number;
  };
}

export default function ProfitReportPage() {
  const { period, branch } = useReportFilters();

  const { data, loading, error, reload } = useReport<ProfitReport>(
    '/reports/profit',
    { from: period.from, to: period.to, location_id: branch },
    { skip: period.incomplete },
  );

  if (period.incomplete) return <Card><ReportNeedsDates /></Card>;
  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  const { summary } = data;
  const isProfit = summary.net_profit >= 0;

  return (
    <>
      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile
          label="Total Income"
          value={formatTaka(summary.total_income)}
          sub={summary.other_income > 0
            ? `${formatTaka(summary.revenue)} orders + ${formatTaka(summary.other_income)} logged`
            : 'Paid orders only'}
          tone="success"
        />
        <StatTile
          label="Total Expenses"
          value={formatTaka(summary.total_expenses)}
          sub="Operational + purchases"
          tone="warning"
        />
        <StatTile
          label="Net Profit"
          value={formatTaka(summary.net_profit)}
          sub={isProfit ? 'Profitable period' : 'Operating at a loss'}
          tone={isProfit ? 'primary' : 'warning'}
        />
        <StatTile
          label="Profit Margin"
          value={`${summary.margin_pct}%`}
          sub={summary.total_income > 0 ? 'Net ÷ Total Income' : 'No income this period'}
        />
      </div>

      <Card title="Breakdown">
        <MetricNote>
          Revenue counts only paid orders; income logged under Accounting &rarr; Income is
          added on top. Expenses include manually-logged operational expenses and purchase
          order totals. Tax collected and discounts given are included in the revenue figure.
        </MetricNote>

        <div className="space-y-3 mt-4">
          {[
            { label: 'Collected Revenue', value: summary.revenue, positive: true },
            { label: 'Other Income', value: summary.other_income, positive: true },
            { label: 'Operational Expenses', value: -summary.operational_expenses, positive: summary.operational_expenses === 0 },
            { label: 'Purchase Expenses', value: -summary.purchase_expenses, positive: summary.purchase_expenses === 0 },
          ].map(({ label, value, positive }) => (
            <div key={label} className="flex justify-between items-center px-4 py-3 bg-base-200/50 rounded-xl">
              <span className="font-medium">{label}</span>
              <span className={`font-bold text-lg ${positive ? 'text-success' : 'text-error'}`}>
                {/* Sign before the symbol, not after it - formatTaka on a
                    negative renders "৳-1,200" while the positive rows render
                    "+৳1,200", so the column disagreed with itself. */}
                {value >= 0 ? '+' : '−'}{formatTaka(Math.abs(value))}
              </span>
            </div>
          ))}
          <div className={`flex justify-between items-center px-4 py-4 rounded-xl border-2 ${isProfit ? 'border-success bg-success/5' : 'border-error bg-error/5'}`}>
            <span className="font-bold text-lg">Net Profit</span>
            <span className={`font-extrabold text-2xl ${isProfit ? 'text-success' : 'text-error'}`}>
              {isProfit ? '+' : ''}{formatTaka(summary.net_profit)}
            </span>
          </div>
        </div>
      </Card>
    </>
  );
}
