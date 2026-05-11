// app/assets/_components/asset-table.tsx
'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function AssetTable({ assets, currentPage, totalPages, onPageChange }: any) {
  if (!assets || assets.length === 0) {
    return (
      <div className="bg-navy-900 rounded-lg p-12 text-center border border-navy-700">
        <p className="text-navy-300">No assets found matching your filters</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-red-900/50 text-red-300 border-red-500/30';
      case 'due_soon': return 'bg-amber-900/50 text-amber-300 border-amber-500/30';
      default: return 'bg-green-900/50 text-green-300 border-green-500/30';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality?.toLowerCase()) {
      case 'critical': return 'text-red-400 font-bold';
      case 'high': return 'text-amber-400';
      default: return 'text-navy-300';
    }
  };

  return (
    <div className="bg-navy-900 rounded-lg border border-navy-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-navy-200">
          <thead className="bg-navy-800 text-navy-400 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Tag Number</th>
              <th className="px-4 py-3">Station</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criticality</th>
              <th className="px-4 py-3">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {assets.map((asset: any) => (
              <tr key={asset.id} className="hover:bg-navy-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-navy-50">
                  <Link href={`/assets/${asset.id}`} className="hover:text-amber-400">
                    {asset.tag_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {asset.stations?.code || 'Unknown'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs border ${getStatusColor(asset.maintenance_status)}`}>
                    {asset.maintenance_status?.replace('_', ' ') || 'Unknown'}
                  </span>
                </td>
                <td className={`px-4 py-3 font-medium ${getCriticalityColor(asset.criticality)}`}>
                  {asset.criticality || 'Medium'}
                </td>
                <td className="px-4 py-3 capitalize">
                  {asset.condition || 'Good'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-3 border-t border-navy-700">
          <p className="text-sm text-navy-300">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <button
                onClick={() => onPageChange(currentPage - 1)}
                className="px-3 py-1 rounded-lg text-sm bg-navy-800 hover:bg-navy-700 border border-navy-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 inline" /> Prev
              </button>
            )}
            {currentPage < totalPages && (
              <button
                onClick={() => onPageChange(currentPage + 1)}
                className="px-3 py-1 rounded-lg text-sm bg-navy-800 hover:bg-navy-700 border border-navy-600 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4 inline" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}