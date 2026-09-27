'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { useReport } from '@/hooks/useReport';
import { useBusinessTime } from '@/hooks/useBranding';
import { resolveRange, RANGE_OPTIONS, formatBucket, ReportBucket } from '@/lib/reportRange';
import { formatTaka, formatCount } from '@/lib/format';
import {
  ReportLoading, ReportError, ReportNeedsDates, StatTile, MetricNote,
} from '@/components/reporting/ReportStates';

interface DeliveryChargesReport {
  bucket: ReportBucket;
  summary: {
    orders_count: number;
    total: number;
    collected: number;
    outstanding: number;
    avg_charge: number;
  };
  series: { bucket: string; orders: number; total: number }[];
}

/**
 * Delivery charges, kept apart from sales revenue.
 *
 * Delivery is money the restaurant collects on the customer's behalf and
 * usually passes on to a rider or courier. Seeing it on its own - rather than
 * folded into sales - is what lets the restaurant disburse it as an expense and
 * read its real profit. Part of the delivery module, so it lives here rather
 * than under general Reporting.
 */
export default function DeliveryChargesPage() {
  const [range, setRange] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const bt = useBusinessTime();

  const period = resolveRange(range, customFrom, customTo, new Date(), {
    timezone: bt.timezone || undefined,
    dayStartMinutes: bt.dayStartMinutes,
    weekStartDay: bt.weekStartDay,
  });

  const { data, loading, error, reload } = useReport<DeliveryChargesReport>(
    '/reports/delivery-charges',
    { from: period.from, to: period.to, bucket: period.bucket, location_id: 'all' },
    { skip: period.incomplete || !bt.loaded },
  );

  const columns = [
    { key: 'bucket', label: 'Period', render: (row: DeliveryChargesReport['series'][number]) => formatBucket(row.bucket, data?.bucket ?? 'day') },
    { key: 'orders', label: 'Orders', render: (row: DeliveryChargesReport['series'][number]) => formatCount(row.orders) },
    { key: 'total', label: 'Delivery Charges', render: (row: DeliveryChargesReport['series'][number]) => formatTaka(row.total) },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Delivery Charges</h1>
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatTile label="Delivery Charges" value={formatTaka(data.summary.total)} sub="Charged on orders in this period" tone="primary" />
            <StatTile label="Collected" value={formatTaka(data.summary.collected)} sub="On paid orders — available to disburse" tone="success" />
            <StatTile
              label="Outstanding"
              value={formatTaka(data.summary.outstanding)}
              sub={data.summary.outstanding > 0 ? 'On orders not yet paid' : 'Nothing outstanding'}
              tone="warning"
            />
            <StatTile
              label="Delivery Orders"
              value={formatCount(data.summary.orders_count)}
              sub={data.summary.orders_count > 0 ? `Avg ${formatTaka(data.summary.avg_charge)} per order` : 'No delivery charges'}
              tone="info"
            />
          </div>

          <Card title="By Period">
            <MetricNote>
              Delivery charges are reported separately from sales revenue so they can be paid out to
              riders or couriers as an expense. The Sales and Profit reports show the same split.
            </MetricNote>
            <Table columns={columns} data={data.series} />
          </Card>
        </>
      )}
    </div>
  );
}
