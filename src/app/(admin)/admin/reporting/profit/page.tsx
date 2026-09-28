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
    sales_revenue: number;
    delivery_charges: number;
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
          tour="profit-total-income"
          label="Total Income"
          value={formatTaka(summary.total_income)}
          sub={`Sales ${formatTaka(summary.sales_revenue)} + delivery ${formatTaka(summary.delivery_charges)}`
            + (summary.other_income > 0 ? ` + ${formatTaka(summary.other_income)} logged` : '')}
          tone="success"
        />
        <StatTile
          tour="profit-total-expenses"
          label="Total Expenses"
          value={formatTaka(summary.total_expenses)}
          sub="Operational + purchases"
          tone="warning"
        />
        <StatTile
          tour="profit-net"
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

      <Card tour="profit-breakdown" title="Breakdown">
        <MetricNote>
          Sales revenue counts only paid orders, with tax and discounts included and delivery
          charges taken out. Delivery charges collected are listed on their own so they can be
          paid out to riders or couriers - log that payout under Accounting &rarr; Expenses and it
          comes off net profit here. Income logged under Accounting &rarr; Income is added on top.
          Expenses include manually-logged operational expenses and purchase order totals.
        </MetricNote>

        <div className="space-y-3 mt-4">
          {[
            { label: 'Sales Revenue', value: summary.sales_revenue, positive: true },
            { label: 'Delivery Charges', value: summary.delivery_charges, positive: true },
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
