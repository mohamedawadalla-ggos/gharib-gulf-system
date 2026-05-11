// app/assets/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  ArrowLeft, 
  Wrench, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  Ruler, 
  Gauge, 
  Factory,
  Server,
  Info,
  Clock
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AssetDetail {
  id: string;
  tag_number: string;
  station_id: string;
  maintenance_status: string;
  criticality: string;
  condition: string;
  last_service_date: string | null;
  next_service_date: string | null;
  operating_status: string;
  location_code: string | null;
  size_inches: string | null;
  pressure_class: string | null;
  manufacturer: string | null;
  asset_type: string | null;
  sct_code: string | null;
  serial_number: string | null;
  installation_date: string | null;
  notes: string | null;
  stations: {
    code: string;
    name: string;
    location_code: string | null;
  } | null;
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssetDetail();
  }, [params.id]);

  async function fetchAssetDetail() {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch asset details from the clean view
      const { data: assetData, error: assetError } = await supabase
        .from('assets_clean')
        .select(`
          id,
          tag_number,
          station_id,
          maintenance_status,
          criticality,
          condition,
          location_code,
          size_inches,
          pressure_class,
          manufacturer,
          operating_status,
          asset_type,
          sct_code,
          serial_number
        `)
        .eq('id', params.id)
        .single();

      if (assetError) throw assetError;

      // Fetch date fields separately from main assets table
      const { data: dateData, error: dateError } = await supabase
        .from('assets')
        .select('last_service_date, next_service_date, installation_date, notes')
        .eq('id', params.id)
        .single();

      if (dateError && dateError.code !== 'PGRST116') {
        console.error('Date fetch error:', dateError);
      }

      // Fetch station info
      const { data: stationData } = await supabase
        .from('stations')
        .select('code, name')
        .eq('id', assetData.station_id)
        .single();

      setAsset({
        ...assetData,
        ...dateData,
        stations: stationData || null
      });

    } catch (err: any) {
      console.error('Error fetching asset:', err);
      setError(err.message || 'Failed to load asset details');
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return { color: 'bg-red-900/50 text-red-300 border-red-500/30', icon: AlertTriangle, label: 'Overdue' };
      case 'due_soon':
        return { color: 'bg-yellow-900/50 text-yellow-300 border-yellow-500/30', icon: Clock, label: 'Due Soon' };
      default:
        return { color: 'bg-green-900/50 text-green-300 border-green-500/30', icon: CheckCircle, label: 'Up to Date' };
    }
  };

  const getCriticalityBadge = (criticality: string) => {
    switch (criticality?.toLowerCase()) {
      case 'critical':
        return { color: 'bg-red-900/50 text-red-300 border-red-500/30', label: 'CRITICAL' };
      case 'high':
        return { color: 'bg-orange-900/50 text-orange-300 border-orange-500/30', label: 'HIGH' };
      default:
        return { color: 'bg-gray-700/50 text-gray-300 border-gray-600/30', label: 'MEDIUM' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
          <p className="text-navy-300">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-navy-950 p-6">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center max-w-2xl mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Asset Not Found</h2>
          <p className="text-navy-300 mb-4">{error || 'The requested asset could not be found.'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusBadge(asset.maintenance_status);
  const StatusIcon = statusConfig.icon;
  const criticalityConfig = getCriticalityBadge(asset.criticality);

  return (
    <div className="min-h-screen bg-navy-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header with back button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-navy-300 hover:text-navy-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Assets
          </button>
          
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-navy-50 font-mono">
                {asset.tag_number}
              </h1>
              <p className="text-navy-300 mt-1">{asset.asset_type || 'Valve'}</p>
            </div>
            
            <div className="flex gap-2">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${statusConfig.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusConfig.label}
              </span>
              <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold border ${criticalityConfig.color}`}>
                {criticalityConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Key Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location Card */}
            <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
              <h2 className="text-lg font-semibold text-navy-100 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400" />
                Location
              </h2>
              <div className="space-y-2">
                <p className="text-navy-200">
                  <span className="text-navy-400">Station:</span>{' '}
                  <span className="font-medium">{asset.stations?.code || 'Unknown'}</span>
                  {asset.stations?.name && ` - ${asset.stations.name}`}
                </p>
                {asset.location_code && (
                  <p className="text-navy-200">
                    <span className="text-navy-400">Location Code:</span> {asset.location_code}
                  </p>
                )}
                {asset.stations?.location_code && (
                  <p className="text-navy-200">
                    <span className="text-navy-400">Station Location:</span> {asset.stations.location_code}
                  </p>
                )}
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
              <h2 className="text-lg font-semibold text-navy-100 mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                Technical Specifications
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {asset.size_inches && (
                  <div>
                    <p className="text-xs text-navy-400 uppercase">Size</p>
                    <p className="text-navy-200 font-medium">{asset.size_inches}"</p>
                  </div>
                )}
                {asset.pressure_class && (
                  <div>
                    <p className="text-xs text-navy-400 uppercase">Pressure Class</p>
                    <p className="text-navy-200 font-medium">{asset.pressure_class}</p>
                  </div>
                )}
                {asset.manufacturer && (
                  <div>
                    <p className="text-xs text-navy-400 uppercase">Manufacturer</p>
                    <p className="text-navy-200 font-medium">{asset.manufacturer}</p>
                  </div>
                )}
                {asset.sct_code && (
                  <div>
                    <p className="text-xs text-navy-400 uppercase">SCT Code</p>
                    <p className="text-navy-200 font-medium">{asset.sct_code}</p>
                  </div>
                )}
                {asset.serial_number && (
                  <div>
                    <p className="text-xs text-navy-400 uppercase">Serial Number</p>
                    <p className="text-navy-200 font-medium font-mono text-sm">{asset.serial_number}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Maintenance History */}
            <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
              <h2 className="text-lg font-semibold text-navy-100 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                Maintenance Schedule
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {asset.last_service_date && (
                  <div>
                    <p className="text-xs text-navy-400 uppercase">Last Service</p>
                    <p className="text-navy-200 font-medium">
                      {new Date(asset.last_service_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {asset.next_service_date && (
                  <div>
                    <p className="text-xs text-navy-400 uppercase">Next Service</p>
                    <p className="text-navy-200 font-medium">
                      {new Date(asset.next_service_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {asset.installation_date && (
                  <div>
                    <p className="text-xs text-navy-400 uppercase">Installation Date</p>
                    <p className="text-navy-200 font-medium">
                      {new Date(asset.installation_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Status & Notes */}
          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
              <h2 className="text-lg font-semibold text-navy-100 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-amber-400" />
                Current Status
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-navy-400 uppercase">Operating Status</p>
                  <p className="text-navy-200 font-medium">{asset.operating_status || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-400 uppercase">Condition</p>
                  <p className={`font-medium ${
                    asset.condition === 'poor' ? 'text-red-400' : 
                    asset.condition === 'good' ? 'text-green-400' : 'text-navy-200'
                  }`}>
                    {asset.condition || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {asset.notes && (
              <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
                <h2 className="text-lg font-semibold text-navy-100 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-amber-400" />
                  Notes
                </h2>
                <p className="text-navy-200 text-sm leading-relaxed">{asset.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
              <h2 className="text-lg font-semibold text-navy-100 mb-4">Actions</h2>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg transition-colors font-medium">
                  Schedule Maintenance
                </button>
                <button className="w-full px-4 py-2 bg-navy-800 hover:bg-navy-700 text-navy-200 rounded-lg transition-colors border border-navy-600">
                  Update Asset Info
                </button>
                <button className="w-full px-4 py-2 bg-navy-800 hover:bg-navy-700 text-navy-200 rounded-lg transition-colors border border-navy-600">
                  View Maintenance History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}