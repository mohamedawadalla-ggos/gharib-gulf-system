'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client'; // Adjust import if needed

export default function TaskExecution() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;
  
  const [asset, setAsset] = useState<any>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [gps, setGps] = useState<{lat: number, lng: number} | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchAsset() {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();
        
      if (data) setAsset(data);
      if (error) console.error("Error fetching asset:", error);
    }
    fetchAsset();
  }, [assetId]);

  const handleTakePhoto = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
      
      // Get GPS Location immediately when photo is taken
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGps({ 
              lat: position.coords.latitude, 
              lng: position.coords.longitude 
            });
          },
          (err) => {
            console.error("GPS Error:", err);
            alert("Could not get GPS location. Please enable location services.");
          }
        );
      } else {
        alert("Geolocation is not supported by this browser.");
      }
    }
  };

  const handleSubmit = async () => {
    if (!photo) {
      alert("Please take a photo before completing the task.");
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      // 1. Upload Photo to Supabase Storage
      // Ensure you have created a bucket named 'valve-photos' in Supabase Storage
      const fileExt = photo.split(';')[0].split('/')[1];
      const fileName = `${assetId}/${Date.now()}.${fileExt}`;
      
      // Convert base64 to blob for upload
      const res = await fetch(photo);
      const blob = await res.blob();
      
      const { error: uploadError } = await supabase.storage
        .from('valve-photos')
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Save Record to asset_images table
      const { error: dbError } = await supabase.from('asset_images').insert({
        asset_id: assetId,
        image_url: fileName,
        image_type: 'completion', // or 'before_maintenance'
        captured_gps_lat: gps?.lat,
        captured_gps_lng: gps?.lng,
        notes: notes
      });

      if (dbError) throw dbError;

      // 3. Update Asset Status in assets table
      const { error: updateError } = await supabase
        .from('assets')
        .update({
          maintenance_status: 'completed',
          last_service_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (updateError) throw updateError;
      
      alert("✅ Task Completed Successfully!");
      router.push('/mobile/tasks'); // Go back to task list
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to complete task");
      alert("Error: " + (err.message || "Failed to complete task"));
    } finally {
      setUploading(false);
    }
  };

  if (!asset) return <div className="p-4 text-center">Loading valve details...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="text-blue-600 font-medium mb-2 flex items-center gap-1"
        >
          ← Back to Tasks
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Service Valve</h1>
        <p className="text-lg text-blue-700 font-mono">{asset.tag_number}</p>
      </div>

      {/* Valve Details Card */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block">Location</span>
            <span className="font-medium text-gray-800">{asset.location_code}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Service Type</span>
            <span className="font-medium text-gray-800 uppercase">{asset.service_type}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500 block">Details</span>
            <span className="font-medium text-gray-800">{asset.detailed_location}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500 block">Specs (SCT)</span>
            <span className="font-medium text-gray-800">{asset.sct_code}</span>
          </div>
        </div>
      </div>

      {/* Photo Capture Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
        <label className="block font-bold text-gray-700 mb-3">Completion Photo</label>
        
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" // Forces rear camera on mobile
          ref={fileInputRef} 
          onChange={handlePhotoChange} 
          className="hidden" 
        />
        
        <button 
          onClick={handleTakePhoto}
          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-4 rounded-lg border-2 border-dashed border-blue-300 mb-4 flex flex-col items-center justify-center gap-2 transition-colors"
        >
          <span className="text-2xl">📸</span>
          <span className="font-medium">Tap to Take Photo</span>
        </button>

        {photo && (
          <div className="mt-4">
            <img src={photo} alt="Preview" className="w-full h-64 object-cover rounded-lg border border-gray-200" />
            {gps ? (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                📍 GPS Captured: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-red-500 mt-2">⚠️ GPS Location not found</p>
            )}
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
        <label className="block font-bold text-gray-700 mb-2">Technician Notes</label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          rows={4}
          placeholder="E.g., Grease fitting replaced, minor leak observed..."
        />
      </div>

      {/* Submit Button */}
      <button 
        onClick={handleSubmit}
        disabled={uploading || !photo}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-4 rounded-xl font-bold text-lg shadow-md transition-all active:scale-[0.98]"
      >
        {uploading ? 'Submitting...' : 'Complete Task'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}