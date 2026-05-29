'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { 
  Plus, 
  Search, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Filter,
  Calendar,
  Users,
  Download // ✅ Added for future CSV export integration
} from 'lucide-react';
import Link from 'next/link';

const supabase = createSupabaseBrowserClient();

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_crew: string | null;
  due_date: string | null;
  scheduled_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  created_at: string;
  asset?: {
    tag_number: string;
  };
  station?: {
    code: string;
    name: string;
  };
}

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter, priorityFilter]);

  async function fetchWorkOrders() {
    setLoading(true);
    try {
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          asset:assets(tag_number),
          station:stations(code, name)
        `)
        .is('deleted_at', null)
        // ✅ FIX: Sort by due_date ascending (oldest first)
        .order('due_date', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setWorkOrders(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function searchWorkOrders() {
    if (!searchTerm.trim()) {
      fetchWorkOrders();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          asset:assets(tag_number),
          station:stations(code, name)
        `)
        .is('deleted_at', null)
        .or(`title.ilike.%${searchTerm}%,work_order_number.ilike.%${searchTerm}%`)
        // ✅ FIX: Sort search results by due_date ascending as well
        .order('due_date', { ascending: true });

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Completed' };
      case 'in_progress':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock, label: 'In Progress' };
      case 'assigned':
        return { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: Users, label: 'Assigned' };
      case 'cancelled':
        return { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertTriangle, label: 'Cancelled' };
      default:
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pending' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 font-bold';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-amber-400';
      default: return 'text-navy-300';
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-navy-50">Work Orders</h1>
            <p className="text-navy-300 mt-1">Manage maintenance jobs and crew assignments</p>
          </div>
          <button
            onClick={() => router.push('/work-orders/new')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg font-medium transition"
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </button>
        </div>

        {/* Filters */}
        <div className="bg-navy-900 p-4 rounded-lg border border-navy-700 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  type="text"
                  placeholder="Search by title or WO #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchWorkOrders()}
                  className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm text-navy-100 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
                fetchWorkOrders();
              }}
              className="px-3 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-600 rounded-lg text-sm transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Work Orders Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
            <p className="text-navy-300">Loading work orders...</p>
          </div>
        ) : workOrders.length === 0 ? (
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-12 text-center">
            <p className="text-navy-300 mb-4">No work orders found</p>
            <button
              onClick={() => router.push('/work-orders/new')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg"
            >
              Create Your First Work Order
            </button>
          </div>
        ) : (
          <div className="bg-navy-900 rounded-lg border border-navy-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-navy-800 border-b border-navy-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-navy-300">WO #</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-navy-300">Title</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-navy-300">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-navy-300">Priority</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-navy-300">Crew</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-navy-300">Due Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-navy-300"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800">
                  {workOrders.map((wo) => {
                    const statusConfig = getStatusBadge(wo.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={wo.id} className="hover:bg-navy-800/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm text-amber-400">
                          {wo.work_order_number}
                        </td>
                        <td className="px-4 py-3 text-navy-100">
                          {wo.title}
                          {wo.asset?.tag_number && (
                            <p className="text-xs text-navy-400">Asset: {wo.asset.tag_number}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.bg} ${statusConfig.text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${getPriorityColor(wo.priority)}`}>
                          {wo.priority?.toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-navy-300">
                          {wo.assigned_crew || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3 text-navy-300">
                          {wo.due_date ? new Date(wo.due_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/work-orders/${wo.id}`)}
                            className="p-1 text-navy-400 hover:text-amber-400 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}