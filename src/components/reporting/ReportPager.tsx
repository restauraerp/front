'use client';

import React from 'react';

export function ReportPager({
  page,
  totalPages,
  firstIndex,
  lastIndex,
  total,
  noun,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  firstIndex: number;
  lastIndex: number;
  total: number;
  noun: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
      <span className="text-sm text-base-content/60">
        Showing {firstIndex} to {lastIndex} of {total} {noun}
      </span>
      {totalPages > 1 && (
        <div className="join">
          <button className="join-item btn btn-sm btn-outline" disabled={page === 1} onClick={onPrev} aria-label="Previous page">«</button>
          <button className="join-item btn btn-sm no-animation pointer-events-none">Page {page} of {totalPages}</button>
          <button className="join-item btn btn-sm btn-outline" disabled={page === totalPages} onClick={onNext} aria-label="Next page">»</button>
        </div>
      )}
    </div>
  );
}
