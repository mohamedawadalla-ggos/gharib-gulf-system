// app/dashboard/page.legacy.tsx
'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Wrench
} from 'lucide-react';

const supabase = createSupabaseBrowserClient();

export default function DashboardLegacy() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id, status, condition');

      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('id, status, priority, due_date');

      if (assetsError) throw assetsError;
      if (woError) throw woError;

      const kpis = {
        total_assets: assets?.length || 0,
        overdue_count: workOrders?.filter((wo: any) => wo.due_date < new Date().toISOString().split('T')[0] && wo.status !== 'completed').length || 0,
        due_soon_count: workOrders?.filter((wo: any) => wo.status === 'pending' || wo.status === 'assigned').length || 0,
      };

      setDashboardData({ kpis, workOrders });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 p-6">
        <div className="max-w-md mx-auto bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
          <p className="text-navy-300 mb-4">{error}</p>
          <button onClick={fetchDashboardData} className="px-4 py-2 bg-amber-500 text-navy-950 rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard (Legacy)</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-navy-900 p-4 rounded-lg border border-navy-700">
            <div className="flex items-center gap-2 text-navy-400 mb-2">
              <Package className="w-5 h-5" />
              <span>Total Assets</span>
            </div>
            <div className="text-2xl font-bold">{dashboardData?.kpis.total_assets || 0}</div>
          </div>
          
          <div className="bg-navy-900 p-4 rounded-lg border border-navy-700">
            <div className="flex items-center gap-2 text-navy-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Overdue</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{dashboardData?.kpis.overdue_count || 0}</div>
          </div>
          
          <div className="bg-navy-900 p-4 rounded-lg border border-navy-700">
            <div className="flex items-center gap-2 text-navy-400 mb-2">
              <Clock className="w-5 h-5" />
              <span>Pending</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">{dashboardData?.kpis.due_soon_count || 0}</div>
          </div>
        </div>

        <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Work Orders</h2>
          <div className="text-navy-400">
            Legacy dashboard content - replace with your actual dashboard code
          </div>
        </div>
      </div>
    </div>
  );
}