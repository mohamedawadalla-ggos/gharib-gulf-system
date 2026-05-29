'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';

export default function TaskExecution() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;
  const [asset, setAsset] = useState<any>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [gps, setGps] = useState<{lat: number, lng: number} | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAsset() {
      const { data } = await supabase.from('assets').select('*').eq('id', assetId).single();
      if (data) setAsset(data);
    }
    fetchAsset();
  }, [assetId]);

  const handleTakePhoto = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
      
      // Get GPS Location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => setGps({ lat: position.coords.latitude, lng: position.coords.longitude }),
          (error) => console.error("GPS Error:", error)
        );
      }
    }
  };

  const handleSubmit = async () => {
    if (!photo || !gps) {
      alert("Please take a photo and enable location services.");
      return;
    }
    
    setUploading(true);
    
    // 1. Upload Photo to Storage
    const fileName = `${assetId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('valve-photos')
      .upload(fileName, await fetch(photo).then(res => res.blob()));

    if (uploadError) {
      alert("Failed to upload photo");
      setUploading(false);
      return;
    }

    // 2. Save Record to asset_images table
    const { error: dbError } = await supabase.from('asset_images').insert({
      asset_id: assetId,
      image_url: fileName,
      image_type: 'completion',
      captured_gps_lat: gps.lat,
      captured_gps_lng: gps.lng,
      notes: notes
    });

    // 3. Update Asset Status
    if (!dbError) {
      await supabase.from('assets').update({
        maintenance_status: 'completed',
        last_service_date: new Date().toISOString().split('T')[0]
      }).eq('id', assetId);
      
      alert("Task Completed Successfully!");
      router.push('/mobile/tasks');
    } else {
      alert("Failed to save record");
    }
    setUploading(false);
  };

  if (!asset) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-bold mb-4">Service Valve: {asset.tag_number}</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <p><strong>Location:</strong> {asset.location_code}</p>
        <p><strong>Details:</strong> {asset.detailed_location}</p>
        <p><strong>Type:</strong> {asset.sct_code}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <label className="block font-medium mb-2">Completion Photo</label>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef} 
          onChange={handlePhotoChange} 
          className="hidden" 
        />
        <button 
          onClick={handleTakePhoto}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-md mb-2"
        >
          📸 Take Photo
        </button>
        {photo && <img src={photo} alt="Preview" className="w-full h-48 object-cover rounded-md" />}
        {gps && <p className="text-xs text-green-600 mt-2">📍 GPS Captured: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}</p>}
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <label className="block font-medium mb-2">Notes</label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border p-2 rounded-md"
          rows={3}
          placeholder="Any issues or observations..."
        />
      </div>

      <button 
        onClick={handleSubmit}
        disabled={uploading || !photo}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-md font-bold disabled:bg-gray-400"
      >
        {uploading ? 'Submitting...' : 'Complete Task'}
      </button>
    </div>
  );
}