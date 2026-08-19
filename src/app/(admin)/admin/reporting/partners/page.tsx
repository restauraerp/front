'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { useReport, useReportFilters } from '@/hooks/useReport';
import { formatTaka } from '@/lib/format';
import { ReportLoading, ReportError, ReportEmpty, ReportNeedsDates, MetricNote } from '@/components/reporting/ReportStates';

interface PartnerRow {
  partner_id: number;
  name: string;
  commission_rate: number;
  orders_count: number;
  gross: number;
  commission: number;
  net: number;
  earned_to_date: number;
  paid_to_date: number;
  outstanding: number;
}

interface PartnerReport {
  summary: { partners: number; orders_count: number; gross: number; commission: number; net: number; outstanding: number };
  partners: PartnerRow[];
}

export default function PartnerReportPage() {
  const { period, branch } = useReportFilters();

  const { data, loading, error, reload } = useReport<PartnerReport>(
    '/reports/partners',
    { from: period.from, to: period.to, location_id: branch },
    { skip: period.incomplete },
  );

  if (period.incomplete) return <Card><ReportNeedsDates /></Card>;
  if (error) return <ReportError message={error} onRetry={reload} />;
  if (loading || !data) return <ReportLoading />;

  const rows = data.partners;

  const columns = [
    { key: 'name', label: 'Partner' },
    { key: 'commission_rate', label: 'Their cut', render: (r: PartnerRow) => `${r.commission_rate.toFixed(2)}%` },
    { key: 'orders_count', label: 'Orders' },
    { key: 'gross', label: 'Billed (৳)', render: (r: PartnerRow) => formatTaka(r.gross) },
    { key: 'commission', label: 'They keep (৳)', render: (r: PartnerRow) => formatTaka(r.commission) },
    { key: 'net', label: 'You earned (৳)', render: (r: PartnerRow) => formatTaka(r.net) },
    {
      key: 'outstanding',
      label: 'Owed to you (৳)',
      render: (r: PartnerRow) => (
        <span className={r.outstanding > 0 ? 'font-semibold text-warning' : ''}>{formatTaka(r.outstanding)}</span>
      ),
    },
  ];

  return (
    <>
      <p className="text-sm text-base-content/60 mb-4">
        Showing <span className="font-semibold text-base-content">{period.label}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card title="Billed through partners">
          <div className="text-2xl font-bold">{formatTaka(data.summary.gross)}</div>
          <p className="text-xs text-base-content/60 mt-1">What the diners were charged</p>
        </Card>
        <Card title="You earned">
          <div className="text-2xl font-bold text-primary">{formatTaka(data.summary.net)}</div>
          <p className="text-xs text-base-content/60 mt-1">After {formatTaka(data.summary.commission)} of commission</p>
        </Card>
        <Card title="Still owed to you">
          <div className="text-2xl font-bold text-warning">{formatTaka(data.summary.outstanding)}</div>
          <p className="text-xs text-base-content/60 mt-1">All time, not just this period</p>
        </Card>
      </div>

      <Card title="By partner">
        <MetricNote>
          Billed, commission and earned cover the selected period. <strong>Owed to you</strong> is a
          balance, so it counts everything ever earned less everything ever paid over — a partner is
          not square just because their unpaid invoices fall outside these dates.
        </MetricNote>

        {rows.length === 0 ? (
          <ReportEmpty
            title="No partners yet"
            hint="Add a delivery app or other channel under Partners, then pick it at checkout."
          />
        ) : (
          <Table columns={columns} data={rows} onEdit={undefined} onDelete={undefined} />
        )}
      </Card>
    </>
  );
}
