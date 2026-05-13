// app/dashboard/page.new.tsx
'use client';

import { useEffect, useState } from 'react';
import { useUserRole } from '@/lib/useUserRole';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Package, AlertTriangle, Clock, CheckCircle, Wrench,
  TrendingUp, ArrowRight, Eye, Filter
} from 'lucide-react';
import DashboardCharts from '@/components/DashboardCharts';

const supabase = createSupabaseBrowserClient();

export default function DashboardNew() {
  const { role, companyCode, isAdmin, isTopManagement, isFieldManager, isSupervisor, isCrew, isClient, loading: roleLoading } = useUserRole();
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && role) {
      fetchDashboardData();
    }
  }, [roleLoading, role, companyCode]);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      // Use select('*') to get ALL columns
      let assetsQuery = supabase.from('assets').select('*');
      let workOrdersQuery = supabase.from('work_orders').select('*');
      let campaignsQuery = supabase.from('campaign_plans').select('*');

      // Apply company filter for clients
      if (isClient && companyCode) {
        try {
          assetsQuery = assetsQuery.eq('company_id', companyCode);
        } catch (e) { /* ignore */ }
        try {
          workOrdersQuery = workOrdersQuery.eq('company_id', companyCode);
        } catch (e) { /* ignore */ }
        try {
          campaignsQuery = campaignsQuery.eq('company_id', companyCode);
        } catch (e) { /* ignore */ }
      }

      const [assetsRes, woRes, campRes] = await Promise.all([
        assetsQuery,
        workOrdersQuery,
        campaignsQuery
      ]);

      if (assetsRes.error) throw new Error(`Assets Error: ${assetsRes.error.message}`);
      if (woRes.error) throw new Error(`Work Orders Error: ${woRes.error.message}`);
      if (campRes.error) throw new Error(`Campaigns Error: ${campRes.error.message}`);

      const assets = assetsRes.data || [];
      const workOrders = woRes.data || [];
      const campaigns = campRes.data || [];

      const kpis = {
        total_assets: assets.length,
        overdue_work_orders: workOrders.filter((wo: any) => 
          wo.due_date && wo.due_date < new Date().toISOString().split('T')[0] && 
          wo.status !== 'completed'
        ).length,
        pending_work_orders: workOrders.filter((wo: any) => 
          wo.status === 'pending' || wo.status === 'assigned'
        ).length,
        completed_work_orders: workOrders.filter((wo: any) => 
          wo.status === 'completed'
        ).length,
        critical_assets: assets.filter((a: any) => 
          a.condition === 'critical' || a.status === 'critical'
        ).length,
        active_campaigns: campaigns.filter((c: any) => c.status === 'active').length
      };

      setDashboardData({ assets, workOrders, campaigns, kpis });
    } catch (err: any) {
      console.error('🚨 Dashboard Error:', err.message || err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (roleLoading || loading) {
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
          <h2 className="text-xl font-semibold text-red-400 mb-2">Dashboard Error</h2>
          <p className="text-navy-300 mb-4 text-sm break-all">{error}</p>
          <button onClick={fetchDashboardData} className="px-4 py-2 bg-amber-500 text-navy-950 rounded-lg font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { kpis } = dashboardData;

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Maintenance Dashboard (New)</h1>
            <p className="text-navy-400 mt-1">
              {isClient ? `Company: ${companyCode}` : 'System Overview'} • Updated: {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            {isClient && (
              <span className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 rounded-full text-sm text-blue-300 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Client View
              </span>
            )}
            <button 
              onClick={fetchDashboardData}
              className="px-3 py-1 bg-navy-800 hover:bg-navy-700 border border-navy-600 rounded-lg text-sm flex items-center gap-2"
            >
              <Filter className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard 
            title="Total Assets" 
            value={kpis.total_assets} 
            icon={<Package className="w-5 h-5" />}
            color="amber"
            show={isAdmin || isTopManagement || isFieldManager || isSupervisor || (isClient && kpis.total_assets > 0)}
          />
          <KPICard 
            title="Overdue WOs" 
            value={kpis.overdue_work_orders} 
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
            alert={kpis.overdue_work_orders > 0}
          />
          <KPICard 
            title="Pending WOs" 
            value={kpis.pending_work_orders} 
            icon={<Clock className="w-5 h-5" />}
            color="blue"
          />
          <KPICard 
            title="Completed WOs" 
            value={kpis.completed_work_orders} 
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
          />
        </div>

        {/* 📊 CHARTS SECTION - Only for Admin/Management */}
        {(isAdmin || isTopManagement || isFieldManager) && dashboardData && (
          <div className="mb-6">
            <DashboardCharts 
              assets={dashboardData.assets}
              workOrders={dashboardData.workOrders}
            />
          </div>
        )}

        {/* Work Orders Summary */}
        <div className="bg-navy-900 rounded-lg border border-navy-700 p-5 mb-6">
          <h3 className="font-semibold mb-4">Recent Work Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-navy-700">
                <tr className="text-left text-navy-400">
                  <th className="pb-3 font-medium">ID</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Due Date</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {dashboardData.workOrders.slice(0, 5).map((wo: any) => (
                  <tr key={wo.id} className="hover:bg-navy-800/50">
                    <td className="py-3 font-mono text-amber-400">{wo.id?.slice(0, 8) || 'N/A'}...</td>
                    <td className="py-3"><StatusBadge status={wo.status} /></td>
                    <td className="py-3 text-navy-300">{wo.due_date ? new Date(wo.due_date).toLocaleDateString() : '-'}</td>
                    <td className="py-3">
                      <Link href={`/work-orders/${wo.id}`} className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1">
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {dashboardData.workOrders.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-navy-400">No work orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!isClient && <QuickAction href="/work-orders" icon={<Wrench />} label="Create Work Order" color="amber" />}
          {!isClient && <QuickAction href="/assets" icon={<Package />} label="Manage Assets" color="blue" />}
          {(isAdmin || isTopManagement) && <QuickAction href="/reports" icon={<TrendingUp />} label="Export Reports" color="green" />}
        </div>
      </div>
    </div>
  );
}

// Subcomponents
function KPICard({ title, value, icon, color, alert = false, show = true }: any) {
  if (!show) return null;
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
  };
  return (
    <div className={`p-4 rounded-lg border ${alert ? 'border-red-500/50 bg-red-500/5' : colorClasses[color] || 'bg-navy-800/50 border-navy-700'}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-navy-400 text-sm">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: any) {
  const styles: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    assigned: 'bg-purple-500/20 text-purple-400',
    cancelled: 'bg-red-500/20 text-red-400',
  };
  return <span className={`px-2 py-1 rounded text-xs capitalize ${styles[status] || 'bg-navy-700 text-navy-300'}`}>{status?.replace('_', ' ') || 'N/A'}</span>;
}

function QuickAction({ href, icon, label, color }: any) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20',
  };
  return (
    <Link href={href} className={`flex items-center gap-3 p-4 rounded-lg border transition ${colors[color]}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}