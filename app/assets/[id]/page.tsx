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
  Server,
  Info,
  Clock,
  Camera,
  Download,
  X
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

interface AssetPhoto {
  id: string;
  asset_id: string;
  image_url: string;
  public_url: string;
  image_type: string;
  captured_gps_lat: number | null;
  captured_gps_lng: number | null;
  notes: string | null;
  created_at: string;
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [photos, setPhotos] = useState<AssetPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<AssetPhoto | null>(null);

  useEffect(() => {
    fetchAssetDetail();
  }, [params.id]);

  async function fetchAssetDetail() {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Get the asset from assets_clean
      const { data: assetData, error: assetError } = await supabase
        .from('assets_clean')
        .select('*')
        .eq('id', params.id)
        .single();

      if (assetError) throw assetError;

      // 2. Get date fields separately from main assets table
      const { data: dateData, error: dateError } = await supabase
        .from('assets')
        .select('last_service_date, next_service_date, installation_date, notes')
        .eq('id', params.id)
        .single();

      if (dateError && dateError.code !== 'PGRST116') {
        console.error('Date fetch error:', dateError);
      }

      // 3. Get station info
      let stationInfo = null;
      if (assetData.station_id) {
        const { data: stationData } = await supabase
          .from('stations')
          .select('code, name')
          .eq('id', assetData.station_id)
          .single();
        
        if (stationData) {
          stationInfo = {
            code: stationData.code,
            name: stationData.name,
            location_code: null
          };
        }
      }

      // 4. Combine asset data
      const combinedAsset: AssetDetail = {
        id: assetData.id,
        tag_number: assetData.tag_number,
        station_id: assetData.station_id,
        maintenance_status: assetData.maintenance_status,
        criticality: assetData.criticality,
        condition: assetData.condition,
        last_service_date: dateData?.last_service_date || null,
        next_service_date: dateData?.next_service_date || null,
        operating_status: assetData.operating_status,
        location_code: assetData.location_code,
        size_inches: assetData.size_inches,
        pressure_class: assetData.pressure_class,
        manufacturer: assetData.manufacturer,
        asset_type: assetData.asset_type,
        sct_code: assetData.sct_code,
        serial_number: assetData.serial_number,
        installation_date: dateData?.installation_date || null,
        notes: dateData?.notes || null,
        stations: stationInfo
      };

      setAsset(combinedAsset);

      // 5. Fetch photos for this asset
      await fetchAssetPhotos(assetData.id);

    } catch (err: any) {
      console.error('Error fetching asset:', err);
      setError(err.message || 'Failed to load asset details');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAssetPhotos(assetId: string) {
    try {
      const { data: photoData, error: photoError } = await supabase
        .from('asset_images')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      if (photoError) {
        console.error('Photo fetch error:', photoError);
        return;
      }

      // Get public URLs for each photo
      const photosWithUrls = await Promise.all(
        (photoData || []).map(async (photo) => {
          const { data } = supabase.storage
            .from('valve-photos')
            .getPublicUrl(photo.image_url);
          return { 
            ...photo, 
            public_url: data.publicUrl 
          } as AssetPhoto;
        })
      );
      
      setPhotos(photosWithUrls);
    } catch (err) {
      console.error('Error processing photos:', err);
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
        {/* Header */}
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
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

            {/* Maintenance Schedule */}
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

            {/* 📸 NEW: Photo Gallery Section */}
            <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
              <h2 className="text-lg font-semibold text-navy-100 mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                Maintenance Photos ({photos.length})
              </h2>

              {photos.length === 0 ? (
                <div className="text-center py-8 text-navy-400 border-2 border-dashed border-navy-700 rounded-lg">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No photos uploaded yet</p>
                  <p className="text-xs mt-1">Photos appear here after mobile task completion</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {photos.map((photo) => (
                    <div 
                      key={photo.id} 
                      className="bg-navy-800 rounded-lg overflow-hidden border border-navy-700 group hover:border-amber-500/50 transition-colors"
                    >
                      {/* Photo Image - Click to Open Lightbox */}
                      <div 
                        className="relative cursor-pointer aspect-video bg-navy-950"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <img 
                          src={photo.public_url} 
                          alt={photo.image_type || 'Maintenance photo'}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%231e293b" width="400" height="300"/%3E%3Ctext fill="%2364748b" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm font-medium flex items-center gap-2">
                            <Download className="w-4 h-4" /> View Full Size
                          </span>
                        </div>
                        {/* Type Badge */}
                        {photo.image_type && (
                          <span className="absolute top-2 left-2 px-2 py-1 bg-amber-500/90 text-navy-950 text-xs font-bold rounded">
                            {photo.image_type.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Photo Metadata */}
                      <div className="p-4 space-y-3">
                        {/* Date & Time */}
                        <div className="flex items-center gap-2 text-xs text-navy-400">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(photo.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        {/* GPS Coordinates */}
                        {photo.captured_gps_lat && photo.captured_gps_lng && (
                          <div className="flex items-center gap-2 text-xs text-navy-400">
                            <MapPin className="w-3 h-3" />
                            <span className="font-mono">
                              {photo.captured_gps_lat.toFixed(5)}, {photo.captured_gps_lng.toFixed(5)}
                            </span>
                          </div>
                        )}
                        
                        {/* Notes */}
                        {photo.notes && (
                          <p className="text-sm text-navy-300 leading-relaxed border-t border-navy-700 pt-2">
                            {photo.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
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

            {/* Actions */}
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

      {/* 📸 Photo Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-navy-800 hover:bg-navy-700 rounded-full text-white transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Photo Container */}
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* Image */}
            <img 
              src={selectedPhoto.public_url} 
              alt={selectedPhoto.image_type || 'Full size photo'}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Photo Info Bar */}
            <div className="mt-4 bg-navy-900/90 rounded-lg p-4 border border-navy-700">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-navy-300">
                    <span className="text-navy-500">Captured:</span>{' '}
                    {new Date(selectedPhoto.created_at).toLocaleString()}
                  </p>
                  {selectedPhoto.captured_gps_lat && selectedPhoto.captured_gps_lng && (
                    <p className="text-sm text-navy-300 font-mono">
                      <span className="text-navy-500">GPS:</span>{' '}
                      {selectedPhoto.captured_gps_lat.toFixed(5)}, {selectedPhoto.captured_gps_lng.toFixed(5)}
                    </p>
                  )}
                  {selectedPhoto.notes && (
                    <p className="text-sm text-navy-300">
                      <span className="text-navy-500">Notes:</span> {selectedPhoto.notes}
                    </p>
                  )}
                </div>
                
                {/* Download Button */}
                <a
                  href={selectedPhoto.public_url}
                  download={`valve-${asset?.tag_number}-${new Date(selectedPhoto.created_at).toISOString().split('T')[0]}.jpg`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4" />
                  Download Photo
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}