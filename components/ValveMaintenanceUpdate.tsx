'use client';

import { useState, useRef, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import { 
  Camera, Upload, Save, X, MapPin, Calendar, 
  User, AlertCircle, CheckCircle, Image as ImageIcon 
} from 'lucide-react';

const supabase = createSupabaseBrowserClient();

interface ValveMaintenanceUpdateProps {
  workOrderId: string;
  assetId: string;
  assetData?: any;
  onComplete?: () => void;
}

export default function ValveMaintenanceUpdate({ 
  workOrderId, 
  assetId, 
  assetData,
  onComplete 
}: ValveMaintenanceUpdateProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Array<{
    file: File | string;
    preview: string;
    type: 'before' | 'during' | 'after' | 'issue';
    caption: string;
  }>>([]);
  
  // Form state - compare recorded vs actual
  const [formData, setFormData] = useState({
    // Recorded (from database)
    recorded_tag_number: assetData?.tag_number || '',
    recorded_location: assetData?.location_code || '',
    recorded_sct_code: assetData?.sct_code || '',
    recorded_manufacturer: assetData?.manufacturer || '',
    recorded_condition: assetData?.condition || '',
    
    // Actual (what worker observes)
    actual_tag_number: assetData?.tag_number || '',
    actual_location: assetData?.location_code || '',
    actual_sct_code: assetData?.sct_code || '',
    actual_manufacturer: assetData?.manufacturer || '',
    actual_condition: assetData?.condition || '',
    
    // Maintenance details
    maintenance_notes: '',
    issues_found: [] as string[],
    actions_taken: [] as string[],
  });

  const [gpsLocation, setGpsLocation] = useState<{lat: number, lng: number} | null>(null);

  // Get GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('GPS not available:', error);
        }
      );
    }
  }, []);

  // Handle photo capture/upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'during' | 'after' | 'issue') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos([...photos, {
        file,
        preview: reader.result as string,
        type,
        caption: ''
      }]);
    };
    reader.readAsDataURL(file);
  };

  // Remove photo
  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Update photo caption
  const updatePhotoCaption = (index: number, caption: string) => {
    const newPhotos = [...photos];
    newPhotos[index].caption = caption;
    setPhotos(newPhotos);
  };

  // Check for changes
  const hasChanges = () => {
    return (
      formData.recorded_tag_number !== formData.actual_tag_number ||
      formData.recorded_location !== formData.actual_location ||
      formData.recorded_sct_code !== formData.actual_sct_code ||
      formData.recorded_manufacturer !== formData.actual_manufacturer ||
      formData.recorded_condition !== formData.actual_condition ||
      formData.maintenance_notes.trim() !== '' ||
      photos.length > 0
    );
  };

  // Submit maintenance update
  const handleSubmit = async () => {
    if (!hasChanges()) {
      showToast('No changes detected', 'info');
      return;
    }

    setLoading(true);
    try {
      // 1. Create maintenance update record
      const { data: update, error: updateError } = await supabase
        .from('valve_maintenance_updates')
        .insert({
          work_order_id: workOrderId,
          asset_id: assetId,
          recorded_tag_number: formData.recorded_tag_number,
          actual_tag_number: formData.actual_tag_number,
          recorded_location: formData.recorded_location,
          actual_location: formData.actual_location,
          recorded_sct_code: formData.recorded_sct_code,
          actual_sct_code: formData.actual_sct_code,
          recorded_manufacturer: formData.recorded_manufacturer,
          actual_manufacturer: formData.actual_manufacturer,
          recorded_condition: formData.recorded_condition,
          actual_condition: formData.actual_condition,
          maintenance_notes: formData.maintenance_notes,
          issues_found: formData.issues_found,
          actions_taken: formData.actions_taken,
          status: 'pending_review'
        })
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. Upload photos
      if (photos.length > 0) {
        setUploading(true);
        for (const photo of photos) {
          const fileExt = typeof photo.file === 'string' ? 'jpg' : photo.file.name.split('.').pop();
          const fileName = `${update.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          let blob: Blob;
          if (typeof photo.file === 'string') {
            const response = await fetch(photo.file);
            blob = await response.blob();
          } else {
            blob = photo.file;
          }

          const { error: uploadError } = await supabase.storage
            .from('maintenance-photos')
            .upload(fileName, blob, {
              contentType: `image/${fileExt}`,
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('maintenance-photos')
            .getPublicUrl(fileName);

          // Save photo record
          await supabase.from('maintenance_photos').insert({
            maintenance_update_id: update.id,
            photo_url: urlData.publicUrl,
            photo_type: photo.type,
            caption: photo.caption,
            gps_lat: gpsLocation?.lat,
            gps_lng: gpsLocation?.lng
          });
        }
        setUploading(false);
      }

      // 3. Update asset with actual values (if changed)
      const assetUpdates: any = {};
      if (formData.actual_tag_number !== formData.recorded_tag_number) {
        assetUpdates.tag_number = formData.actual_tag_number;
      }
      if (formData.actual_location !== formData.recorded_location) {
        assetUpdates.location_code = formData.actual_location;
      }
      if (formData.actual_sct_code !== formData.recorded_sct_code) {
        assetUpdates.sct_code = formData.actual_sct_code;
      }
      if (formData.actual_manufacturer !== formData.recorded_manufacturer) {
        assetUpdates.manufacturer = formData.actual_manufacturer;
      }
      if (formData.actual_condition !== formData.recorded_condition) {
        assetUpdates.condition = formData.actual_condition;
      }
      assetUpdates.last_service_date = new Date().toISOString().split('T')[0];
      assetUpdates.maintenance_status = 'up_to_date';

      if (Object.keys(assetUpdates).length > 0) {
        await supabase
          .from('assets')
          .update(assetUpdates)
          .eq('id', assetId);
      }

      showToast('Maintenance update saved successfully!', 'success');
      
      if (onComplete) onComplete();
      
    } catch (error: any) {
      console.error('Error saving maintenance update:', error);
      showToast('Failed to save: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-navy-900 rounded-lg border border-navy-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Maintenance Update
        </h3>
        {gpsLocation && (
          <span className="text-xs text-navy-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            GPS Captured
          </span>
        )}
      </div>

      {/* Data Comparison Section */}
      <div className="space-y-4">
        <h4 className="font-semibold text-navy-200">Data Verification</h4>
        
        {/* Tag Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-navy-400 mb-1">Recorded Tag Number</label>
            <input
              type="text"
              value={formData.recorded_tag_number}
              disabled
              className="w-full p-2 bg-navy-800/50 border border-navy-700 rounded text-navy-400"
            />
          </div>
          <div>
            <label className="block text-xs text-navy-400 mb-1">Actual Tag Number</label>
            <input
              type="text"
              value={formData.actual_tag_number}
              onChange={(e) => setFormData({...formData, actual_tag_number: e.target.value})}
              className="w-full p-2 bg-navy-800 border border-navy-600 rounded focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-navy-400 mb-1">Recorded Location</label>
            <input
              type="text"
              value={formData.recorded_location}
              disabled
              className="w-full p-2 bg-navy-800/50 border border-navy-700 rounded text-navy-400"
            />
          </div>
          <div>
            <label className="block text-xs text-navy-400 mb-1">Actual Location</label>
            <input
              type="text"
              value={formData.actual_location}
              onChange={(e) => setFormData({...formData, actual_location: e.target.value})}
              className="w-full p-2 bg-navy-800 border border-navy-600 rounded focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* SCT Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-navy-400 mb-1">Recorded SCT Code</label>
            <input
              type="text"
              value={formData.recorded_sct_code}
              disabled
              className="w-full p-2 bg-navy-800/50 border border-navy-700 rounded text-navy-400"
            />
          </div>
          <div>
            <label className="block text-xs text-navy-400 mb-1">Actual SCT Code</label>
            <input
              type="text"
              value={formData.actual_sct_code}
              onChange={(e) => setFormData({...formData, actual_sct_code: e.target.value})}
              className="w-full p-2 bg-navy-800 border border-navy-600 rounded focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-navy-400 mb-1">Recorded Condition</label>
            <select
              value={formData.recorded_condition}
              disabled
              className="w-full p-2 bg-navy-800/50 border border-navy-700 rounded text-navy-400"
            >
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-navy-400 mb-1">Actual Condition</label>
            <select
              value={formData.actual_condition}
              onChange={(e) => setFormData({...formData, actual_condition: e.target.value})}
              className="w-full p-2 bg-navy-800 border border-navy-600 rounded focus:outline-none focus:border-amber-400"
            >
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Maintenance Notes */}
      <div>
        <label className="block text-xs text-navy-400 mb-1">Maintenance Notes</label>
        <textarea
          value={formData.maintenance_notes}
          onChange={(e) => setFormData({...formData, maintenance_notes: e.target.value})}
          rows={3}
          placeholder="Describe work performed, observations, etc..."
          className="w-full p-3 bg-navy-800 border border-navy-600 rounded focus:outline-none focus:border-amber-400"
        />
      </div>

      {/* Photo Upload Section */}
      <div>
        <h4 className="font-semibold text-navy-200 mb-3">Photos</h4>
        
        {/* Photo type buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['before', 'during', 'after', 'issue'] as const).map((type) => (
            <label key={type} className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, type)}
                className="hidden"
              />
              <div className="px-3 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-600 rounded text-xs flex items-center gap-2">
                <Camera className="w-3 h-3" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </div>
            </label>
          ))}
        </div>

        {/* Photo previews */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative bg-navy-800 rounded-lg overflow-hidden">
                <img 
                  src={photo.preview} 
                  alt={photo.type}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 bg-amber-500 text-navy-950 text-xs rounded">
                    {photo.type}
                  </span>
                </div>
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
                <input
                  type="text"
                  placeholder="Add caption..."
                  value={photo.caption}
                  onChange={(e) => updatePhotoCaption(index, e.target.value)}
                  className="w-full p-2 bg-navy-900/80 text-xs mt-20"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading || uploading || !hasChanges()}
          className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-navy-950 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          {loading || uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-navy-950" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Maintenance Update
            </>
          )}
        </button>
      </div>
    </div>
  );
}