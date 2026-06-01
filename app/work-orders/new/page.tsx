'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, AlertCircle, Search, Plus, Trash2 } from 'lucide-react';

const supabase = createClient();

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [crews, setCrews] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_crew: '',
    due_date: '',
    scheduled_date: '',
    estimated_hours: '',
    notes: ''
  });

  // Fetch due soon assets on load
  useEffect(() => {
    fetchDueSoonAssets();
    fetchCrews();
  }, []);

  // Search assets as user types
  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchAssets();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  async function fetchDueSoonAssets() {
    const { data } = await supabase
      .from('assets_clean')
      .select('id, tag_number, location_code, station_id, stations(code), criticality')
      .limit(50);
    
    if (data) setAssets(data);
  }

  async function fetchCrews() {
    const { data } = await supabase
      .from('crews')
      .select('id, name');
    if (data) setCrews(data);
  }

  async function searchAssets() {
    const { data } = await supabase
      .from('assets_clean')
      .select('id, tag_number, location_code, station_id, stations(code), criticality')
      .ilike('tag_number', `%${searchTerm}%`)
      .limit(20);
    
    if (data) setSearchResults(data);
  }

  const addAsset = (asset: any) => {
    if (!selectedAssets.find(a => a.id === asset.id)) {
      setSelectedAssets([...selectedAssets, asset]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeAsset = (assetId: string) => {
    setSelectedAssets(selectedAssets.filter(a => a.id !== assetId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.title) {
    setError('Please enter a title');
    return;
  }
  
  if (selectedAssets.length === 0) {
    setError('Please select at least one asset');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    // Create work order using RPC
    const { data: result, error: rpcError } = await supabase.rpc('create_work_order_rpc', {
      p_title: formData.title,
      p_description: formData.description || null,
      p_priority: formData.priority,
      p_asset_id: selectedAssets[0]?.id || null,
      p_station_id: selectedAssets[0]?.station_id || null,
      p_crew_id: crews.find(c => c.name === formData.assigned_crew)?.id || null,
      p_due_date: formData.due_date || null,
      p_scheduled_date: formData.scheduled_date || null,
      p_estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      p_notes: formData.notes || null,
      p_asset_ids: selectedAssets.slice(1).map(a => a.id)
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      throw new Error(rpcError.message);
    }
    
    console.log('RPC Result:', result);
    
    // Check different possible response structures
    let workOrderId = null;
    
    if (result && typeof result === 'object') {
      // Try different possible property names
      workOrderId = result.work_order_id || result.id || result.workOrderId;
    }
    
    if (!workOrderId) {
      // If no ID returned, try to fetch the most recent work order
      const { data: latestWO, error: fetchError } = await supabase
        .from('work_orders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (fetchError) throw fetchError;
      if (latestWO && latestWO.length > 0) {
        workOrderId = latestWO[0].id;
      }
    }
    
    if (!workOrderId) {
      throw new Error('Work order created but ID not found');
    }
    
    router.push(`/work-orders/${workOrderId}`);
  } catch (err: any) {
    console.error('Create error:', err);
    setError(err.message || 'Failed to create work order');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-navy-300 hover:text-navy-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold">Create Work Order</h1>
          <p className="text-navy-300 mt-1">Schedule maintenance for valves</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Selection */}
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Select Assets</h2>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
              <input
                type="text"
                placeholder="Search by tag number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm text-navy-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto bg-navy-800 rounded-lg border border-navy-600">
                {searchResults.map(asset => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => addAsset(asset)}
                    className="w-full px-4 py-2 text-left hover:bg-navy-700 flex justify-between items-center border-b border-navy-700 last:border-0"
                  >
                    <div>
                      <span className="font-mono text-amber-400">{asset.tag_number}</span>
                      <p className="text-xs text-navy-400">{asset.stations?.code || 'No station'} - {asset.location_code || 'No location'}</p>
                    </div>
                    <Plus className="w-4 h-4 text-green-400" />
                  </button>
                ))}
              </div>
            )}

            {/* Selected Assets */}
            {selectedAssets.length > 0 && (
              <div>
                <p className="text-sm text-navy-300 mb-2">Selected ({selectedAssets.length} assets)</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedAssets.map(asset => (
                    <div key={asset.id} className="flex justify-between items-center p-2 bg-navy-800 rounded-lg">
                      <div>
                        <span className="font-mono text-sm text-amber-400">{asset.tag_number}</span>
                        <p className="text-xs text-navy-400">{asset.stations?.code || 'Unknown'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAsset(asset.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Order Details</h2>
            
            <div>
              <label className="block text-sm text-navy-300 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Quarterly maintenance - ST01 valves"
                className="w-full px-4 py-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-sm text-navy-300 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the work to be performed..."
                rows={3}
                className="w-full px-4 py-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-navy-300 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-navy-300 mb-1">Assign Crew</label>
                <select
                  value={formData.assigned_crew}
                  onChange={(e) => setFormData({ ...formData, assigned_crew: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400"
                >
                  <option value="">Unassigned</option>
                  {crews.map(crew => (
                    <option key={crew.id} value={crew.name}>{crew.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-navy-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm text-navy-300 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm text-navy-300 mb-1">Est. Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  placeholder="e.g., 4.5"
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-navy-300 mb-1">Internal Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional instructions for the crew..."
                rows={2}
                className="w-full px-4 py-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || selectedAssets.length === 0}
              className="flex-1 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-navy-950 font-medium rounded-lg transition"
            >
              {loading ? 'Creating...' : 'Create Work Order'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-navy-800 hover:bg-navy-700 text-navy-50 font-medium rounded-lg border border-navy-600 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}