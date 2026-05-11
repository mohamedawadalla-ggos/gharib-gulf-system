// app/assets/_components/asset-filters.tsx
'use client';

import { Search } from 'lucide-react';

export function AssetFilters({ 
  initialSearch, 
  initialStatus, 
  initialStation, 
  initialCriticality,
  stations, 
  statuses, 
  criticalities,
  onFilterChange 
}: any) {
  return (
    <div className="bg-navy-900 p-4 rounded-lg border border-navy-700 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input
            type="text"
            placeholder="Search tag number..."
            defaultValue={initialSearch}
            onBlur={(e) => onFilterChange('search', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onFilterChange('search', (e.target as HTMLInputElement).value);
              }
            }}
            className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm text-navy-100 placeholder-navy-400 focus:outline-none focus:border-amber-400"
          />
        </div>
        
        {/* Status */}
        <select
          defaultValue={initialStatus || 'all'}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm text-navy-100 focus:outline-none focus:border-amber-400"
        >
          <option value="all">All Statuses</option>
          {statuses.map((s: string) => (
            <option key={s} value={s}>{s?.replace('_', ' ') || s}</option>
          ))}
        </select>
        
        {/* Station */}
        <select
          defaultValue={initialStation || 'all'}
          onChange={(e) => onFilterChange('station', e.target.value)}
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm text-navy-100 focus:outline-none focus:border-amber-400"
        >
          <option value="all">All Stations</option>
          {stations.map((station: any) => (
            <option key={station.code} value={station.code}>
              {station.code} - {station.name}
            </option>
          ))}
        </select>
        
        {/* Criticality */}
        <select
          defaultValue={initialCriticality || 'all'}
          onChange={(e) => onFilterChange('criticality', e.target.value)}
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm text-navy-100 focus:outline-none focus:border-amber-400"
        >
          <option value="all">All Criticality</option>
          {criticalities.map((c: string) => (
            <option key={c} value={c}>{c?.charAt(0).toUpperCase() + c?.slice(1)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}