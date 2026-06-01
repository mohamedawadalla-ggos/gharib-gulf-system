'use client';

import { useEffect, useState, useRef, useCallback } from 'react'; // ✅ Added useRef here
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Camera, MapPin, Save, Loader2, AlertCircle, 
  CheckCircle, Edit2, X, Navigation 
} from 'lucide-react';

// Types & Interfaces
interface GPSLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

interface Asset {
  id: string;
  tag_number: string;
  location_code: string | null;
  detailed_location: string | null;
  service_type: string | null;
  condition: 'good' | 'fair' | 'poor' | 'critical' | 'unknown' | null;
  maintenance_status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'unknown' | null;
  repair_status: 'none' | 'minor' | 'major' | 'replacement_needed' | null;
  sct_code: string | null;
  notes: string | null;
  internal_notes: string | null;
  [key: string]: any;
}

interface AssetImageRecord {
  asset_id: string;
  image_url: string;
  public_url?: string;
  image_type: 'completion' | 'inspection' | 'issue';
  captured_gps_lat?: number | null;
  captured_gps_lng?: number | null;
  gps_accuracy?: number | null;
  gps_timestamp?: string | null;
  notes?: string | null;
  uploaded_at?: string;
}

interface TaskExecutionState {
  workOrderItem: any | null;
  asset: Asset | null;
  editedAsset: Partial<Asset> | null;
  isEditing: boolean;
  photo: string | null;
  gps: GPSLocation | null;
  notes: string;
  uploading: boolean;
  error: string | null;
  success: boolean;
  gpsStatus: 'idle' | 'requesting' | 'success' | 'error' | 'denied';
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

// Utility: Image Compression
const compressImage = (
  file: File,
  maxWidth: number,
  quality: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (event) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  });
};

