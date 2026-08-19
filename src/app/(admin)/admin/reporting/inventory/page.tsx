'use client';

import React from 'react';
import { Info, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { useTablePagination } from '@/hooks/useTablePagination';
import { formatTaka, formatQuantity, formatCount } from '@/lib/format';
import { ReportPager } from '@/components/reporting/ReportPager';
import { ReportLoading, ReportError, ReportEmpty, StatTile } from '@/components/reporting/ReportStates';

interface InventoryRow {
  id: number;
  name: string;
  sku: string | null;
  unit: string | null;
  cost_per_unit: number;
  min_stock_level: number;
  quantity: number;
  total_value: number;
  is_low: boolean;
  image_url: string | null;
}

interface InventoryReport {
  scoped_to_location: boolean;
  summary: { items_count: number; low_stock_count: number; total_value: number };
  data: InventoryRow[];
}

export default function InventoryReportPage() {
  const { branch } = useReportFilters();

  // Stock is a point-in-time snapshot, so this report takes the branch filter
  // but deliberately ignores the date range.
  const { data, loading, error, reload } = useReport<InventoryReport>(
    '/reports/inventory',
    { location_id: branch },
  );

  const [search, setSearch] = React.useState('');

  const allRows = React.useMemo(() => data?.data ?? [], [data]);

  // Filtered here rather than on the server: the report already returns every
  // item a restaurant stocks in one response, so a round trip per keystroke
  // would buy nothing and cost the wait.
  const rows = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allRows;

    return allRows.filter((row) =>
      (row.name ?? '').toLowerCase().includes(term)
      || (row.sku ?? '').toLowerCase().includes(term)
      || (row.unit ?? '').toLowerCase().includes(term));
  }, [allRows, search]);

  const pager = useTablePagination(rows, 10);

  const columns = [
    {
      key: 'image_url',
      label: '',
      render: (row: InventoryRow) => (
        <div className="w-9 h-9 rounded overflow-hidden bg-base-200 flex items-center justify-center shrink-0">
          {row.image_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={`/storage/${row.image_url}`} alt="" className="w-full h-full object-cover" />
            : <span className="text-[10px] font-bold text-base-content/30">{(row.name || '?').substring(0, 2).toUpperCase()}</span>}
        </div>
      ),
    },
    { key: 'name', label: 'Item Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'unit', label: 'Unit' },
    {
      key: 'cost_per_unit',
      label: 'Cost / Unit',
      render: (row: InventoryRow) => formatTaka(row.cost_per_unit),
    },
    {
      key: 'quantity',
      label: 'Stock On Hand',
      render: (row: InventoryRow) => (
        <span className={row.is_low ? 'text-error font-bold' : ''}>
          {formatQuantity(row.quantity)}
          {row.is_low && <span className="badge badge-error badge-sm text-error-content ml-2">Low</span>}
        </span>
      ),
    },
    {
      key: 'min_stock_level',
      label: 'Reorder At',
      render: (row: InventoryRow) => formatQuantity(row.min_stock_level),
    },
    {
      key: 'total_value',
      label: 'Stock Value',
      render: (row: InventoryRow) => formatTaka(row.total_value),
    },
  ];

  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  return (
    <>
      <div className="flex items-start gap-2 text-sm text-base-content/60 mb-4">
        <Info size={16} className="shrink-0 mt-0.5" />
        <p>
          Current stock on hand{data.scoped_to_location ? ' at the selected branch' : ' across all branches'}.
          This is a live snapshot, so the date filter does not apply here.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Items Tracked" value={formatCount(data.summary.items_count)} tone="info" />
        <StatTile
          label="At or Below Reorder Level"
          value={formatCount(data.summary.low_stock_count)}
          sub={data.summary.low_stock_count > 0 ? 'Needs restocking' : 'All items above reorder level'}
          tone={data.summary.low_stock_count > 0 ? 'warning' : 'success'}
        />
        <StatTile label="Total Stock Value" value={formatTaka(data.summary.total_value)} tone="primary" />
      </div>

      <Card title="Inventory Stock Report (Low Stock First)">
        <div className="relative flex items-center w-full sm:w-72 mb-4">
          <Search size={16} className="absolute left-3 text-base-content/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, SKU or unit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered input-sm w-full pl-9"
            aria-label="Search inventory"
          />
        </div>

        {allRows.length > 0 && rows.length === 0 ? (
          <ReportEmpty
            title="Nothing matches that search"
            hint="Try part of an item name, its SKU, or the unit it is counted in."
          />
        ) : rows.length === 0 ? (
          <ReportEmpty
            title="No inventory items"
            hint="Add items under Inventory to see stock levels here."
          />
        ) : (
          <>
            <Table columns={columns} data={pager.pageRows} onEdit={undefined} onDelete={undefined} />
            <ReportPager {...pager} noun="items" onPrev={pager.prev} onNext={pager.next} />
            {search.trim() !== '' && (
              <p className="text-sm text-base-content/60 mt-2">
                Showing {rows.length} of {allRows.length} items
              </p>
            )}
          </>
        )}
      </Card>
    </>
  );
}
