'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useReport } from '@/hooks/useReport';
import { useBusinessTime } from '@/hooks/useBranding';
import { fetchApi } from '@/lib/api';
import { resolveRange, RANGE_OPTIONS } from '@/lib/reportRange';
import { formatTaka, formatCount } from '@/lib/format';
import {
  ReportLoading, ReportError, ReportNeedsDates, StatTile, MetricNote,
} from '@/components/reporting/ReportStates';

type Source = 'income' | 'expense' | 'orders' | 'purchase_orders';

interface Line {
  header_id: number | null;
  name: string;
  source: Source;
  entries: number;
  total: number;
  share: number;
}

interface AccountingReport {
  summary: { total_income: number; total_expenses: number; net: number };
  income: Line[];
  expenses: Line[];
}

/** Where a line's money is recorded, so the reader knows which screen it came from. */
const SOURCE_LABEL: Record<Source, string> = {
  income: 'Logged income',
  expense: 'Logged expense',
  orders: 'From orders',
  purchase_orders: 'Purchase orders',
};

function HeaderTable({ lines, tone }: { lines: Line[]; tone: 'success' | 'error' }) {
  if (lines.length === 0) {
    return <p className="text-sm text-base-content/50 py-6 text-center">Nothing recorded in this period.</p>;
  }

  return (
    <div className="space-y-3">
      {lines.map((line) => (
        <div key={`${line.source}-${line.header_id ?? line.name}`}>
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <span className="font-medium">{line.name}</span>
              <span className="ml-2 text-xs text-base-content/50">
                {SOURCE_LABEL[line.source]} · {formatCount(line.entries)} {line.entries === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <div className="text-right whitespace-nowrap">
              <span className="font-semibold">{formatTaka(line.total)}</span>
              <span className="ml-2 text-xs text-base-content/50">{(line.share * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-base-200 mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full ${tone === 'success' ? 'bg-success' : 'bg-error'}`}
              style={{ width: `${Math.max(line.share * 100, 0.5)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Income and expenses by accounting header: where the money comes from and
 * where it goes. Totals match the Profit report for the same period and branch.
 */
export default function AccountingReportPage() {
  const [range, setRange] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [branch, setBranch] = useState('all');
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const bt = useBusinessTime();

  useEffect(() => {
    fetchApi('/locations').then((res) => setLocations(res?.data ?? res ?? [])).catch(() => setLocations([]));
  }, []);

  const period = resolveRange(range, customFrom, customTo, new Date(), {
    timezone: bt.timezone || undefined,
    dayStartMinutes: bt.dayStartMinutes,
    weekStartDay: bt.weekStartDay,
  });

  const { data, loading, error, reload } = useReport<AccountingReport>(
    '/reports/accounting-by-header',
    { from: period.from, to: period.to, location_id: branch },
    { skip: period.incomplete || !bt.loaded },
  );

  const net = data?.summary.net ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Income &amp; Expenses by Header</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select className="select select-bordered select-sm" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="all">All Branches</option>
            {locations.map((l) => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
          </select>
          <select className="select select-bordered select-sm" value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {range === 'custom' && (
            <>
              <input type="date" className="input input-bordered input-sm" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <span className="text-sm text-base-content/50">to</span>
              <input type="date" className="input input-bordered input-sm" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
      </p>

      {period.incomplete ? (
        <Card><ReportNeedsDates /></Card>
      ) : error ? (
        <ReportError message={error} onRetry={reload} />
      ) : loading || !data ? (
        <ReportLoading />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatTile label="Total Income" value={formatTaka(data.summary.total_income)} sub={`${data.income.length} sources`} tone="success" />
            <StatTile label="Total Expenses" value={formatTaka(data.summary.total_expenses)} sub={`${data.expenses.length} headers`} tone="warning" />
            <StatTile label="Net" value={formatTaka(net)} sub={net >= 0 ? 'Income exceeds expenses' : 'Expenses exceed income'} tone={net >= 0 ? 'primary' : 'warning'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card title="Where the money comes from">
              <HeaderTable lines={data.income} tone="success" />
            </Card>
            <Card title="Where the money goes">
              <HeaderTable lines={data.expenses} tone="error" />
            </Card>
          </div>

          <MetricNote>
            Logged income and expenses are grouped by the header chosen when they were entered. Sales and
            delivery charges come from paid orders, and inventory purchases from purchase orders - they
            carry no header, so they are listed as their own lines. Totals match the Profit report for the
            same period and branch.
          </MetricNote>
        </>
      )}
    </div>
  );
}
