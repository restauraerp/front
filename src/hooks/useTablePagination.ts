'use client';

import { useState } from 'react';

/**
 * Client-side pagination for an already-loaded result set.
 *
 * Resets to page 1 whenever the underlying rows change. Without that, changing
 * the date filter while on page 3 left `page` pointing past the end of the new,
 * shorter result set - the table rendered empty and the pager hid itself
 * (`totalPages > 1`), stranding the user with no way back.
 */
export function useTablePagination<T>(rows: T[], perPage = 10) {
  const [page, setPage] = useState(1);
  const [renderedRows, setRenderedRows] = useState(rows);

  if (rows !== renderedRows) {
    setRenderedRows(rows);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  // Belt and braces: clamp in case rows shrink without their identity changing.
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);

  return {
    page: currentPage,
    totalPages,
    pageRows,
    firstIndex: rows.length === 0 ? 0 : start + 1,
    lastIndex: Math.min(start + perPage, rows.length),
    total: rows.length,
    next: () => setPage(p => Math.min(totalPages, p + 1)),
    prev: () => setPage(p => Math.max(1, p - 1)),
  };
}
