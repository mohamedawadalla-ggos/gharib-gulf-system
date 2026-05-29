'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client'; // Ensure this path matches your setup

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
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();

  // Fetch Asset Details on Load
  useEffect(() => {
    async function fetchAsset() {
      if (!assetId) return;
      
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();
        
      if (data) setAsset(data);
      if (error) {
        console.error("Error fetching asset:", error);
        setError("Failed to load valve details. Please try again.");
      }
    }
    fetchAsset();
  }, [assetId]);

  // Handle Photo Capture & Compression
  const handleTakePhoto = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Get GPS Location immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGps({ 
            lat: position.coords.latitude, 
            lng: position.coords.longitude 
          });
        },
        (err) => {
          console.warn("GPS Error:", err);
          // We don't block photo capture if GPS fails, but we warn the user later
        }
      );
    }

    // 2. Compress Image (Simple Canvas Resize)
    try {
      const compressedImage = await compressImage(file, 800, 0.7); // Max width 800px, quality 0.7
      setPhoto(compressedImage);
      setError(null);
    } catch (err) {
      console.error("Image compression failed:", err);
      setError("Failed to process image. Please try another photo.");
    }
  };

  // Helper: Compress Image using Canvas
  const compressImage = (file: File, maxWidth: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with quality setting
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Image load error'));
      };
      reader.onerror = () => reject(new Error('File read error'));
    });
  };

  // Submit Task
  const handleSubmit = async () => {
    if (!photo) {
      alert("Please take a photo before completing the task.");
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      // 1. Upload Photo to Supabase Storage
      // Ensure bucket 'valve-photos' exists and has public/insert policies
      const fileExt = 'jpg'; // Since we compress to JPEG
      const fileName = `${assetId}/${Date.now()}.${fileExt}`;
      
      // Convert base64 to blob
      const res = await fetch(photo);
      const blob = await res.blob();
      
      const { error: uploadError } = await supabase.storage
        .from('valve-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // 2. Save Record to asset_images table
      const { error: dbError } = await supabase.from('asset_images').insert({
        asset_id: assetId,
        image_url: fileName,
        image_type: 'completion',
        captured_gps_lat: gps?.lat || null,
        captured_gps_lng: gps?.lng || null,
        notes: notes || null
      });

      if (dbError) throw new Error(`Database error: ${dbError.message}`);

      // 3. Update Asset Status in assets table
      const today = new Date().toISOString().split('T')[0];
      const { error: updateError } = await supabase
        .from('assets')
        .update({
          maintenance_status: 'completed',
          last_service_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (updateError) throw new Error(`Status update failed: ${updateError.message}`);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/mobile/tasks');
      }, 1500); // Wait 1.5s so user sees success message
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setUploading(false);
    }
  };

  if (!asset && !error) return <div className="p-8 text-center text-gray-500">Loading valve details...</div>;
  if (error && !asset) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="text-blue-600 font-medium flex items-center gap-1 hover:text-blue-800"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-900">Service Valve</h1>
      </div>

      {/* Valve Info Card */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-2xl font-bold text-blue-900 font-mono">{asset?.tag_number}</h2>
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            asset?.service_type === 'oil' ? 'bg-yellow-100 text-yellow-800' :
            asset?.service_type === 'water' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {asset?.service_type?.toUpperCase()}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-1">📍 {asset?.location_code}</p>
        <p className="text-gray-500 text-xs mb-2">{asset?.detailed_location}</p>
        <div className="bg-gray-50 p-2 rounded text-xs font-mono text-gray-700 break-all">
          SCT: {asset?.sct_code}
        </div>
      </div>

      {/* Photo Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200">
        <label className="block font-bold text-gray-700 mb-3">Completion Photo</label>
        
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef} 
          onChange={handlePhotoChange} 
          className="hidden" 
        />
        
        {!photo ? (
          <button 
            onClick={handleTakePhoto}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-6 rounded-lg border-2 border-dashed border-blue-300 flex flex-col items-center justify-center gap-2 transition-colors"
          >
            <span className="text-3xl">📸</span>
            <span className="font-medium">Tap to Take Photo</span>
          </button>
        ) : (
          <div className="relative">
            <img src={photo} alt="Preview" className="w-full h-64 object-cover rounded-lg border border-gray-200" />
            <button 
              onClick={() => setPhoto(null)}
              className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold"
            >
              Retake
            </button>
            {gps ? (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1 bg-green-50 p-1 rounded">
                ✅ GPS Captured: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
              </p>
            ) : (
              <p className="text-xs text-orange-600 mt-2 flex items-center gap-1 bg-orange-50 p-1 rounded">
                ⚠️ GPS not available. Note location manually.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200">
        <label className="block font-bold text-gray-700 mb-2">Technician Notes</label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
          rows={3}
          placeholder="Any issues? (e.g., Leaking, stuck handwheel)"
        />
      </div>

      {/* Submit Button */}
      <button 
        onClick={handleSubmit}
        disabled={uploading || !photo || success}
        className={`w-full py-4 rounded-xl font-bold text-lg shadow-md transition-all active:scale-[0.98] ${
          success 
            ? 'bg-green-500 text-white cursor-default' 
            : uploading 
              ? 'bg-gray-400 text-white cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {success ? '✅ Completed!' : uploading ? 'Submitting...' : 'Complete Task'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}