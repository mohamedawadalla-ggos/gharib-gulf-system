// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useUserRole } from '@/lib/useUserRole';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Package, AlertTriangle, Clock, CheckCircle, Wrench,
  TrendingUp, ArrowRight, Eye, Filter, MapPin, Factory,
  Droplet, Settings, Calendar, Users
} from 'lucide-react';
import DashboardCharts from '@/components/DashboardCharts';

const supabase = createSupabaseBrowserClient();

interface DashboardKPIs {
  total_assets: number;
  unique_locations: number;
  unique_manufacturers: number;
  oil_valves: number;
  water_valves: number;
  gas_valves: number;
  diesel_valves: number;
  wellhead_valves: number;
  bar_stem: number;
  gear_box: number;
  hand_wheel: number;
  lever: number;
  manual: number;
  good_for_service: number;
  overdue_work_orders: number;
  pending_work_orders: number;
  completed_work_orders: number;
  active_campaigns: number;
}

interface DashboardData {
  assets: any[];
  workOrders: any[];
  campaigns: any[];
  kpis: DashboardKPIs;
}

export default function DashboardPage() {
  const { role, companyCode, isClient, loading: roleLoading } = useUserRole();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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
      console.log('🔍 Starting dashboard fetch...');

      const assetsRes = await supabase
        .from('assets')
        .select(`*, valve_details (actuator_type, valve_type)`)
        .limit(10000);

      const woRes = await supabase.from('work_orders').select('*').limit(5000);
      const campRes = await supabase.from('campaign_plans').select('*').limit(1000);

      if (assetsRes.error) throw new Error(`Assets: ${assetsRes.error.message}`);
      if (woRes.error) throw new Error(`Work Orders: ${woRes.error.message}`);

      let assets = assetsRes.data || [];
      let workOrders = woRes.data || [];
      const campaigns = campRes.data || [];

      if (isClient && companyCode) {
        assets = assets.filter((a: any) => a.company_id === companyCode);
        workOrders = workOrders.filter((wo: any) => wo.company_id === companyCode);
      }

     const countActuator = (keyword: string): number => {
  return assets.filter((a: any): boolean => {
    const type = (a.valve_details?.actuator_type || a.valve_details?.valve_type || '').toLowerCase();
    return !!type.includes(keyword);
  }).length;
};

      const kpis: DashboardKPIs = {
        total_assets: assets.length,
        unique_locations: new Set(assets.map((a: any) => 
          (a.location_code || a.detailed_location || a.parent_well_name || 'Unknown').replace(/^-+/, '').trim()
        )).size,
        unique_manufacturers: new Set(assets.map((a: any) => a.manufacturer || 'Unknown')).size,
        oil_valves: assets.filter((a: any) => a.service_type?.toLowerCase().includes('oil')).length,
        water_valves: assets.filter((a: any) => a.service_type?.toLowerCase().includes('water')).length,
        gas_valves: assets.filter((a: any) => a.service_type?.toLowerCase().includes('gas')).length,
        diesel_valves: assets.filter((a: any) => a.service_type?.toLowerCase().includes('diesel')).length,
        wellhead_valves: assets.filter(a => (a.sct_code || '').toLowerCase().includes('wellhead')).length,
        bar_stem: countActuator('bar'),
        gear_box: countActuator('gear'),
        hand_wheel: countActuator('wheel'),
        lever: countActuator('lever'),
        manual: countActuator('manual'),
        good_for_service: assets.filter((a: any) => 
          a.condition === 'good' || a.maintenance_status === 'up_to_date' || a.repair_status === 'none'
        ).length,
        overdue_work_orders: workOrders.filter((wo: any) => 
          wo.due_date && wo.due_date < new Date().toISOString().split('T')[0] && wo.status !== 'completed'
        ).length,
        pending_work_orders: workOrders.filter((wo: any) => 
          ['pending', 'assigned', 'in_progress'].includes(wo.status)
        ).length,
        completed_work_orders: workOrders.filter((wo: any) => wo.status === 'completed').length,
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
        <div className="max-w-2xl mx-auto bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Dashboard Error</h2>
          <p className="text-navy-300 mb-4 text-sm break-all">{error}</p>
          <button onClick={fetchDashboardData} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg font-medium transition">Retry</button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-navy-950 p-6">
        <div className="max-w-2xl mx-auto bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">No Data Loaded</h2>
          <button onClick={fetchDashboardData} className="px-4 py-2 bg-amber-500 text-navy-950 rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  const { kpis, assets, workOrders, campaigns } = dashboardData;

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-amber-400">🔩 Khalda Valves Dashboard</h1>
            <p className="text-navy-400 mt-1 text-sm md:text-base">
              {isClient ? `Company: ${companyCode} • ` : ''}
              {kpis.total_assets.toLocaleString()} valves • {kpis.unique_locations} locations • Updated {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            {isClient && (
              <span className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 rounded-full text-sm text-blue-300 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Client View
              </span>
            )}
            <button onClick={fetchDashboardData} className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 border border-navy-600 rounded-lg text-sm flex items-center gap-2 transition">
              <Filter className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Summary Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatBadge icon={<Package />} label="Total Valves" value={kpis.total_assets} color="amber" />
          <StatBadge icon={<MapPin />} label="Locations" value={kpis.unique_locations} color="blue" />
          <StatBadge icon={<Factory />} label="Manufacturers" value={kpis.unique_manufacturers} color="purple" />
          <StatBadge icon={<Droplet />} label="Oil Valves" value={kpis.oil_valves} color="green" />
          <StatBadge icon={<Settings />} label="Wellhead Valves" value={kpis.wellhead_valves} color="cyan" />
          <StatBadge icon={<Calendar />} label="Pending WOs" value={kpis.pending_work_orders} color="yellow" />
        </div>

        {/* Main KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard title="Total Assets" value={kpis.total_assets} subtitle={`${kpis.good_for_service} Good for Service`} icon={<Package className="w-5 h-5" />} color="amber" trend={kpis.good_for_service > kpis.total_assets * 0.5 ? 'up' : 'neutral'} />
          <KPICard title="Overdue Work Orders" value={kpis.overdue_work_orders} subtitle="Requires attention" icon={<AlertTriangle className="w-5 h-5" />} color="red" alert={kpis.overdue_work_orders > 0} />
          <KPICard title="Pending Work Orders" value={kpis.pending_work_orders} subtitle={`${kpis.completed_work_orders} completed`} icon={<Clock className="w-5 h-5" />} color="blue" />
          <KPICard title="Active Campaigns" value={kpis.active_campaigns} subtitle="Maintenance programs" icon={<Users className="w-5 h-5" />} color="green" />
        </div>

        {/* Charts Section */}
        {assets && assets.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-navy-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" /> Analytics & Insights
            </h2>
            <DashboardCharts assets={assets} workOrders={workOrders || []} campaigns={campaigns || []} />
          </div>
        )}

        {/* Application Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-5 lg:col-span-2">
            <h3 className="font-semibold mb-4 flex items-center gap-2"> <Droplet className="w-4 h-4 text-amber-400" /> Valve Application Breakdown </h3>
            <div className="space-y-3">
              <ApplicationBar label="Oil" value={kpis.oil_valves} total={kpis.total_assets} color="bg-amber-500" />
              <ApplicationBar label="Water" value={kpis.water_valves} total={kpis.total_assets} color="bg-blue-500" />
              <ApplicationBar label="Gas" value={kpis.gas_valves} total={kpis.total_assets} color="bg-green-500" />
              <ApplicationBar label="Other" value={kpis.total_assets - kpis.oil_valves - kpis.water_valves - kpis.gas_valves} total={kpis.total_assets} color="bg-navy-600" />
            </div>
          </div>
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"> <Settings className="w-4 h-4 text-amber-400" /> Actuation Types </h3>
            <div className="space-y-3">
              <ActuationItem label="Bar Stem" value={kpis.bar_stem || 0} total={kpis.total_assets} />
              <ActuationItem label="Gear Box" value={kpis.gear_box || 0} total={kpis.total_assets} />
              <ActuationItem label="Hand Wheel" value={kpis.hand_wheel || 0} total={kpis.total_assets} />
              <ActuationItem label="Manual (Other)" value={kpis.manual || 0} total={kpis.total_assets} />
            </div>
          </div>
        </div>

        {/* Recent Work Orders */}
        <div className="bg-navy-900 rounded-lg border border-navy-700 p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2"> <Clock className="w-4 h-4 text-amber-400" /> Recent Work Orders </h3>
            <Link href="/work-orders" className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /> </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-navy-700">
                <tr className="text-left text-navy-400">
                  <th className="pb-3 font-medium">ID</th>
                  <th className="pb-3 font-medium">Tag Number</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Due Date</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {(workOrders || []).slice(0, 5).map((wo: any) => {
                  const asset = assets.find((a: any) => a.id === wo.asset_id);
                  const tagNumber = asset?.tag_number || wo.asset_name || wo.asset_id?.slice(0, 12) || 'N/A';
                  return (
                    <tr key={wo.id} className="hover:bg-navy-800/50 transition">
                      <td className="py-3 font-mono text-amber-400 text-xs">{wo.id?.slice(0, 8)}...</td>
                      <td className="py-3 text-navy-300 text-sm font-medium">{tagNumber}</td>
                      <td className="py-3"><StatusBadge status={wo.status} /></td>
                      <td className="py-3 text-navy-300 text-xs">{wo.due_date ? new Date(wo.due_date).toLocaleDateString() : '-'}</td>
                      <td className="py-3">
                        <Link href={`/work-orders/${wo.id}`} className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1">View <ArrowRight className="w-3 h-3" /> </Link>
                      </td>
                    </tr>
                  );
                })}
                {(!workOrders || workOrders.length === 0) && <tr><td colSpan={5} className="py-6 text-center text-navy-400">No work orders found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {!isClient && <QuickAction href="/work-orders/new" icon={<Wrench />} label="Create Work Order" color="amber" />}
          {!isClient && <QuickAction href="/assets" icon={<Package />} label="Manage Assets" color="blue" />}
          <QuickAction href="/dashboard" icon={<Filter />} label="Refresh Data" color="navy" />
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-navy-800 text-center text-xs text-navy-500">
          <p>Khalda Valves Database • {kpis.total_assets.toLocaleString()} records • {kpis.unique_locations} locations • {kpis.unique_manufacturers} manufacturers</p>
          <p className="mt-1">Data source: Khalda Valves data.xlsx + Khalda Wellheads & Wellhead Valves data.xlsx</p>
        </div>
      </div>
    </div>
  );
}

// === Subcomponents ===
function StatBadge({ icon, label, value, color }: any) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };
  return (
    <div className={`p-3 rounded-lg border text-center ${colors[color]}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

function KPICard({ title, value, subtitle, icon, color, alert = false, trend }: any) {
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
      <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {subtitle && <div className="text-xs text-navy-400 mt-1">{subtitle}</div>}
      {trend === 'up' && <div className="text-xs text-green-400 mt-1">↑ Healthy</div>}
    </div>
  );
}

function ApplicationBar({ label, value, total, color }: any) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-navy-300">{label}</span>
        <span className="text-navy-400">{value.toLocaleString()} ({percent}%)</span>
      </div>
      <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ActuationItem({ label, value, total }: any) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex justify-between items-center py-2 border-b border-navy-800 last:border-0">
      <span className="text-navy-300 text-sm">{label}</span>
      <div className="text-right">
        <span className="text-navy-100 font-medium">{value.toLocaleString()}</span>
        <span className="text-navy-500 text-xs ml-2">({percent}%)</span>
      </div>
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
    navy: 'bg-navy-800 hover:bg-navy-700 text-navy-300 border-navy-600',
  };
  return (
    <Link href={href} className={`flex items-center gap-3 p-4 rounded-lg border transition ${colors[color]}`}>
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}