'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';

interface Asset {
  id: string;
  tag_number: string;
  location_code: string;
  maintenance_status: string;
  condition: string;
  stations?: {
    code: string;
  };
}

interface WorkOrder {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date: string;
  assigned_crew: string | null;
  statusaswo_status: string;
}

interface WorkOrderItem {
  id: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes: string | null;
  asset_id: string;
  work_order_id: string;
  completed_at: string | null;
  created_at: string;
  asset: Asset;
  work_order: WorkOrder;
}

export default function MobileTasksPage() {
  const [tasks, setTasks] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  const supabase = createClient();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
// Fetch data without ordering by joined field
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
    asset:assets_clean!inner(id, tag_number, location_code, maintenance_status, criticality, condition, stations(code)),
    work_order:work_orders!inner(id, priority, due_date, assigned_crew, status)
  `)
  .eq('status', 'pending')
  .lte('work_order.due_date', '2026-05-31');

// Sort client-side after fetching
if (data) {
  data.sort((a, b) => new Date(a.work_order.due_date) - new Date(b.work_order.due_date));
}
        .eq('status', 'pending')
        .lte('work_order.due_date', new Date().toISOString().split('T')[0]);

      if (queryError) throw queryError;

      // Client-side sorting by due_date since Supabase order doesn't support nested table ordering directly
      const sortedData = data?.sort((a, b) => {
        return new Date(a.work_order.due_date).getTime() - 
               new Date(b.work_order.due_date).getTime();
      }) || [];

      setTasks(sortedData);
    } catch (err: any) {
      console.error('🚨 Error fetching tasks:', err);
      setError(err.message || 'فشل في تحميل المهام');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      in_progress: 'جاري التنفيذ',
      completed: 'مكتمل'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredTasks = tasks.filter(task => 
    filter === 'all' ? true : task.status === filter
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المهام...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
          <p className="text-red-600 font-medium mb-2">خطأ في التحميل</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchTasks}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">المهام الميدانية</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredTasks.length} مهمة {filter !== 'all' && `(${getStatusLabel(filter)})`}
          </p>
        </div>
        
        {/* Filter Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'الكل' : getStatusLabel(f)}
            </button>
          ))}
        </div>
      </header>

      {/* Tasks List */}
      <main className="px-4 py-4 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد مهام لعرضها</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <article
              key={task.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 active:scale-[0.99] transition-transform"
            >
              {/* Priority Indicator */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.work_order.priority)}`}></span>
                  <span className="text-xs font-medium text-gray-500">
                    {task.work_order.priority === 'critical' && 'حرج'}
                    {task.work_order.priority === 'high' && 'عالي'}
                    {task.work_order.priority === 'medium' && 'متوسط'}
                    {task.work_order.priority === 'low' && 'منخفض'}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
              </div>

              {/* Asset Info */}
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {task.asset.tag_number}
                </h3>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>📍 {task.asset.location_code}</span>
                  {task.asset.stations?.code && (
                    <span>🏭 {task.asset.stations.code}</span>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-2 text-sm mb-3">
                <span className="text-gray-400">📅</span>
                <span className={
                  new Date(task.work_order.due_date) < new Date() 
                    ? 'text-red-600 font-medium' 
                    : 'text-gray-600'
                }>
                  {format(new Date(task.work_order.due_date), 'dd MMMM yyyy', { locale: arEG })}
                </span>
                {new Date(task.work_order.due_date) < new Date() && task.status === 'pending' && (
                  <span className="text-red-500 text-xs font-medium">متأخر</span>
                )}
              </div>

              {/* Notes */}
              {task.notes && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-3 line-clamp-2">
                  {task.notes}
                </p>
              )}

              {/* Action Button */}
              <button
                onClick={() => {
                  // Navigate to task details or start work
                  console.log('Start task:', task.id);
                }}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition"
              >
                {task.status === 'pending' ? 'بدء المهمة' : 'عرض التفاصيل'}
              </button>
            </article>
          ))
        )}
      </main>

      {/* Refresh Button (Floating) */}
      <button
        onClick={fetchTasks}
        className="fixed bottom-6 left-6 bg-white p-3 rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition active:scale-95"
        aria-label="تحديث"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}