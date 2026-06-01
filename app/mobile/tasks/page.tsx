'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle, Calendar, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// --- Types ---
interface Station {
  code: string | null;
}

interface Asset {
  id: string;
  tag_number: string;
  location_code: string | null;
  maintenance_status: string | null;
  criticality: string | null;
  condition: string | null;
  stations: Station | null;
}

interface WorkOrder {
  id: string;
  title?: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  assigned_crew: string | null;
  status: string | null;
}

interface Task {
  id: string;
  status: string;
  notes: string | null;
  asset_id: string | null;
  work_order_id: string | null;
  completed_at: string | null;
  created_at: string;
  asset: Asset | null;
  work_order: WorkOrder | null;
}

export default function MobileTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        setError(null);
        
        // ✅ Dynamic date: today in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
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
              title,
              priority,
              due_date,
              assigned_crew,
              status
            )
          `)
          .eq('status', 'pending')
          // ✅ Dynamic filter: tasks due today or earlier
          .lte('work_order.due_date', today)
          // ✅ Order by due_date ascending (soonest first)
          .order('due_date', { 
            foreignTable: 'work_order', 
            ascending: true,
            nullsFirst: false 
          });

        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }
        
        console.log('✅ Tasks fetched:', data?.length || 0);
        setTasks(data || []);
        
      } catch (err: any) {
        console.error('❌ Error fetching tasks:', {
          message: err?.message,
          details: err?.details,
          hint: err?.hint,
          code: err?.code
        });
        setError(err?.message || 'Failed to load tasks. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [supabase]);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-500 text-sm font-medium">Loading tasks...</p>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-xl shadow-sm p-6 max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-4 break-all">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // --- Main UI ---
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mobile Tasks</h1>
            <p className="text-xs text-gray-500 mt-0.5">{tasks.length} pending assignments</p>
          </div>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
      </header>

      {/* Task List */}
      <main className="p-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-900">All caught up!</h3>
            <p className="text-gray-500 text-sm mt-1">No pending tasks assigned to you right now.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <Link
              key={task.id}
              href={`/mobile/tasks/${task.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.99]"
            >
              {/* Top Row: Title & Priority */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 pr-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">
                    {task.work_order?.title || 'Untitled Task'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {task.work_order?.due_date ? new Date(task.work_order.due_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                  task.work_order?.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                  task.work_order?.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  task.work_order?.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {task.work_order?.priority?.toUpperCase() || 'NORMAL'}
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 my-2" />

              {/* Bottom Row: Asset Info */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  {task.asset?.tag_number && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono text-xs font-medium">{task.asset.tag_number}</span>
                    </div>
                  )}
                  {task.asset?.location_code && (
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">
                      {task.asset.location_code}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}