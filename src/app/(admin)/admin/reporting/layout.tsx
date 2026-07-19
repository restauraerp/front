'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import ReportFilterBar from '@/components/reporting/ReportFilterBar';

const tabs = [
  { href: '/admin/reporting/sales', label: 'Sales Report' },
  { href: '/admin/reporting/products', label: 'Product Performance' },
  { href: '/admin/reporting/time', label: 'Time Analysis' },
  { href: '/admin/reporting/inventory', label: 'Inventory Health' },
];

export default function ReportingLayout({ children }: { children: React.ReactNode }) {
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
