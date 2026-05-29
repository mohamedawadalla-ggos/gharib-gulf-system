'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// ️ IMPORTANT: Ensure this path matches your actual Supabase client file
// If your file exports 'createClient', change it back. 
// If it exports 'createSupabaseBrowserClient', keep it as is.
import { createSupabaseBrowserClient } from '@/lib/supabase/client'; 

export default function MobileTaskList() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

 useEffect(() => {
  async function fetchTasks() {
    try {
      setLoading(true);
      setError(null);

      // Get today's start and end in UTC to match Supabase
      const now = new Date();
      
      // Create a date object for today at 00:00:00 UTC
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      
      // Create a date object for tomorrow at 00:00:00 UTC
      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

      // Format them as YYYY-MM-DD strings for Supabase
      const startDateStr = startOfDay.toISOString().split('T')[0];
      const endDateStr = endOfDay.toISOString().split('T')[0];

      console.log("📅 Fetching tasks between:", startDateStr, "and", endDateStr);

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .gte('next_service_date', startDateStr) // Greater than or equal to Today 00:00
        .lt('next_service_date', endDateStr)    // Less than Tomorrow 00:00
        .eq('maintenance_status', 'scheduled')
        .order('location_code', { ascending: true });

      if (error) throw error;

      console.log("✅ Fetched Data Count:", data?.length || 0);
      setTasks(data || []);

    } catch (err: any) {
      console.error("❌ Error fetching tasks:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  fetchTasks();
}, []);

  const handleStartTask = (assetId: string) => {
    router.push(`/mobile/task/${assetId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-blue-600 font-medium animate-pulse">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 bg-red-50 text-red-700">
        <h2 className="font-bold text-lg mb-2">Error Loading Tasks</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-blue-900">Today's Tasks</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString()}</p>
      </div>

      {/* Task Count Badge */}
      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full inline-block mb-4 text-sm font-semibold">
        {tasks.length} Valve{tasks.length !== 1 ? 's' : ''} Scheduled
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-medium text-gray-700">No tasks scheduled for today</h3>
          <p className="text-gray-500 text-sm mt-1">Check back tomorrow or contact your supervisor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  {/* Tag Number */}
                  <h3 className="font-bold text-lg text-gray-900">
                    {task.tag_number}
                  </h3>
                  
                  {/* Location */}
                  <p className="text-sm text-gray-600 font-medium mt-1">
                    📍 {task.location_code}
                  </p>
                  
                  {/* Detailed Location */}
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {task.detailed_location}
                  </p>

                  {/* Service Type & SCT Badge */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`px-2 py-1 text-xs rounded-md font-medium border ${
                      task.service_type === 'oil' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      task.service_type === 'water' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      task.service_type === 'gas' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {task.service_type?.toUpperCase() || 'N/A'}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                      {task.sct_code}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={() => handleStartTask(task.id)}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}