'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';
import { formatTaka } from '@/lib/format';
import { RANGE_OPTIONS, resolveRange } from '@/lib/reportRange';
import { ReportLoading } from '@/components/reporting/ReportStates';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CHART, axisProps, tooltipProps } from '@/components/reporting/chartTheme';

const METRIC_OPTIONS = [
  { value: 'revenue', label: 'Revenue', endpoint: '/reports/sales', extract: (d: any) => d?.summary?.collected_revenue ?? 0 },
  { value: 'gross_revenue', label: 'Gross Revenue', endpoint: '/reports/sales', extract: (d: any) => d?.summary?.gross_revenue ?? 0 },
  { value: 'profit', label: 'Net Profit', endpoint: '/reports/profit', extract: (d: any) => d?.summary?.net_profit ?? 0 },
  { value: 'all_expenses', label: 'All Expenses', endpoint: '/reports/expenses', extract: (d: any) => d?.summary?.total_expenses ?? 0 },
  { value: 'non_inventory', label: 'Non-Inventory Expenses', endpoint: '/reports/non-inventory-expenses', extract: (d: any) => d?.summary?.total ?? 0 },
  { value: 'purchase', label: 'Purchase Expenses', endpoint: '/reports/expenses', extract: (d: any) => d?.summary?.purchase_expenses ?? 0 },
  { value: 'consumable', label: 'Consumable Expenses', endpoint: '/reports/consumable-expenses', extract: (d: any) => d?.summary?.total ?? 0 },
  { value: 'all_inventory', label: 'All Inventory Expenses', endpoint: '/reports/all-inventory-expenses', extract: (d: any) => d?.summary?.total ?? 0 },
];

const COLORS = ['#6366f1', '#22c55e', '#f59e0b'];

interface Slot {
  metric: string;
  range: string;
  customFrom: string;
  customTo: string;
}

interface SlotResult {
  value: number | null;
  loading: boolean;
  error: boolean;
  label: string;
}

const defaultSlot = (): Slot => ({ metric: 'revenue', range: 'this_month', customFrom: '', customTo: '' });

export default function ComparePage() {
  const [slots, setSlots] = useState<Slot[]>([defaultSlot(), defaultSlot()]);
  const [results, setResults] = useState<SlotResult[]>([
    { value: null, loading: false, error: false, label: '' },
    { value: null, loading: false, error: false, label: '' },
  ]);

  const fetchSlot = useCallback(async (index: number, slot: Slot) => {
    const metricDef = METRIC_OPTIONS.find(m => m.value === slot.metric);
    if (!metricDef) return;

    const window = resolveRange(slot.range, slot.customFrom || null, slot.customTo || null);
    if (window.incomplete) {
      setResults(prev => {
        const next = [...prev];
        next[index] = { value: null, loading: false, error: false, label: 'Select both dates' };
        return next;
      });
      return;
    }

    setResults(prev => {
      const next = [...prev];
      next[index] = { ...next[index], loading: true, error: false };
      return next;
    });

    try {
      const params = new URLSearchParams();
      if (window.from) params.set('from', window.from);
      params.set('to', window.to);
      const res = await fetchApi(`${metricDef.endpoint}?${params.toString()}`);
      const value = metricDef.extract(res);
      setResults(prev => {
        const next = [...prev];
        next[index] = { value, loading: false, error: false, label: window.label };
        return next;
      });
    } catch {
      setResults(prev => {
        const next = [...prev];
        next[index] = { value: null, loading: false, error: true, label: window.label };
        return next;
      });
    }
  }, []);

  useEffect(() => {
    slots.forEach((slot, i) => fetchSlot(i, slot));
  }, []);

  const updateSlot = (index: number, patch: Partial<Slot>) => {
    setSlots(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      fetchSlot(index, next[index]);
      return next;
    });
  };

  const addSlot = () => {
    if (slots.length >= 3) return;
    const newSlot = defaultSlot();
    setSlots(prev => [...prev, newSlot]);
    setResults(prev => [...prev, { value: null, loading: true, error: false, label: '' }]);
    fetchSlot(slots.length, newSlot);
  };

  const removeSlot = (index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
    setResults(prev => prev.filter((_, i) => i !== index));
  };

  const chartData = [
    {
      name: 'Comparison',
      ...Object.fromEntries(slots.map((slot, i) => {
        const metricLabel = METRIC_OPTIONS.find(m => m.value === slot.metric)?.label ?? slot.metric;
        return [`${metricLabel} (${results[i]?.label || '…'})`, results[i]?.value ?? 0];
      })),
    }
  ];

  const chartKeys = slots.map((slot, i) => {
    const metricLabel = METRIC_OPTIONS.find(m => m.value === slot.metric)?.label ?? slot.metric;
    return `${metricLabel} (${results[i]?.label || '…'})`;
  });

  return (
    <>
      <p className="text-sm text-base-content/60 mb-6">
        Compare up to 3 metrics across independent date ranges side by side.
      </p>

      <div className={`grid gap-4 mb-6 ${slots.length === 1 ? 'grid-cols-1' : slots.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
        {slots.map((slot, i) => {
          const result = results[i];
          const metricLabel = METRIC_OPTIONS.find(m => m.value === slot.metric)?.label ?? slot.metric;
          return (
            <Card key={i} className="relative">
              {slots.length > 2 && (
                <button
                  className="absolute top-3 right-3 btn btn-xs btn-ghost btn-circle text-base-content/40"
                  onClick={() => removeSlot(i)}
                  title="Remove"
                >✕</button>
              )}
              <div className="space-y-3">
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs font-semibold">Metric</span></label>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={slot.metric}
                    onChange={e => updateSlot(i, { metric: e.target.value })}
                  >
                    {METRIC_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs font-semibold">Date Range</span></label>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={slot.range}
                    onChange={e => updateSlot(i, { range: e.target.value, customFrom: '', customTo: '' })}
                  >
                    {RANGE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {slot.range === 'custom' && (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="input input-bordered input-sm flex-1"
                      value={slot.customFrom}
                      onChange={e => updateSlot(i, { customFrom: e.target.value })}
                    />
                    <input
                      type="date"
                      className="input input-bordered input-sm flex-1"
                      value={slot.customTo}
                      onChange={e => updateSlot(i, { customTo: e.target.value })}
                    />
                  </div>
                )}

                <div
                  className="mt-2 rounded-xl p-4 text-center"
                  style={{ background: `${COLORS[i]}15`, border: `2px solid ${COLORS[i]}40` }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: COLORS[i] }}>{metricLabel}</p>
                  <p className="text-xs text-base-content/50 mb-2">{result?.label || '…'}</p>
                  {result?.loading ? (
                    <span className="loading loading-spinner loading-sm" style={{ color: COLORS[i] }} />
                  ) : result?.error ? (
                    <p className="text-sm text-error">Error loading</p>
                  ) : result?.value !== null ? (
                    <p className="text-2xl font-extrabold" style={{ color: COLORS[i] }}>{formatTaka(result.value)}</p>
                  ) : (
                    <p className="text-sm text-base-content/40">—</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {slots.length < 3 && (
        <button className="btn btn-outline btn-sm mb-6" onClick={addSlot}>+ Add Comparison</button>
      )}

      {results.some(r => r.value !== null) && (
        <Card title="Side-by-Side Chart">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={v => formatTaka(v)} {...axisProps} />
                <Tooltip
                  formatter={(value) => [formatTaka(Number(value)), ''] as [string, string]}
                  {...tooltipProps}
                />
                <Legend />
                {chartKeys.map((key, i) => (
                  <Bar key={key} dataKey={key} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </>
  );
}
