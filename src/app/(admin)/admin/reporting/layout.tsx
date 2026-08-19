'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import ReportFilterBar from '@/components/reporting/ReportFilterBar';

import { Suspense } from 'react';

const tabs = [
  { href: '/admin/reporting/sales', label: 'Sales' },
  { href: '/admin/reporting/products', label: 'Products' },
  { href: '/admin/reporting/time', label: 'Time Analysis' },
  { href: '/admin/reporting/staff', label: 'Staff' },
  { href: '/admin/reporting/inventory', label: 'Inventory Health' },
  { href: '/admin/reporting/stock-value', label: 'Stock Value' },
  { href: '/admin/reporting/expenses', label: 'All Expenses' },
  { href: '/admin/reporting/non-inventory-expenses', label: 'Non-Inventory' },
  { href: '/admin/reporting/consumable-expenses', label: 'Consumable' },
  { href: '/admin/reporting/all-inventory-expenses', label: 'All Inventory' },
  { href: '/admin/reporting/profit', label: 'Profit' },
  { href: '/admin/reporting/compare', label: 'Compare' },
];

function ReportingLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Reporting & Analytics</h1>
          <p className="text-sm text-base-content/50 mt-1">View comprehensive insights across your business</p>
        </div>
        <ReportFilterBar />
      </div>

      <div className="tabs tabs-boxed bg-base-100 p-1 gap-1 border border-base-200 shadow-sm w-fit">
        {tabs.map(tab => {
          const isActive = pathname.startsWith(tab.href);
          const hrefWithParams = `${tab.href}?${searchParams.toString()}`;
          return (
            <Link key={tab.href} href={hrefWithParams} className={`tab font-medium ${isActive ? 'tab-active bg-primary text-primary-content rounded-xl' : 'rounded-xl'}`}>
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div>
        {children}
      </div>
    </div>
  );
}

export default function ReportingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><span className="loading loading-spinner text-primary"></span></div>}>
      <ReportingLayoutInner>{children}</ReportingLayoutInner>
    </Suspense>
  );
}
