'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { resolveRange, ReportWindow } from '@/lib/reportRange';

/**
 * Reads the shared reporting filters (range + branch) out of the URL and
 * resolves them into a concrete window.
 */
export function useReportFilters(): { period: ReportWindow; branch: string } {
  const searchParams = useSearchParams();

  return {
    // Named `period`, not `window` - shadowing the DOM global in every page
    // that consumes this is a trap waiting to spring.
    period: resolveRange(
      searchParams.get('range'),
      searchParams.get('from'),
      searchParams.get('to'),
    ),
    branch: searchParams.get('branch') || 'all',
  };
}

export interface ReportState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function messageFor(err: unknown): string {
  return err instanceof Error && /\b5\d{2}\b/.test(err.message)
    ? 'The server could not build this report. Try a shorter date range, or contact support if it keeps happening.'
    : 'Could not load this report. Check your connection and try again.';
}

/**
 * Fetches one aggregated report.
 *
 * Three guarantees, each of which was previously a source of wrong numbers on
 * screen:
 *
 *  - On a failed request `data` is null and `error` is set. The previous
 *    range's figures are never left on screen under the new range's label.
 *  - The in-flight request is aborted when the filters change, so a slow
 *    response for an old range cannot overwrite a fast one for the new range.
 *  - State resets during render when the request key changes, so a page never
 *    paints fresh filters against stale rows - not even for one frame.
 */
export function useReport<T>(
  endpoint: string,
  params: Record<string, string | number | null | undefined>,
  options: { skip?: boolean } = {},
): ReportState<T> {
  const skip = !!options.skip;
  const [attempt, setAttempt] = useState(0);

  // Serialise params so the request depends on their value, not their identity.
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });
  const url = `${endpoint}?${query.toString()}`;
  const requestKey = `${skip ? 'skip' : 'run'}|${attempt}|${url}`;

  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({
    data: null,
    loading: !skip,
    error: null,
  });
  const [renderedKey, setRenderedKey] = useState(requestKey);

  if (requestKey !== renderedKey) {
    setRenderedKey(requestKey);
    setState({ data: null, loading: !skip, error: null });
  }

  useEffect(() => {
    if (skip) return;

    const controller = new AbortController();

    fetchApi(url, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        setState({ data: res as T, loading: false, error: null });
      })
      .catch((err) => {
        // An abort is a superseded request, not a failure worth reporting.
        if (controller.signal.aborted || (err as { name?: string })?.name === 'AbortError') return;
        console.error(`Report request failed: ${url}`, err);
        setState({ data: null, loading: false, error: messageFor(err) });
      });

    return () => controller.abort();
    // requestKey covers url, skip and attempt.
  }, [requestKey, url, skip]);

  const reload = useCallback(() => setAttempt(a => a + 1), []);

  return { ...state, reload };
}
