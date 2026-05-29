'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { 
  Plus, Search, Eye, AlertTriangle, CheckCircle, Clock,
  ArrowUpDown, ArrowUp, ArrowDown
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
  created_at: string;
  asset?: { tag_number: string };
}

type SortColumn = 'work_order_number' | 'title' | 'status' | 'priority' | 'assigned_crew' | 'due_date';
type SortDirection = 'asc' | 'desc';

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [debugMsg, setDebugMsg] = useState('');

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter, priorityFilter]);

  async function fetchWorkOrders() {
    setLoading(true);
    setDebugMsg('Fetching...');
    try {
      console.log('🔍 Fetching work orders...');
      
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          asset:assets!inner(tag_number)
        `)
        .is('deleted_at', null);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error:', error);
        setDebugMsg(`Error: ${error.message}`);
        throw error;
      }

      console.log('✅ Fetched:', data?.length || 0, 'work orders');
      setDebugMsg(`Loaded ${data?.length || 0} work orders`);
      
      // Sort client-side
      const sorted = sortData(data || []);
      setWorkOrders(sorted);
      
    } catch (err: any) {
      console.error('🚨 Fetch failed:', err);
      setDebugMsg(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const sortData = (data: WorkOrder[]): WorkOrder[] => {
    return [...data].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      if (sortColumn === 'due_date' || sortColumn === 'created_at') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-amber-400" />
      : <ArrowDown className="w-3 h-3 text-amber-400" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Completed' };
      case 'in_progress': return { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock, label: 'In Progress' };
      default: return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pending' };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
        <p className="text-navy-300">Loading... {debugMsg}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-navy-50">Work Orders</h1>
            <p className="text-navy-300 mt-1 text-sm">{debugMsg}</p>
          </div>
          <button
            onClick={() => router.push('/work-orders/new')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg font-medium transition"
          >
            <Plus className="w-4 h-4" /> New Work Order
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
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchWorkOrders()}
                  className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm">
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPriorityFilter('all'); }}
              className="px-3 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-600 rounded-lg text-sm">
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        {workOrders.length === 0 ? (
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <p className="text-navy-300 mb-4">No work orders found</p>
            <p className="text-xs text-navy-500 mb-4">{debugMsg}</p>
            <button onClick={fetchWorkOrders} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg">
              Refresh
            </button>
          </div>
        ) : (
          <div className="bg-navy-900 rounded-lg border border-navy-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-navy-800 border-b border-navy-700">
                  <tr>
                    {(['work_order_number', 'title', 'status', 'priority', 'assigned_crew', 'due_date'] as SortColumn[]).map((col) => (
                      <th key={col} onClick={() => handleSort(col)}
                        className="text-left px-4 py-3 text-sm font-medium text-navy-300 cursor-pointer hover:bg-navy-700 transition">
                        <div className="flex items-center gap-2">
                          {col.replace('_', ' ').toUpperCase()}
                          <SortIcon column={col} />
                        </div>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 text-sm font-medium text-navy-300"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800">
                  {workOrders.map((wo) => {
                    const statusConfig = getStatusBadge(wo.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={wo.id} className="hover:bg-navy-800/50">
                        <td className="px-4 py-3 font-mono text-sm text-amber-400">{wo.work_order_number}</td>
                        <td className="px-4 py-3 text-navy-100">
                          {wo.title}
                          {wo.asset?.tag_number && <p className="text-xs text-navy-400">Asset: {wo.asset.tag_number}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.bg} ${statusConfig.text}`}>
                            <StatusIcon className="w-3 h-3" /> {statusConfig.label}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${getPriorityColor(wo.priority)}`}>
                          {wo.priority?.toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-navy-300">{wo.assigned_crew || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-navy-300">{wo.due_date ? new Date(wo.due_date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => router.push(`/work-orders/${wo.id}`)} className="p-1 text-navy-400 hover:text-amber-400">
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