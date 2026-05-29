// app/assets/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AssetFilters } from './_components/asset-filters';
import { AssetTable } from './_components/asset-table';

// ✅ ADD THESE IMPORTS AT THE TOP
import { Download } from 'lucide-react';
import { downloadCSV } from '@/lib/export-csv';
import { useToast } from '@/hooks/useToast';

// 1. Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2. Helper to format errors
function formatError(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  return err.message || err.details || err.hint || JSON.stringify(err) || 'Unknown error';
}

export default function AssetsPage() {
  // 3. State Management
  const [assets, setAssets] = useState<any[]>([]);        // Current page assets
  const [allAssets, setAllAssets] = useState<any[]>([]);  // All fetched assets (cache)
  const [stations, setStations] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [criticalities, setCriticalities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    station: 'all',
    criticality: 'all'
  });
  
  const limit = 20;
  
  // ✅ ADD THIS HOOK
  const { showToast } = useToast();

  // 4. Initial Data Fetching
  useEffect(() => {
    fetchStations();
    fetchFilterOptions();
  }, []);

  // 5. Fetch All Assets once Stations are ready
  useEffect(() => {
    if (stations.length > 0) {
      fetchAllAssets();
    }
  }, [stations]);

  // 6. Apply Filters & Pagination on client-side
  useEffect(() => {
    applyFiltersAndPaginate();
  }, [currentPage, filters, allAssets]);

  // --- Data Fetching Functions ---
  async function fetchStations() {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('id, code, name')
        .is('deleted_at', null)
        .order('code');

      if (error) throw error;
      setStations(data || []);
    } catch (err: any) {
      console.error('Station fetch error:', formatError(err));
    }
  }

  async function fetchFilterOptions() {
    try {
      // ✅ Fetching from 'assets_clean' view to avoid timestamp errors
      const { data, error } = await supabase
        .from('assets_clean')
        .select('maintenance_status, criticality')
        .limit(500);

      if (error) throw error;
      
      if (data) {
        setStatuses([...new Set(data.map(a => a.maintenance_status).filter(Boolean))]);
        setCriticalities([...new Set(data.map(a => a.criticality).filter(Boolean))]);
      }
    } catch (err: any) {
      console.error('Filter options error:', formatError(err));
    }
  }

  async function fetchAllAssets() {
    setLoading(true);
    setError(null);
    try {
      let allData: any[] = [];
      let offset = 0;
      const chunkSize = 1000;

      while (true) {
        // ✅ CRITICAL: Query 'assets_clean' view, not 'assets' table
        const { data: chunk, error } = await supabase
          .from('assets_clean') 
          .select('id, tag_number, station_id, maintenance_status, criticality, condition, location_code', { count: 'exact' })
          .order('tag_number', { ascending: true })
          .range(offset, offset + chunkSize - 1);

        if (error) throw error;
        if (!chunk || chunk.length === 0) break;

        allData = [...allData, ...chunk];
        offset += chunkSize;
        if (chunk.length < chunkSize) break;
      }

      // Enrich with Station Details
      const stationMap = new Map(stations.map(s => [s.id, { code: s.code, name: s.name }]));
      const enriched = allData.map(a => ({ 
        ...a, 
        stations: a.station_id ? stationMap.get(a.station_id) : null 
      }));
      
      setAllAssets(enriched);
      
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  // --- Client-Side Logic ---
  function applyFiltersAndPaginate() {
    let filtered = [...allAssets];
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(a => a.maintenance_status === filters.status);
    }
    if (filters.criticality !== 'all') {
      filtered = filtered.filter(a => a.criticality === filters.criticality);
    }
    if (filters.station !== 'all') {
      filtered = filtered.filter(a => a.stations?.code === filters.station);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.tag_number?.toLowerCase().includes(q) || 
        a.location_code?.toLowerCase().includes(q)
      );
    }

    const start = (currentPage - 1) * limit;
    setAssets(filtered.slice(start, start + limit));
    setTotalPages(Math.ceil(filtered.length / limit));
  }

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // ✅ ADD THIS EXPORT FUNCTION
  const handleExport = () => {
    // Export the currently filtered data (assets state)
    // Note: If you want to export ALL data regardless of pagination, use 'allAssets'
    const dataToExport = allAssets.map(a => ({
      Tag: a.tag_number,
      Location: a.location_code,
      Status: a.maintenance_status,
      Criticality: a.criticality,
      Condition: a.condition
    }));
    
    downloadCSV(dataToExport, 'asset_registry');
    showToast(`Exported ${dataToExport.length} assets`, 'success');
  };

  // --- UI Rendering ---
  if (loading && assets.length === 0) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center text-navy-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
          <p>Loading assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center max-w-lg">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Database Error</h2>
          <p className="text-navy-300 mb-4 break-all text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-navy-50">Asset Registry</h1>
            <p className="text-navy-300 mt-1">
              Manage valves across {stations.length} stations
            </p>
          </div>
          
          {/* ✅ ADD EXPORT BUTTON HERE */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-600 rounded-lg text-sm text-navy-200 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <AssetFilters 
        initialSearch={filters.search}
        initialStatus={filters.status}
        initialStation={filters.station}
        initialCriticality={filters.criticality}
        stations={stations}
        statuses={statuses}
        criticalities={criticalities}
        onFilterChange={updateFilter}
      />

      {/* Summary */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-navy-300">
          Showing {assets.length} of {allAssets.length} assets
        </p>
      </div>

      {/* Table */}
      <AssetTable 
        assets={assets} 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}