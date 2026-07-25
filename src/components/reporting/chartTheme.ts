/**
 * Chart palette, kept in step with the `restoraerp` daisyUI theme in
 * globals.css. Recharts sets `fill`/`stroke` as SVG presentation attributes,
 * which do not resolve `var(--…)`, so the brand values are mirrored here as
 * literals. If globals.css changes, change these too.
 */
export const CHART = {
  revenue: '#0F6E5C', // --color-primary
  orders: '#F4A825', // --color-secondary
  collected: '#1E8E5A', // --color-success
  accent: '#2F80ED', // --color-info
  grid: '#E4E7E6', // --color-base-300
  axis: '#9CA3A6', // --color-content-muted
  label: '#1A1D1F', // --color-base-content
  cursor: '#F2F5F4', // --color-base-200
} as const;

/** Shared Recharts props so every chart in the module lines up visually. */
export const axisProps = {
  tick: { fontSize: 12, fill: CHART.axis },
  tickMargin: 10,
  stroke: CHART.axis,
} as const;

export const tooltipProps = {
  labelStyle: { color: CHART.label, fontWeight: 600 },
  contentStyle: {
    borderRadius: '0.75rem',
    border: `1px solid ${CHART.grid}`,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  },
} as const;
