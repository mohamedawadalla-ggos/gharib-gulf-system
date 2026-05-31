// app/assets/page.tsx
'use client';

// ✅ Force dynamic rendering - skip static generation to bypass SSR toast error
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { 
  Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, 
  Package, AlertTriangle, CheckCircle, Clock, MapPin,
  Eye, Wrench, Settings
} from 'lucide-react';

const supabase = createSupabaseBrowserClient();

// === TypeScript Interfaces ===
interface Asset {
  id: string;
  tag_number: string;
  location_code: string | null;
  detailed_location: string | null;
  manufacturer: string | null;
  service_type: string | null;
  condition: string | null;
  maintenance_status: string | null;
  sct_code: string | null;
  station_id: string | null;
  stations?: { code: string; name: string } | null;
}

type SortColumn = 'tag_number' | 'location_code' | 'manufacturer' | 'service_type' | 'condition' | 'maintenance_status';
type SortDirection = 'asc' | 'desc';

export default function AssetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('tag_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchAssets();
  }, [statusFilter, serviceFilter, sortColumn, sortDirection]);

  async function fetchAssets() {
    setLoading(true);
    try {
      console.log('🔍 Fetching assets...');
      
      let query = supabase
        .from('assets_clean')
        .select(`
          *,
          stations (code, name)
        `, { count: 'exact' });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('maintenance_status', statusFilter);
      }
      if (serviceFilter !== 'all') {
        query = query.eq('service_type', serviceFilter);
      }
      if (searchTerm) {
        query = query.or(`tag_number.ilike.%${searchTerm}%,location_code.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

      const { data, error, count } = await query;
      
      if (error) {
        console.error('❌ Error:', error);
        throw error;
      }

      console.log('✅ Fetched:', data?.length || 0, 'assets');
      setAssets(data || []);
      setTotal(count || 0);
      
    } catch (err: any) {
      console.error('🚨 Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }

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
      case 'completed':
      case 'up_to_date':
        return { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Good' };
      case 'scheduled':
      case 'due_soon':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Due Soon' };
      case 'overdue':
        return { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertTriangle, label: 'Overdue' };
      default:
        return { bg: 'bg-navy-700/50', text: 'text-navy-300', icon: Clock, label: 'Unknown' };
    }
  };

  const getServiceColor = (service: string | null) => {
    switch (service?.toLowerCase()) {
      case 'oil': return 'text-amber-400';
      case 'water': return 'text-blue-400';
      case 'gas': return 'text-green-400';
      default: return 'text-navy-300';
    }
  };

  if (loading && assets.length === 0) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
        <p className="text-navy-300">Loading assets...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-amber-400">🔩 Asset Registry</h1>
            <p className="text-navy-300 mt-1 text-sm">{total.toLocaleString()} valves tracked</p>
          </div>
          <button
            onClick={() => router.push('/assets/new')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg font-medium transition"
          >
            <Package className="w-4 h-4" /> Add Asset
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
                  placeholder="Search tag or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAssets()}
                  className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Status</option>
              <option value="up_to_date">Up to Date</option>
              <option value="scheduled">Scheduled</option>
              <option value="overdue">Overdue</option>
            </select>

            <select 
              value={serviceFilter} 
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Services</option>
              <option value="oil">Oil</option>
              <option value="water">Water</option>
              <option value="gas">Gas</option>
            </select>

            <button 
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setServiceFilter('all'); fetchAssets(); }}
              className="px-3 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-600 rounded-lg text-sm transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        {assets.length === 0 ? (
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <p className="text-navy-300 mb-4">No assets found matching your filters</p>
            <button onClick={fetchAssets} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg transition">
              Refresh
            </button>
          </div>
        ) : (
          <div className="bg-navy-900 rounded-lg border border-navy-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-navy-800 border-b border-navy-700">
                  <tr>
                    {(['tag_number', 'location_code', 'manufacturer', 'service_type', 'condition', 'maintenance_status'] as SortColumn[]).map((col) => (
                      <th 
                        key={col} 
                        onClick={() => handleSort(col)}
                        className="text-left px-4 py-3 text-sm font-medium text-navy-300 cursor-pointer hover:bg-navy-700 transition select-none"
                      >
                        <div className="flex items-center gap-2">
                          {col.replace('_', ' ').toUpperCase()}
                          <SortIcon column={col} />
                        </div>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 text-sm font-medium text-navy-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800">
                  {assets.map((asset) => {
                    const statusConfig = getStatusBadge(asset.maintenance_status || '');
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={asset.id} className="hover:bg-navy-800/50 transition">
                        <td className="px-4 py-3 font-mono text-sm text-amber-400">{asset.tag_number}</td>
                        <td className="px-4 py-3 text-navy-100">
                          {asset.location_code || 'N/A'}
                          {asset.stations?.code && (
                            <p className="text-xs text-navy-400">{asset.stations.code}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-navy-300">{asset.manufacturer || 'Unknown'}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${getServiceColor(asset.service_type || '')}`}>                          {asset.service_type?.toUpperCase() || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs capitalize ${
                            asset.condition === 'good' ? 'bg-green-500/20 text-green-400' :
                            asset.condition === 'poor' ? 'bg-red-500/20 text-red-400' :
                            'bg-navy-700/50 text-navy-300'
                          }`}>
                            {asset.condition || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.bg} ${statusConfig.text}`}>
                            <StatusIcon className="w-3 h-3" /> {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => router.push(`/assets/${asset.id}`)} 
                              className="p-1 text-navy-400 hover:text-amber-400 transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => router.push(`/work-orders/new?asset=${asset.id}`)} 
                              className="p-1 text-navy-400 hover:text-blue-400 transition"
                              title="Create Work Order"
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-navy-500">
          <p>Showing {assets.length} of {total.toLocaleString()} assets • Updated {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}