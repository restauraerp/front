'use client';

import React from 'react';
import { AlertTriangle, Inbox, RefreshCw, CalendarRange } from 'lucide-react';

export function ReportLoading() {
  return (
    <div className="flex justify-center py-20">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

/**
 * Shown instead of the report body when a request fails. The point is that the
 * user is never left looking at numbers that quietly belong to a different
 * filter.
 */
export function ReportError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert-error/10 border border-error/30 bg-error/5 rounded-2xl flex items-start gap-3 py-4">
      <AlertTriangle className="text-error shrink-0 mt-0.5" size={20} />
      <div className="flex-1">
        <h3 className="font-semibold text-base-content">Report unavailable</h3>
        <p className="text-sm text-base-content/70 mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button className="btn btn-sm btn-outline border-error/40 text-error hover:bg-error hover:text-error-content gap-2" onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export function ReportEmpty({
  title = 'No data for this period',
  hint = 'Try widening the date range or selecting a different branch.',
}: { title?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-base-200 flex items-center justify-center mb-3">
        <Inbox className="text-base-content/40" size={22} />
      </div>
      <p className="font-semibold text-base-content">{title}</p>
      <p className="text-sm text-base-content/50 mt-1 max-w-sm">{hint}</p>
    </div>
  );
}

/** Shown when Custom Range is selected but only one of the two dates is set. */
export function ReportNeedsDates() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-base-200 flex items-center justify-center mb-3">
        <CalendarRange className="text-base-content/40" size={22} />
      </div>
      <p className="font-semibold text-base-content">Pick a start and end date</p>
      <p className="text-sm text-base-content/50 mt-1">
        The report will run once both ends of the custom range are set.
      </p>
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'info';
}) {
  const toneClass = {
    default: 'text-base-content',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info',
  }[tone];

  return (
    <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-base-content/50">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-base-content/50 mt-1">{sub}</div>}
    </div>
  );
}

/** Small caption used under a card title to state exactly what is being summed. */
export function MetricNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-base-content/50 mb-3">{children}</p>;
}