// Main Component
export default function TaskExecution() {
  const params = useParams();
  const router = useRouter();
  const workOrderItemId = params?.id as string | undefined;
  
  const [state, setState] = useState<TaskExecutionState>({
    workOrderItem: null,
    asset: null,
    editedAsset: null,
    isEditing: false,
    photo: null,
    gps: null,
    notes: '',
    uploading: false,
    error: null,
    success: false,
    gpsStatus: 'idle',
    saveStatus: 'idle'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null); // ✅ Now useRef is defined
  const supabase = createClient();

  // Fetch Work Order Item and Asset Details
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!workOrderItemId) {
        setState(prev => ({ ...prev, error: 'No task ID provided' }));
        return;
      }
      
      try {
        // 1️⃣ First, fetch the work_order_item to get the asset_id
        const { data: woiData, error: woiError } = await supabase
          .from('work_order_items')
          .select(`
            id,
            status,
            notes,
            asset_id,
            work_order_id,
            task_description,
            work_orders (
              id,
              title,
              description,
              priority,
              status,
              due_date,
              assigned_crew
            )
          `)
          .eq('id', workOrderItemId)
          .maybeSingle();
          
        if (woiError) {
          console.error('Error fetching work order item:', woiError);
          throw new Error('Failed to load task details');
        }

        if (!woiData) {
          setState(prev => ({ ...prev, error: 'Task not found' }));
          return;
        }

        // 2️⃣ Now fetch the asset using the asset_id from work_order_item
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .select(`
            id,
            tag_number,
            location_code,
            detailed_location,
            service_type,
            condition,
            maintenance_status,
            repair_status,
            sct_code,
            notes,
            internal_notes,
            created_at,
            updated_at
          `)
          .eq('id', woiData.asset_id)
          .maybeSingle();

        if (assetError) {
          console.error('Error fetching asset:', assetError);
          throw new Error('Failed to load asset details');
        }

        if (!assetData) {
          setState(prev => ({ ...prev, error: 'Asset not found. It may have been removed.' }));
          return;
        }

        if (isMounted) {
          setState(prev => ({ 
            ...prev, 
            workOrderItem: woiData,
            asset: assetData,
            editedAsset: { ...assetData },
            error: null 
          }));
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: err.message || 'Failed to load task details. Please check your connection and try again.'
          }));
        }
      }
    }
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [workOrderItemId, supabase]);

  // GPS Location Handler
  const requestGPS = useCallback((): Promise<GPSLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setState(prev => ({ ...prev, gpsStatus: 'error' }));
        resolve(null);
        return;
      }

      setState(prev => ({ ...prev, gpsStatus: 'requesting' }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GPSLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          setState(prev => ({ ...prev, gps: location, gpsStatus: 'success' }));
          resolve(location);
        },
        (err) => {
          console.warn('GPS Error:', err.code, err.message);
          const status = err.code === err.PERMISSION_DENIED ? 'denied' : 'error';
          setState(prev => ({ ...prev, gpsStatus: status }));
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  }, []);

  // Photo Handlers
  const handleTakePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: 'Please select a valid image file' }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setState(prev => ({ ...prev, error: 'Image too large. Please select a smaller file.' }));
      return;
    }

    requestGPS();

    try {
      const compressedImage = await compressImage(file, 1200, 0.75);
      setState(prev => ({ 
        ...prev, 
        photo: compressedImage, 
        error: null 
      }));
    } catch (err: any) {
      console.error('Image processing failed:', err);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to process image. Please try another photo.' 
      }));
    }
    
    e.target.value = '';
  };

  // Edit Handlers
  const handleEditToggle = () => {
    setState(prev => ({
      ...prev,
      isEditing: !prev.isEditing,
      editedAsset: prev.isEditing ? null : { ...prev.asset }
    }));
  };

  const handleAssetFieldChange = (field: keyof Asset, value: any) => {
    setState(prev => ({
      ...prev,
      editedAsset: {
        ...prev.editedAsset,
        [field]: value
      }
    }));
  };

  // Submit Handler
  const handleSubmit = async () => {
    const { photo, notes, gps, editedAsset, asset, workOrderItem } = state;
    
    if (!photo) {
      setState(prev => ({ ...prev, error: 'Please take a photo before completing the task.' }));
      if (navigator.vibrate) navigator.vibrate(100);
      return;
    }
    
    if (!workOrderItemId || !asset?.id) {
      setState(prev => ({ ...prev, error: 'Missing identifiers' }));
      return;
    }

    setState(prev => ({ ...prev, uploading: true, error: null, saveStatus: 'saving' }));
    
    const abortController = new AbortController();
    
    try {
      // Step 1: Upload Photo
      const fileExt = 'jpg';
      const timestamp = Date.now();
      const fileName = `completions/${asset.id}/${timestamp}.${fileExt}`;
      
      const base64Response = await fetch(photo);
      const blob = await base64Response.blob();
      
      const { error: uploadError } = await supabase.storage
        .from('valve-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
          cacheControl: '3600'
        });

      if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('valve-photos')
        .getPublicUrl(fileName);

      // Step 2: Save to asset_images
      const imageRecord: Partial<AssetImageRecord> = {
        asset_id: asset.id,
        image_url: fileName,
        public_url: publicUrl,
        image_type: 'completion',
        captured_gps_lat: gps?.lat ?? null,
        captured_gps_lng: gps?.lng ?? null,
        gps_accuracy: gps?.accuracy ?? null,
        gps_timestamp: gps?.timestamp ? new Date(gps.timestamp).toISOString() : null,
        notes: notes?.trim() || null,
        uploaded_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('asset_images')
        .insert(imageRecord)
        .select()
        .single();

      if (dbError) {
        await supabase.storage.from('valve-photos').remove([fileName]);
        throw new Error(`Failed to save task record: ${dbError.message}`);
      }

      // Step 3: Update Asset
      const updatePayload: Partial<Asset> = {
        maintenance_status: 'completed',
        last_service_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      if (state.isEditing && editedAsset) {
        const editableFields: (keyof Asset)[] = [
          'condition',
          'repair_status', 
          'notes',
          'internal_notes',
          'location_code',
          'detailed_location'
        ];
        
        editableFields.forEach(field => {
          if (editedAsset[field] !== undefined && editedAsset[field] !== asset?.[field]) {
            updatePayload[field] = editedAsset[field];
          }
        });
      }

      const { error: updateError } = await supabase
        .from('assets')
        .update(updatePayload)
        .eq('id', asset.id);

      if (updateError) throw new Error(`Failed to update asset: ${updateError.message}`);

      // Step 4: Update work_order_item status
      const { error: woiUpdateError } = await supabase
        .from('work_order_items')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes?.trim() || null
        })
        .eq('id', workOrderItemId);

      if (woiUpdateError) {
        console.warn('Warning: Failed to update work order item status:', woiUpdateError);
      }

      // Success
      setState(prev => ({ ...prev, success: true, saveStatus: 'saved' }));
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      router.replace('/mobile/tasks?completed=true');
      
    } catch (err: any) {
      console.error('Submission error:', err);
      
      if (!state.success) {
        setState(prev => ({
          ...prev,
          error: err.message || 'An unexpected error occurred.',
          saveStatus: 'error'
        }));
      }
    } finally {
      if (!state.success) {
        setState(prev => ({ ...prev, uploading: false, saveStatus: 'idle' }));
      }
      abortController.abort();
    }
  };

  // Render Helpers
  const getServiceTypeBadge = (serviceType: string | null | undefined) => {
    const types: Record<string, string> = {
      oil: 'bg-amber-100 text-amber-800 border-amber-200',
      water: 'bg-blue-100 text-blue-800 border-blue-200',
      gas: 'bg-red-100 text-red-800 border-red-200',
      steam: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    const key = serviceType?.toLowerCase() || 'other';
    return types[key] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatGPS = (gps: GPSLocation | null) => {
    if (!gps) return null;
    return `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`;
  };

  const conditionOptions = [
    { value: 'good' as const, label: 'Good', color: 'bg-green-100 text-green-800' },
    { value: 'fair' as const, label: 'Fair', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'poor' as const, label: 'Poor', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical' as const, label: 'Critical', color: 'bg-red-100 text-red-800' },
    { value: 'unknown' as const, label: 'Unknown', color: 'bg-gray-100 text-gray-800' }
  ];

  const repairOptions = [
    { value: 'none' as const, label: 'No Repair Needed' },
    { value: 'minor' as const, label: 'Minor Repair' },
    { value: 'major' as const, label: 'Major Repair' },
    { value: 'replacement_needed' as const, label: 'Replacement Needed' }
  ];

  // Loading & Error States
  if (!workOrderItemId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Invalid Task Link</p>
          <p className="text-sm text-gray-500 mt-1">The task identifier is missing.</p>
          <button
            onClick={() => router.push('/mobile/tasks')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Return to Tasks
          </button>
        </div>
      </div>
    );
  }

  if (state.error && !state.asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-medium mb-2">⚠️ Loading Error</p>
          <p className="text-gray-600 text-sm mb-4">{state.error}</p>
          <button
            onClick={() => {
              setState(prev => ({ ...prev, error: null }));
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!state.asset || !state.workOrderItem) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <p className="text-gray-500 text-sm">Loading task details...</p>
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24 max-w-md mx-auto">
      
      {/* Header */}
      <header className="mb-6 flex items-center justify-between sticky top-0 bg-gray-50/95 backdrop-blur-sm py-2 z-10">
        <button 
          onClick={() => router.back()}
          className="text-blue-600 font-medium flex items-center gap-1 hover:text-blue-800 transition-colors active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
        <h1 className="text-lg font-bold text-gray-900">Complete Service</h1>
        <button
          onClick={handleEditToggle}
          className={`p-2 rounded-lg transition ${
            state.isEditing 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-500 hover:bg-gray-100'
          }`}
          aria-label={state.isEditing ? 'Save changes' : 'Edit asset details'}
        >
          {state.isEditing ? <CheckCircle className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
        </button>
      </header>

      {/* Work Order Info */}
      {state.workOrderItem.work_orders && (
        <section className="bg-white p-4 rounded-xl shadow-sm mb-5 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            {state.workOrderItem.work_orders.title}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Priority:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                state.workOrderItem.work_orders.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                state.workOrderItem.work_orders.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                state.workOrderItem.work_orders.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {state.workOrderItem.work_orders.priority?.toUpperCase() || 'NORMAL'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-medium">
                {state.workOrderItem.work_orders.due_date 
                  ? new Date(state.workOrderItem.work_orders.due_date).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
            {state.workOrderItem.work_orders.description && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-700 text-sm">{state.workOrderItem.work_orders.description}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Valve Info Card */}
      <section className="bg-white p-4 rounded-xl shadow-sm mb-5 border border-gray-200">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-2xl font-bold text-blue-900 font-mono tracking-tight">
              {state.asset?.tag_number}
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">ID: {state.asset?.id?.slice(0, 8)}...</p>
          </div>
          <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
            getServiceTypeBadge(state.asset?.service_type)
          }`}>
            {state.asset?.service_type?.toUpperCase() || 'N/A'}
          </span>
        </div>
        
        <div className="space-y-1.5 text-sm">
          <p className="text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <span className="font-medium">{state.asset?.location_code}</span>
          </p>
          {state.asset?.detailed_location && (
            <p className="text-gray-500 text-xs pl-6">{state.asset.detailed_location}</p>
          )}
        </div>
        
        {state.asset?.sct_code && (
          <div className="mt-3 bg-gray-50 p-2.5 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">SCT Code</p>
            <code className="text-sm font-mono text-gray-800 break-all">
              {state.asset.sct_code}
            </code>
          </div>
        )}

        {/* Editable Fields */}
        {state.isEditing && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Update Valve Details
            </h3>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
              <div className="flex flex-wrap gap-2">
                {conditionOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleAssetFieldChange('condition', option.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      state.editedAsset?.condition === option.value
                        ? `${option.color} border-transparent ring-2 ring-blue-500`
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Repair Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Repair Status</label>
              <select
                value={state.editedAsset?.repair_status || ''}
                onChange={(e) => handleAssetFieldChange('repair_status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select...</option>
                {repairOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Location Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location Notes</label>
              <textarea
                value={state.editedAsset?.notes || ''}
                onChange={(e) => handleAssetFieldChange('notes', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                rows={2}
                placeholder="Update location details..."
              />
            </div>
          </div>
        )}
      </section>

      {/* Photo Section */}
      <section className="bg-white p-4 rounded-xl shadow-sm mb-5 border border-gray-200">
        <label className="block font-semibold text-gray-800 mb-3">
          Completion Photo <span className="text-red-500">*</span>
        </label>
        
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef} 
          onChange={handlePhotoChange} 
          className="hidden" 
          aria-hidden="true"
        />
        
        {!state.photo ? (
          <button 
            onClick={handleTakePhoto}
            className="w-full bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 py-8 rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Take photo"
          >
            <Camera className="w-10 h-10" aria-hidden="true" />
            <div className="text-center">
              <span className="font-medium block">Tap to Capture</span>
              <span className="text-xs text-blue-600/80 mt-0.5">Uses rear camera</span>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <img 
                src={state.photo} 
                alt="Preview" 
                className="w-full h-56 object-cover rounded-lg border border-gray-200"
              />
              <button 
                onClick={() => setState(prev => ({ ...prev, photo: null }))}
                className="absolute top-2.5 right-2.5 bg-red-500/90 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm"
              >
                <X className="w-4 h-4" /> Retake
              </button>
            </div>
            
            <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
              state.gpsStatus === 'success' ? 'bg-green-50 text-green-700' :
              state.gpsStatus === 'denied' ? 'bg-orange-50 text-orange-700' :
              'bg-gray-50 text-gray-600'
            }`}>
              <Navigation className="w-4 h-4 mt-0.5" />
              <div>
                {state.gpsStatus === 'success' && state.gps && (
                  <>
                    <span className="font-medium">Location: {formatGPS(state.gps)}</span>
                  </>
                )}
                {state.gpsStatus === 'denied' && 'GPS permission denied'}
                {state.gpsStatus === 'requesting' && 'Acquiring location...'}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Notes */}
      <section className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200">
        <label htmlFor="notes" className="block font-semibold text-gray-800 mb-2">
          Technician Notes
        </label>
        <textarea 
          id="notes"
          value={state.notes}
          onChange={(e) => setState(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
          rows={4}
          placeholder="Any observations..."
          disabled={state.uploading}
        />
      </section>

      {/* Submit */}
      <button 
        onClick={handleSubmit}
        disabled={state.uploading || !state.photo || state.success}
        className={`w-full py-4 rounded-xl font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 ${
          state.success ? 'bg-green-500 text-white' :
          state.uploading ? 'bg-gray-400 text-white' :
          !state.photo ? 'bg-gray-300 text-gray-500' :
          'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {state.success ? (
          <><CheckCircle className="w-5 h-5" /> Task Completed!</>
        ) : state.uploading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</>
        ) : (
          <><Save className="w-5 h-5" /> Complete Task</>
        )}
      </button>

      {state.error && !state.success && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}
    </div>
  );
}