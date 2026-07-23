'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MapPin, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function AccountingFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [locations, setLocations] = useState<any[]>([]);
  
  const selectedBranch = searchParams.get('location_id') || 'all';
  const filterRange = searchParams.get('range') || 'all_time';
  const customDateFrom = searchParams.get('from') || '';
  const customDateTo = searchParams.get('to') || '';

  useEffect(() => {
    fetchApi('/locations?nopaginate=true').then(res => {
      setLocations(res.data || res || []);
    }).catch(console.error);
  }, []);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 bg-base-100 p-1.5 rounded-2xl shadow-sm border border-base-200 w-fit mb-6">
      <div className="flex items-center gap-2 px-3 border-r border-base-200">
        <MapPin size={16} className="text-base-content/50" />
        <select 
          className="select select-sm select-ghost font-medium focus:bg-transparent px-0 pr-6" 
          value={selectedBranch} 
          onChange={(e) => updateParams({ location_id: e.target.value, page: '1' })}
        >
          <option value="all">All Entries</option>
          <option value="general">General Purpose (No Branch)</option>
          {locations.map((loc: any) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 px-3">
        <Calendar size={16} className="text-base-content/50" />
        <select 
          className="select select-sm select-ghost font-medium focus:bg-transparent px-0 pr-6" 
          value={filterRange} 
          onChange={(e) => updateParams({ range: e.target.value, from: '', to: '', page: '1' })}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="past_week">Past Week</option>
          <option value="past_28_days">Past 28 Days</option>
          <option value="12_months">Past 12 Months</option>
          <option value="all_time">All Time</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {filterRange === 'custom' && (
        <div className="flex items-center gap-2 pl-3 pr-1 border-l border-base-200 animate-in fade-in slide-in-from-right-4 duration-300">
          <input 
            type="date" 
            className="input input-sm bg-base-200 focus:outline-none rounded-lg text-sm" 
            value={customDateFrom} 
            onChange={(e) => updateParams({ from: e.target.value, page: '1' })} 
          />
          <span className="text-xs font-semibold text-base-content/40">TO</span>
          <input 
            type="date" 
            className="input input-sm bg-base-200 focus:outline-none rounded-lg text-sm" 
            value={customDateTo} 
            onChange={(e) => updateParams({ to: e.target.value, page: '1' })} 
          />
        </div>
      )}
    </div>
  );
}
