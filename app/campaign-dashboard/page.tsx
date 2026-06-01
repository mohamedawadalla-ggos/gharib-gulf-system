'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  Calendar,
  MapPin,
  Activity,
  AlertCircle,
  BarChart3,
  Filter
} from 'lucide-react';
import Link from 'next/link';

const supabase = createClient();

interface CampaignStats {
  totalWorkOrders: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  dueSoon: number;
  totalAssets: number;
  assetsCompleted: number;
  completionRate: number;
}

interface CrewWorkload {
  crew_name: string;
  assigned_count: number;
  completed_count: number;
  in_progress_count: number;
  overdue_count: number;
  efficiency: number;
}

interface StationProgress {
  station_code: string;
  station_name: string;
  total_assets: number;
  completed_assets: number;
  overdue_assets: number;
  progress_percentage: number;
}

interface AlertItem {
  id: string;
  work_order_number: string;
  title: string;
  asset_tag: string;
  station_code: string;
  due_date: string;
  days_overdue: number;
  priority: string;
  crew: string;
}

export default function CampaignDashboardPage() {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [crewWorkload, setCrewWorkload] = useState<CrewWorkload[]>([]);
  const [stationProgress, setStationProgress] = useState<StationProgress[]>([]);
  const [overdueAlerts, setOverdueAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrew, setSelectedCrew] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<string>('all');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedCrew, selectedStation]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      await Promise.all([
        fetchCampaignStats(),
        fetchCrewWorkload(),
        fetchStationProgress(),
        fetchOverdueAlerts()
      ]);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCampaignStats() {
    const { count: totalValves } = await supabase
      .from('assets_clean')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    let query = supabase
      .from('work_orders')
      .select(`
        status,
        due_date,
        items:work_order_items(status)
      `, { count: 'exact' })
      .is('deleted_at', null);

    if (selectedCrew !== 'all') query = query.eq('assigned_crew', selectedCrew);
    const { data, count } = await query;

    const today = new Date().toISOString().split('T')[0];
    const in7Days = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];

    let completed = 0, inProgress = 0, pending = 0, overdue = 0, dueSoon = 0, assetsCompleted = 0;

    data?.forEach((wo: any) => {
      if (wo.status === 'completed') completed++;
      else if (wo.status === 'in_progress') inProgress++;
      else if (wo.status === 'pending') pending++;
      if (wo.due_date && wo.due_date < today && wo.status !== 'completed') overdue++;
      else if (wo.due_date && wo.due_date <= in7Days && wo.status !== 'completed') dueSoon++;
      if (wo.items) assetsCompleted += wo.items.filter((i: any) => i.status === 'completed').length;
      else if (wo.status === 'completed') assetsCompleted += 1;
    });

    setStats({
      totalWorkOrders: count || 0, completed, inProgress, pending, overdue, dueSoon,
      totalAssets: totalValves || 4835,
      assetsCompleted,
      completionRate: totalValves ? Math.round((assetsCompleted / totalValves) * 100) : 0
    });
  }

  async function fetchCrewWorkload() {
    const { data, error } = await supabase
      .from('work_orders')
      .select('assigned_crew, status, due_date')
      .is('deleted_at', null);

    if (error) {
      console.error('Crew workload error:', error);
      return;
    }

    const crews: Record<string, CrewWorkload> = {};
    const today = new Date().toISOString().split('T')[0];

    data?.forEach((wo: any) => {
      const crew = wo.assigned_crew || 'Unassigned';
      if (!crews[crew]) {
        crews[crew] = { 
          crew_name: crew, 
          assigned_count: 0, 
          completed_count: 0, 
          in_progress_count: 0, 
          overdue_count: 0, 
          efficiency: 0 
        };
      }
      crews[crew].assigned_count++;
      if (wo.status === 'completed') crews[crew].completed_count++;
      else if (wo.status === 'in_progress') crews[crew].in_progress_count++;
      if (wo.due_date && wo.due_date < today && wo.status !== 'completed') {
        crews[crew].overdue_count++;
      }
    });

    Object.values(crews).forEach(crew => {
      crew.efficiency = crew.assigned_count > 0 
        ? Math.round((crew.completed_count / crew.assigned_count) * 100) 
        : 0;
    });

    setCrewWorkload(Object.values(crews).sort((a, b) => b.assigned_count - a.assigned_count));
  }

  async function fetchStationProgress() {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        station:stations!inner(code, name),
        status,
        asset_id,
        due_date
      `)
      .is('deleted_at', null);

    if (error) {
      console.error('Station progress error:', error);
      return;
    }

    const stations: Record<string, StationProgress> = {};
    const today = new Date().toISOString().split('T')[0];

    data?.forEach((wo: any) => {
      const code = wo.station?.code || 'Unknown';
      if (!stations[code]) {
        stations[code] = { 
          station_code: code, 
          station_name: wo.station?.name || 'Unknown Station', 
          total_assets: 0, 
          completed_assets: 0, 
          overdue_assets: 0, 
          progress_percentage: 0 
        };
      }
      stations[code].total_assets++;
      if (wo.status === 'completed') stations[code].completed_assets++;
      if (wo.due_date && wo.due_date < today && wo.status !== 'completed') {
        stations[code].overdue_assets++;
      }
    });

    Object.values(stations).forEach(station => {
      station.progress_percentage = station.total_assets > 0 
        ? Math.round((station.completed_assets / station.total_assets) * 100) 
        : 0;
    });

    setStationProgress(Object.values(stations).sort((a, b) => b.total_assets - a.total_assets));
  }

  async function fetchOverdueAlerts() {
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('work_orders')
      .select('id, work_order_number, title, due_date, priority, assigned_crew, asset:assets(tag_number), station:stations(code)')
      .is('deleted_at', null)
      .lt('due_date', today)
      .neq('status', 'completed')
      .order('due_date', { ascending: true })
      .limit(10);

    if (selectedCrew !== 'all') query = query.eq('assigned_crew', selectedCrew);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Overdue alerts error:', error);
      setOverdueAlerts([]);
      return;
    }

    const alerts: AlertItem[] = data?.map((wo: any) => {
      const dueDate = new Date(wo.due_date);
      const todayDate = new Date(today);
      const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: wo.id, 
        work_order_number: wo.work_order_number, 
        title: wo.title,
        asset_tag: wo.asset?.tag_number || 'N/A', 
        station_code: wo.station?.code || 'N/A',
        due_date: wo.due_date, 
        days_overdue: daysOverdue, 
        priority: wo.priority, 
        crew: wo.assigned_crew || 'Unassigned'
      };
    }) || [];

    setOverdueAlerts(alerts);
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-navy-300">Loading campaign dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-50 mb-2">Campaign Dashboard</h1>
        <p className="text-navy-300">Real-time maintenance campaign progress tracking</p>
      </div>

      <div className="bg-navy-900 p-4 rounded-lg border border-navy-700 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select 
            value={selectedCrew} 
            onChange={(e) => setSelectedCrew(e.target.value)} 
            className="px-3 py-2 bg-navy-800 border border-navy-600 rounded text-sm focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Crews</option>
            <option value="Crew A - Station Team">Crew A</option>
            <option value="Crew B - Wellhead Team">Crew B</option>
            <option value="Crew C - Emergency Response">Crew C</option>
            <option value="">Unassigned</option>
          </select>
          <select 
            value={selectedStation} 
            onChange={(e) => setSelectedStation(e.target.value)} 
            className="px-3 py-2 bg-navy-800 border border-navy-600 rounded text-sm focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Stations</option>
            {stationProgress.map(s => (
              <option key={s.station_code} value={s.station_code}>
                {s.station_code} - {s.station_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-navy-900 p-6 rounded-lg border border-navy-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-navy-300">Total Work Orders</h3>
            <BarChart3 className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-navy-50">{stats?.totalWorkOrders || 0}</p>
          <p className="text-xs text-navy-400 mt-1">{stats?.totalAssets?.toLocaleString() || 4835} valves in campaign</p>
        </div>

        <div className="bg-navy-900 p-6 rounded-lg border border-navy-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-navy-300">Campaign Completion</h3>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-navy-50">{stats?.completionRate || 0}%</p>
          <p className="text-xs text-navy-400 mt-1">{stats?.assetsCompleted?.toLocaleString() || 0}/{stats?.totalAssets?.toLocaleString() || 4835} valves completed</p>
        </div>

        <div className="bg-navy-900 p-6 rounded-lg border border-navy-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-navy-300">In Progress</h3>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-blue-400">{stats?.inProgress || 0}</p>
          <p className="text-xs text-navy-400 mt-1">{stats?.pending || 0} pending</p>
        </div>

        <div className="bg-navy-900 p-6 rounded-lg border border-navy-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-navy-300">Overdue</h3>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-red-400">{stats?.overdue || 0}</p>
          <p className="text-xs text-navy-400 mt-1">{stats?.dueSoon || 0} due in 7 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Crew Workload */}
        <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
          <h2 className="text-lg font-semibold text-navy-50 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Crew Workload
          </h2>
          <div className="space-y-3">
            {crewWorkload.map(crew => (
              <div key={crew.crew_name} className="p-3 bg-navy-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-navy-200">{crew.crew_name}</span>
                  <span className={`text-sm font-bold ${
                    crew.efficiency >= 80 ? 'text-green-400' : 
                    crew.efficiency >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {crew.efficiency}% efficiency
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-navy-400">
                  <div><span className="block text-navy-50 font-semibold">{crew.assigned_count}</span>Assigned</div>
                  <div><span className="block text-green-400 font-semibold">{crew.completed_count}</span>Done</div>
                  <div><span className="block text-blue-400 font-semibold">{crew.in_progress_count}</span>Active</div>
                  <div><span className="block text-red-400 font-semibold">{crew.overdue_count}</span>Overdue</div>
                </div>
              </div>
            ))}
            {crewWorkload.length === 0 && (
              <p className="text-center text-navy-400 py-4">No crew assignments yet</p>
            )}
          </div>
        </div>

        {/* Station Progress */}
        <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
          <h2 className="text-lg font-semibold text-navy-50 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            Station Progress
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stationProgress.map(station => (
              <div key={station.station_code} className="p-3 bg-navy-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-navy-200">{station.station_code}</span>
                    <p className="text-xs text-navy-400">{station.station_name}</p>
                  </div>
                  <span className="text-sm font-bold text-amber-400">{station.progress_percentage}%</span>
                </div>
                <div className="w-full bg-navy-700 rounded-full h-2 mb-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all" 
                    style={{ width: `${station.progress_percentage}%` }} 
                  />
                </div>
                <div className="flex justify-between text-xs text-navy-400">
                  <span>{station.completed_assets}/{station.total_assets} completed</span>
                  {station.overdue_assets > 0 && (
                    <span className="text-red-400">{station.overdue_assets} overdue</span>
                  )}
                </div>
              </div>
            ))}
            {stationProgress.length === 0 && (
              <p className="text-center text-navy-400 py-4">No station data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Alerts */}
      <div className="bg-navy-900 rounded-lg border border-navy-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy-50 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          Overdue Work Orders
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-800 text-navy-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">WO #</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Asset</th>
                <th className="px-4 py-3 text-left">Station</th>
                <th className="px-4 py-3 text-left">Crew</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-left">Days Overdue</th>
                <th className="px-4 py-3 text-left">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {overdueAlerts.map(alert => (
                <tr key={alert.id} className="hover:bg-navy-800/50">
                  <td className="px-4 py-3 font-mono text-amber-400">
                    <Link href={`/work-orders/${alert.id}`} className="hover:underline">
                      {alert.work_order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-navy-200">{alert.title}</td>
                  <td className="px-4 py-3 font-mono text-xs">{alert.asset_tag}</td>
                  <td className="px-4 py-3 text-navy-300">{alert.station_code}</td>
                  <td className="px-4 py-3 text-navy-300">{alert.crew}</td>
                  <td className="px-4 py-3 text-navy-300">{alert.due_date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      alert.days_overdue > 7 ? 'bg-red-900/50 text-red-300' :
                      alert.days_overdue > 3 ? 'bg-orange-900/50 text-orange-300' :
                      'bg-yellow-900/50 text-yellow-300'
                    }`}>
                      {alert.days_overdue} days
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${
                      alert.priority === 'urgent' ? 'text-red-400' :
                      alert.priority === 'high' ? 'text-orange-400' :
                      alert.priority === 'medium' ? 'text-amber-400' : 'text-navy-300'
                    }`}>
                      {alert.priority.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {overdueAlerts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-green-400">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                    No overdue work orders! Great job! 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link 
          href="/work-orders/new" 
          className="p-4 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg font-medium text-center transition"
        >
          <Calendar className="w-5 h-5 mx-auto mb-2" />
          Create Work Order
        </Link>
        <Link 
          href="/work-orders" 
          className="p-4 bg-navy-800 hover:bg-navy-700 text-navy-50 rounded-lg font-medium text-center transition border border-navy-600"
        >
          <Activity className="w-5 h-5 mx-auto mb-2" />
          View All Work Orders
        </Link>
        <Link 
          href="/assets" 
          className="p-4 bg-navy-800 hover:bg-navy-700 text-navy-50 rounded-lg font-medium text-center transition border border-navy-600"
        >
          <MapPin className="w-5 h-5 mx-auto mb-2" />
          Browse Assets
        </Link>
      </div>
    </div>
  );
}