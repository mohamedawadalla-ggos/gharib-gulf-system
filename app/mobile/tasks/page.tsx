'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Adjust path if your client is elsewhere
import { Loader2, AlertCircle, Calendar, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// --- Types ---
interface WorkOrder {
  id: string;
  title: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface Asset {
  id: string;
  tag_number: string;
  location_code: string | null;
}

interface Task {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  work_orders: WorkOrder | null;
  assets: Asset | null;
}

export default function MobileTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize Supabase client
  const supabase = createClient();

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        
        // ✅ CORRECTED SUPABASE QUERY
        // The previous error `PGRST100` occurred because of incorrect foreign table ordering syntax.
        // Use `.order('column', { foreignTable: 'table_name', ascending: true })` instead of dot notation.
        const { data, error: queryError } = await supabase
          .from('work_order_items')
          .select(`
            id,
            status,
            notes,
            created_at,
            work_orders!inner (
              id,
              title,
              due_date,
              priority
            ),
            assets!inner (
              id,
              tag_number,
              location_code
            )
          `)
          .eq('status', 'pending')
          .order('due_date', { foreignTable: 'work_orders', ascending: true }) // ✅ FIXED ORDERING
          .limit(50);

        if (queryError) throw queryError;
        setTasks(data || []);
      } catch (err: any) {
        console.error(' Error fetching tasks:', err);
        setError(err.message || 'Failed to load tasks. Please check your connection.');
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
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
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
                    {task.work_orders?.title || 'Untitled Task'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {task.work_orders?.due_date ? new Date(task.work_orders.due_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                  task.work_orders?.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                  task.work_orders?.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  task.work_orders?.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {task.work_orders?.priority || 'Normal'}
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 my-2" />

              {/* Bottom Row: Asset Info */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  {task.assets?.tag_number && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono text-xs font-medium">{task.assets.tag_number}</span>
                    </div>
                  )}
                  {task.assets?.location_code && (
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">
                      {task.assets.location_code}
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