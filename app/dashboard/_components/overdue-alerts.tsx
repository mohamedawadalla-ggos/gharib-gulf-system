'use client';

import { AlertTriangle, CheckCircle, MapPin, AlertCircle } from "lucide-react";
import Link from "next/link";

interface OverdueAlert {
  id: string;
  tag_number: string;
  station_id: string;
  stations: { code: string; name: string; } | { code: string; name: string; }[];
  criticality: string;
  condition: string;
  next_service_date?: string;
}

interface OverdueAlertsProps {
  alerts?: OverdueAlert[];
}

export function OverdueAlerts({ alerts = [] }: OverdueAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="card bg-navy-800 p-6 rounded-lg border border-navy-700 text-center">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <p className="text-navy-200">No overdue maintenance</p>
        <p className="text-sm text-navy-400 mt-1">All assets are up to date</p>
      </div>
    );
  }

  const getCriticalityColor = (criticality: string) => {
    switch (criticality?.toLowerCase()) {
      case 'critical':
        return 'text-red-400 bg-red-900/30';
      case 'high':
        return 'text-orange-400 bg-orange-900/30';
      default:
        return 'text-yellow-400 bg-yellow-900/30';
    }
  };

  // Helper to get station info regardless of format
  const getStationInfo = (stations: any) => {
    if (!stations) return { code: 'N/A', name: 'Unknown' };
    if (Array.isArray(stations) && stations.length > 0) return stations[0];
    return stations;
  };

  return (
    <div className="space-y-3">
      {alerts.slice(0, 10).map((asset) => {
        const station = getStationInfo(asset.stations);
        return (
          <div
            key={asset.id}
            className="bg-navy-800 rounded-lg p-4 border border-navy-700 hover:border-red-500/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Link 
                    href={`/assets/${asset.id}`}
                    className="font-mono text-sm font-semibold text-navy-50 hover:text-amber-400"
                  >
                    {asset.tag_number}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getCriticalityColor(asset.criticality)}`}>
                    {asset.criticality || 'Medium'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-navy-300 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{station?.code || 'Unknown'} - {station?.name || 'Unknown Station'}</span>
                </div>
                {asset.condition && asset.condition !== 'good' && (
                  <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Condition: {asset.condition}</span>
                  </div>
                )}
              </div>
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            </div>
          </div>
        );
      })}
      
      {alerts.length > 10 && (
        <Link 
          href="/assets?status=overdue"
          className="block text-center text-sm text-navy-300 hover:text-navy-100 py-2 transition-colors"
        >
          View all {alerts.length} overdue assets →
        </Link>
      )}
    </div>
  );
}