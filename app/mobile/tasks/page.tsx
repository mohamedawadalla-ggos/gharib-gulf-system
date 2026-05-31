// app/mobile/tasks/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { 
  Camera, MapPin, CheckCircle, AlertCircle, Clock,
  ArrowLeft, Upload, X, Loader2
} from 'lucide-react';

const supabase = createSupabaseBrowserClient();

interface TaskAsset {
  id: string;
  tag_number: string;
  location_code: string | null;
  station_code: string | null;
  maintenance_status: string;
  criticality: string;
  condition: string;
}

interface Task {
  id: string;
  asset_id: string;
  work_order_id: string | null;
  assigned_to: string | null;
  status: string;
  due_date: string | null;
  priority: string;
  notes: string | null;
  asset: TaskAsset;
}

export default function MobileTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [taskNotes, setTaskNotes] = useState('');
  const [completionStatus, setCompletionStatus] = useState('completed');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
    requestLocation();
  }, []);

async function fetchTasks() {
  setLoading(true);
  setError(null);
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('🔍 Fetching mobile tasks for date:', today);
    
    // ✅ Fetch from work_order_items (not assets directly!)
    const { data: itemsData, error: itemsError } = await supabase
      .from('work_order_items')
      .select(`
        id,
        status,
        notes,
        asset_id,
        work_order_id,
        completed_at,
        created_at,
        asset:assets_clean!inner (
          id,
          tag_number,
          location_code,
          maintenance_status,
          criticality,
          condition,
          stations (code)
        ),
        work_order:work_orders!inner (
          id,
          priority,
          due_date,
          assigned_crew,
          status as wo_status
        )
      `)
      .eq('status', 'pending')
      .lte('work_order.due_date', today)
      .order('work_order.due_date', { ascending: true });

    if (itemsError) {
      console.error('❌ Work order items error:', itemsError);
      throw itemsError;
    }

    console.log('✅ Fetched work order items:', itemsData?.length || 0);

    // Format the data
    const formattedTasks: Task[] = (itemsData || []).map((item: any) => ({
      id: item.id,
      asset_id: item.asset_id,
      work_order_id: item.work_order_id,
      assigned_to: item.work_order?.assigned_crew,
      status: item.status,
      due_date: item.work_order?.due_date,
      priority: item.work_order?.priority,
      notes: item.notes,
      asset: {
        id: item.asset?.id,
        tag_number: item.asset?.tag_number,
        location_code: item.asset?.location_code,
        station_code: item.asset?.stations?.code,
        maintenance_status: item.asset?.maintenance_status,
        criticality: item.asset?.criticality,
        condition: item.asset?.condition
      }
    }));

    console.log('📋 Formatted tasks:', formattedTasks.length);
    setTasks(formattedTasks);
    
  } catch (err: any) {
    console.error('🚨 Error fetching tasks:', err);
    setError(err.message || 'Failed to load tasks. Please refresh.');
  } finally {
    setLoading(false);
  }
}
  function requestLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => {
          console.warn('Location access denied:', err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }

  function handlePhotoCapture(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function completeTask(taskId: string) {
    if (!selectedTask) return;
    
    setCompleting(taskId);
    setError(null);

    try {
      // 1. Upload photo if exists
      let photoUrl: string | null = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${selectedTask.asset_id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('valve-photos')
          .upload(fileName, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('valve-photos')
          .getPublicUrl(fileName);
        
        photoUrl = publicUrl;
      }

      // 2. Save maintenance photo record
      if (photoUrl) {
        await supabase.from('maintenance_photos').insert({
          asset_id: selectedTask.asset_id,
          url: photoUrl,
          photo_type: completionStatus === 'completed' ? 'after' : 'issue',
          caption: taskNotes || `Task ${completionStatus}`,
          captured_at: new Date().toISOString(),
          gps_coordinates: gpsLocation ? `${gpsLocation.lat}, ${gpsLocation.lng}` : null
        });
      }

      // 3. Update work order item status
      const { error: updateError } = await supabase
        .from('work_order_items')
        .update({
          status: completionStatus,
          notes: taskNotes,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // ✅ Show confirmation alert
      alert(`✅ Task completed successfully!\nAsset: ${selectedTask.asset.tag_number}\nStatus: ${completionStatus}`);

      // 4. Refresh tasks list
      await fetchTasks();
      resetForm();

    } catch (err: any) {
      console.error('Error completing task:', err);
      setError(err.message || 'Failed to complete task');
    } finally {
      setCompleting(null);
    }
  }

  function resetForm() {
    setSelectedTask(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setTaskNotes('');
    setCompletionStatus('completed');
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Done' };
      case 'in_progress': return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Active' };
      default: return { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-navy-300">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 p-4">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-300">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-amber-500 text-navy-950 rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Task Detail Modal
  if (selectedTask) {
    return (
      <div className="min-h-screen bg-navy-950 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={resetForm} className="p-2 hover:bg-navy-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-amber-400">{selectedTask.asset.tag_number}</h1>
              <p className="text-sm text-navy-300">{selectedTask.asset.station_code || 'Unknown Station'}</p>
            </div>
          </div>

          {/* Asset Info */}
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-navy-400">Location</p>
                <p className="text-navy-100 font-medium">{selectedTask.asset.location_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-navy-400">Condition</p>
                <p className={`font-medium ${selectedTask.asset.condition === 'good' ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedTask.asset.condition}
                </p>
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-4 mb-4">
            <label className="block text-sm text-navy-300 mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" />
              Upload Photo (Required)
            </label>
            
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-navy-600 rounded-lg cursor-pointer hover:border-amber-500 transition">
                <Upload className="w-6 h-6 text-navy-400 mb-2" />
                <span className="text-sm text-navy-300">Tap to take photo</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
              </label>
            )}
          </div>

          {/* Notes - ✅ FIXED: Darker text color */}
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-4 mb-4">
            <label className="block text-sm text-navy-300 mb-2">Notes</label>
            <textarea
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="Add notes about this maintenance..."
              // ✅ FIXED: text-navy-100 (bright white) + placeholder-navy-500 + font-medium
              className="w-full p-3 bg-navy-800 border border-navy-600 rounded-lg text-sm text-navy-100 placeholder-navy-500 font-medium focus:outline-none focus:border-amber-500 min-h-[100px]"
            />
          </div>

          {/* Completion Status */}
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-4 mb-4">
            <label className="block text-sm text-navy-300 mb-2">Task Result</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCompletionStatus('completed')}
                className={`p-3 rounded-lg border transition ${
                  completionStatus === 'completed'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-navy-800 border-navy-600 text-navy-300 hover:bg-navy-700'
                }`}
              >
                <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Completed</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletionStatus('issue_found')}
                className={`p-3 rounded-lg border transition ${
                  completionStatus === 'issue_found'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-navy-800 border-navy-600 text-navy-300 hover:bg-navy-700'
                }`}
              >
                <AlertCircle className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Issue Found</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => completeTask(selectedTask.id)}
            disabled={completing === selectedTask.id || !photoFile}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-navy-950 rounded-lg font-bold transition flex items-center justify-center gap-2"
          >
            {completing === selectedTask.id ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Completing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" /> Complete Task
              </>
            )}
          </button>

          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
        </div>
      </div>
    );
  }

  // Tasks List View
  return (
    <div className="min-h-screen bg-navy-950 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-amber-400">Today's Tasks</h1>
          <button onClick={fetchTasks} className="p-2 hover:bg-navy-800 rounded-lg">
            <Clock className="w-5 h-5" />
          </button>
        </div>

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-navy-300">All tasks completed! 🎉</p>
            <button onClick={() => router.push('/dashboard')} className="mt-4 px-4 py-2 bg-amber-500 text-navy-950 rounded-lg">
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const statusConfig = getStatusBadge(task.status);
              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="w-full text-left bg-navy-900 hover:bg-navy-800 border border-navy-700 rounded-lg p-4 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-amber-400 font-bold">{task.asset.tag_number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-navy-300">{task.asset.station_code || 'Unknown Station'}</p>
                      {task.asset.location_code && (
                        <p className="text-xs text-navy-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {task.asset.location_code}
                        </p>
                      )}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded font-bold ${
                      task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                      task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-navy-700 text-navy-300'
                    }`}>
                      {task.priority?.toUpperCase()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}