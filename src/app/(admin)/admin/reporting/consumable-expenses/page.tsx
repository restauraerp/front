'use client';

import { Card } from '@/components/ui/Card';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { formatTaka } from '@/lib/format';
import {
  ReportLoading, ReportError, ReportNeedsDates, StatTile,
} from '@/components/reporting/ReportStates';
import { Table } from '@/components/ui/Table';

interface ConsumableItem {
  item_name: string;
  unit: string;
  total_qty: number;
  total_cost: number;
}

interface ConsumableReport {
  summary: { total: number };
  by_item: ConsumableItem[];
}

export default function ConsumableExpensesPage() {
  const { period, branch } = useReportFilters();

  const { data, loading, error, reload } = useReport<ConsumableReport>(
    '/reports/consumable-expenses',
    { from: period.from, to: period.to, location_id: branch },
    { skip: period.incomplete },
  );

  if (period.incomplete) return <Card><ReportNeedsDates /></Card>;
  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  const { summary, by_item } = data;

  const columns = [
    { key: 'item_name', label: 'Inventory Item' },
    { key: 'unit', label: 'Unit' },
    { key: 'total_qty', label: 'Qty Consumed', render: (row: ConsumableItem) => row.total_qty.toFixed(3) },
    {
      key: 'total_cost', label: 'Cost (৳)',
      render: (row: ConsumableItem) => <span className="font-semibold text-error">{formatTaka(row.total_cost)}</span>,
    },
  ];

  return (
    <>
      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
        <span className="ml-2 text-xs">— Stock written off via the consumption log (quantity × cost per unit).</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Total Consumable Cost" value={formatTaka(summary.total)} sub="Consumption logs × unit cost" tone="warning" />
        <StatTile label="Items Consumed" value={String(by_item.length)} sub="Distinct inventory items" />
        <StatTile
          label="Highest Cost Item"
          value={by_item[0]?.item_name ?? '—'}
          sub={by_item[0] ? formatTaka(by_item[0].total_cost) : 'No data'}
        />
      </div>

      {by_item.length > 0 ? (
        <Card title="Consumption by Item">
          <Table columns={columns} data={by_item} onEdit={undefined} onDelete={undefined} />
        </Card>
      ) : (
        <Card>
          <div className="text-center py-16 text-base-content/40">
            <p>No consumption logs found for this period.</p>
          </div>
        </Card>
      )}
    </>
  );
}
