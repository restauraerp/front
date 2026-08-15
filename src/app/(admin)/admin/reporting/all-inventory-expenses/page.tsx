'use client';

import { Card } from '@/components/ui/Card';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { formatTaka } from '@/lib/format';
import {
  ReportLoading, ReportError, ReportNeedsDates, StatTile, MetricNote,
} from '@/components/reporting/ReportStates';

interface AllInventoryReport {
  summary: {
    purchase_expenses: number;
    consumable_expenses: number;
    total: number;
  };
}

export default function AllInventoryExpensesPage() {
  const { period, branch } = useReportFilters();

  const { data, loading, error, reload } = useReport<AllInventoryReport>(
    '/reports/all-inventory-expenses',
    { from: period.from, to: period.to, location_id: branch },
    { skip: period.incomplete },
  );

  if (period.incomplete) return <Card><ReportNeedsDates /></Card>;
  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  const { summary } = data;

  return (
    <>
      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile
          label="Purchase Orders (Countable)"
          value={formatTaka(summary.purchase_expenses)}
          sub="Inventory received via purchase orders"
          tone="warning"
        />
        <StatTile
          label="Consumption Logs (Consumable)"
          value={formatTaka(summary.consumable_expenses)}
          sub="Stock written off manually"
        />
        <StatTile
          label="Total Inventory Expense"
          value={formatTaka(summary.total)}
          sub="Purchase + Consumable combined"
          tone="primary"
        />
      </div>

      <Card title="Breakdown">
        <MetricNote>
          Countable expenses come from received purchase orders. Consumable expenses are
          calculated from consumption log entries using the unit cost at the time of logging.
        </MetricNote>

        <div className="space-y-3 mt-4">
          {[
            { label: 'Purchase Orders (Countable)', value: summary.purchase_expenses },
            { label: 'Consumption Logs (Consumable)', value: summary.consumable_expenses },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center px-4 py-3 bg-base-200/50 rounded-xl">
              <span className="font-medium">{label}</span>
              <span className="font-bold text-lg text-error">−{formatTaka(value)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-4 py-4 rounded-xl border-2 border-warning bg-warning/5">
            <span className="font-bold text-lg">Total Inventory Cost</span>
            <span className="font-extrabold text-2xl text-warning">−{formatTaka(summary.total)}</span>
          </div>
        </div>
      </Card>
    </>
  );
}
