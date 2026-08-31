'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MapPin, Calendar } from 'lucide-react';
import { RANGE_OPTIONS } from '@/lib/reportRange';
import { useLocations } from '@/hooks/useLocations';

export default function ReportFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // With one outlet the only choices are "All Branches" and that branch, which
  // are the same report. The control is dropped rather than disabled: a greyed
  // dropdown still asks the reader to work out that it does not matter.
  const { locations, single } = useLocations();

  const selectedBranch = searchParams.get('branch') || 'all';
  const filterRange = searchParams.get('range') || 'this_week';
  const customDateFrom = searchParams.get('from') || '';
  const customDateTo = searchParams.get('to') || '';

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div data-tour="report-range" className="flex flex-wrap items-center gap-1 bg-base-100 p-1.5 rounded-2xl shadow-sm border border-base-200">
      {!single && (
        <div className="flex items-center gap-2 px-3 border-r border-base-200">
          <MapPin size={16} className="text-base-content/50" />
          <select
            className="select select-sm select-ghost font-medium focus:bg-transparent px-0 pr-6"
            value={selectedBranch}
            onChange={(e) => updateParams({ branch: e.target.value })}
          >
            <option value="all">All Branches</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2 px-3">
        <Calendar size={16} className="text-base-content/50" />
        <select 
          className="select select-sm select-ghost font-medium focus:bg-transparent px-0 pr-6" 
          value={filterRange} 
          onChange={(e) => updateParams({ range: e.target.value, from: '', to: '' })}
        >
          {RANGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {filterRange === 'custom' && (
        <div className="flex items-center gap-2 pl-3 pr-1 border-l border-base-200 animate-in fade-in slide-in-from-right-4 duration-300">
          <input type="date" className="input input-sm bg-base-200 focus:outline-none rounded-lg text-sm" value={customDateFrom} onChange={(e) => updateParams({ from: e.target.value })} />
          <span className="text-xs font-semibold text-base-content/40">TO</span>
          <input type="date" className="input input-sm bg-base-200 focus:outline-none rounded-lg text-sm" value={customDateTo} onChange={(e) => updateParams({ to: e.target.value })} />
        </div>
      )}
    </div>
  );
}
