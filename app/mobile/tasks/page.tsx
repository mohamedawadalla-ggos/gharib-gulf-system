'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function MobileTaskList() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchTasks() {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('next_service_date', today)
        .eq('maintenance_status', 'scheduled')
        .order('location_code', { ascending: true });

      if (data) setTasks(data);
      setLoading(false);
    }
    fetchTasks();
  }, []);

  const handleStartTask = (assetId: string) => {
    router.push(`/mobile/task/${assetId}`);
  };

  if (loading) return <div className="p-4 text-center">Loading tasks...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4 text-blue-900">Today's Tasks ({tasks.length})</h1>
      
      {tasks.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          No tasks scheduled for today.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{task.tag_number}</h3>
                  <p className="text-sm text-gray-600">{task.location_code}</p>
                  <p className="text-xs text-gray-500 mt-1">{task.detailed_location}</p>
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    task.service_type === 'oil' ? 'bg-yellow-100 text-yellow-800' :
                    task.service_type === 'water' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.service_type?.toUpperCase()} - {task.sct_code}
                  </span>
                </div>
                <button 
                  onClick={() => handleStartTask(task.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
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