'use client';

import React from 'react';
import { Info, Search, Printer, Receipt } from 'lucide-react';
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
  const [printScope, setPrintScope] = React.useState<'all' | 'low'>('all');

  const allRows = React.useMemo(() => data?.data ?? [], [data]);

  // Filtered here rather than on the server: the report already returns every
  // item a restaurant stocks in one response, so a round trip per keystroke
  // would buy nothing and cost the wait.
  const rows = React.useMemo(() => {
    let list = allRows;
    if (printScope === 'low') {
      list = list.filter((row) => row.is_low);
    }
    const term = search.trim().toLowerCase();
    if (!term) return list;

    return list.filter((row) =>
      (row.name ?? '').toLowerCase().includes(term)
      || (row.sku ?? '').toLowerCase().includes(term)
      || (row.unit ?? '').toLowerCase().includes(term));
  }, [allRows, search, printScope]);

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
          tour="inventory-low-stock"
          label="At or Below Reorder Level"
          value={formatCount(data.summary.low_stock_count)}
          sub={data.summary.low_stock_count > 0 ? 'Needs restocking' : 'All items above reorder level'}
          tone={data.summary.low_stock_count > 0 ? 'warning' : 'success'}
        />
        <StatTile tour="inventory-stock-value" label="Total Stock Value" value={formatTaka(data.summary.total_value)} tone="primary" />
      </div>

      <Card tour="inventory-table" title="Inventory Stock Report (Low Stock First)">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <div className="relative flex items-center w-full sm:w-64">
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
            <select
              value={printScope}
              onChange={(e) => setPrintScope(e.target.value as 'all' | 'low')}
              className="select select-bordered select-sm w-full sm:w-auto"
              aria-label="Filter items scope"
            >
              <option value="all">All Products</option>
              <option value="low">Only Low Stock Products</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                const query = new URLSearchParams();
                if (branch) query.set('branch', branch);
                query.set('mode', 'a4');
                if (printScope === 'low') query.set('low_only', 'true');
                window.open(`/inventory-print?${query.toString()}`, '_blank');
              }}
              className="btn btn-outline btn-sm gap-1.5 flex-1 md:flex-initial"
            >
              <Printer size={15} />
              <span>Print A4</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const query = new URLSearchParams();
                if (branch) query.set('branch', branch);
                query.set('mode', 'thermal');
                if (printScope === 'low') query.set('low_only', 'true');
                window.open(`/inventory-print?${query.toString()}`, '_blank');
              }}
              className="btn btn-outline btn-sm gap-1.5 flex-1 md:flex-initial"
            >
              <Receipt size={15} />
              <span>POS Thermal</span>
            </button>
          </div>
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
