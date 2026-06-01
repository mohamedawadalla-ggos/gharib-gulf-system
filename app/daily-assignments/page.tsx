'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  Calendar, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Plus,
  Search,
  Filter,
  MapPin,
  Wrench,
  Send
} from 'lucide-react';

const supabase = createClient();

interface Campaign {
  id: string;
  name: string;
  total_valves_target: number;
  total_budget_target: number;
}

interface Valve {
  id: string;
  tag_number: string;
  location_code: string;
  sct_code: string;
  station_code: string;
  criticality: string;
}

export default function DailyAssignmentsPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [availableValves, setAvailableValves] = useState<Valve[]>([]);
  const [selectedValves, setSelectedValves] = useState<Valve[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStation, setFilterStation] = useState('all');
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    request_date: new Date().toISOString().split('T')[0],
    requested_by: 'Khalda Production Dept',
    priority: 'medium',
    assigned_crew: '',
    notes: ''
  });

  useEffect(() => {
    fetchCampaign();
    fetchAvailableValves();
    fetchStations();
  }, []);

  async function fetchCampaign() {
    const { data } = await supabase
      .from('campaign_plans')
      .select('id, name, total_valves_target, total_budget_target')
      .eq('is_active', true)
      .single();
    if (data) setCampaign(data);
  }

  async function fetchAvailableValves() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets_clean')
        .select(`
          id,
          tag_number,
          location_code,
          sct_code,
          stations(code),
          criticality
        `)
        .is('deleted_at', null)
        .limit(200);

      if (error) throw error;
      
      const formatted = (data || []).map((v: any) => ({
        ...v,
        station_code: v.stations?.code || 'Unknown'
      }));
      
      setAvailableValves(formatted);
    } catch (err) {
      console.error('Error fetching valves:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStations() {
    const { data } = await supabase
      .from('stations')
      .select('code, name')
      .order('code');
    setStations(data || []);
  }

  const toggleValveSelection = (valve: Valve) => {
    if (selectedValves.find(v => v.id === valve.id)) {
      setSelectedValves(selectedValves.filter(v => v.id !== valve.id));
    } else {
      setSelectedValves([...selectedValves, valve]);
    }
  };

  const filteredValves = availableValves.filter(valve => {
    const matchesSearch = searchTerm === '' || 
      valve.tag_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (valve.location_code && valve.location_code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStation = filterStation === 'all' || valve.station_code === filterStation;
    return matchesSearch && matchesStation;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedValves.length === 0) {
      alert('Please select at least one valve');
      return;
    }

    setSubmitting(true);
    
    try {
      const workOrderNumber = `WO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .insert({
          work_order_number: workOrderNumber,
          title: `Daily Assignment - ${formData.request_date} - ${formData.requested_by}`,
          description: `Priority: ${formData.priority}. ${selectedValves.length} valves assigned. ${formData.notes}`,
          priority: formData.priority,
          status: 'assigned',
          assigned_crew: formData.assigned_crew,
          due_date: formData.request_date,
          notes: `Khalda Request: ${formData.notes}`
        })
        .select()
        .single();

      if (woError) throw woError;

      const items = selectedValves.map(valve => ({
        work_order_id: workOrder.id,
        asset_id: valve.id,
        status: 'pending'
      }));

      const { error: itemsError } = await supabase
        .from('work_order_items')
        .insert(items);

      if (itemsError) throw itemsError;

      const { error: assignmentError } = await supabase
        .from('daily_assignments')
        .insert({
          request_date: formData.request_date,
          requested_by: formData.requested_by,
          priority: formData.priority,
          requested_valves: selectedValves.map(v => ({
            tag_number: v.tag_number,
            location_code: v.location_code,
            reason: formData.notes || 'Routine maintenance'
          })),
          assigned_work_order_id: workOrder.id,
          assigned_crew: formData.assigned_crew,
          assignment_notes: formData.notes
        });

      if (assignmentError) throw assignmentError;

      alert(`✅ Daily assignment created!\nWork Order: ${workOrderNumber}\nValves: ${selectedValves.length}`);
      
      setSelectedValves([]);
      setFormData({
        ...formData,
        assigned_crew: '',
        notes: ''
      });
      
      fetchAvailableValves();
      
    } catch (err: any) {
      console.error('Submission error:', err);
      alert('Error creating assignment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 focus:ring-red-500';
      case 'high': return 'border-orange-500 focus:ring-orange-500';
      case 'medium': return 'border-amber-500 focus:ring-amber-500';
      default: return 'border-navy-600 focus:ring-green-500';
    }
  };

  const campaignProgress = {
    total: campaign?.total_valves_target || 5758,
    completed: availableValves.length,
    remaining: (campaign?.total_valves_target || 5758) - availableValves.length,
    percent: Math.round((availableValves.length / (campaign?.total_valves_target || 5758)) * 100)
  };

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-navy-50">Daily Assignments</h1>
          <p className="text-navy-300 mt-1">Create work orders for Khalda's production team</p>
        </div>

        <div className="bg-gradient-to-r from-navy-800 to-navy-900 rounded-lg p-4 mb-6 border border-navy-700">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="text-sm text-navy-300">Campaign Progress</p>
              <p className="text-2xl font-bold text-amber-400">{campaignProgress.percent}%</p>
              <p className="text-xs text-navy-400">{campaignProgress.completed} of {campaignProgress.total} valves</p>
            </div>
            <div className="flex-1 max-w-md">
              <div className="w-full bg-navy-700 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${campaignProgress.percent}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-navy-300">Remaining</p>
              <p className="text-2xl font-bold text-navy-50">{campaignProgress.remaining}</p>
              <p className="text-xs text-navy-400">valves to maintain</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-navy-900 rounded-lg border border-navy-700 p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                Select Valves for Today
              </h2>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                    <input
                      type="text"
                      placeholder="Search by tag number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
                <select
                  value={filterStation}
                  onChange={(e) => setFilterStation(e.target.value)}
                  className="px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="all">All Stations</option>
                  {stations.map(s => (
                    <option key={s.code} value={s.code}>{s.code}</option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="text-center py-8 text-navy-400">Loading valves...</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredValves.map(valve => (
                    <label
                      key={valve.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                        selectedValves.find(v => v.id === valve.id)
                          ? 'bg-amber-500/20 border border-amber-500/30'
                          : 'bg-navy-800/50 hover:bg-navy-800 border border-navy-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedValves.find(v => v.id === valve.id)}
                        onChange={() => toggleValveSelection(valve)}
                        className="w-4 h-4 rounded border-navy-600 text-amber-500 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 text-sm">{valve.tag_number}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-navy-700 text-navy-300">
                            {valve.station_code}
                          </span>
                          {valve.criticality === 'critical' && (
                            <span className="text-xs text-red-400">⚠️ Critical</span>
                          )}
                        </div>
                        <p className="text-xs text-navy-400">{valve.sct_code || 'Unknown type'}</p>
                      </div>
                      <MapPin className="w-4 h-4 text-navy-500" />
                    </label>
                  ))}
                  {filteredValves.length === 0 && (
                    <div className="text-center py-8 text-navy-400">
                      No valves found matching your filters
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-navy-900 rounded-lg border border-navy-700 p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-400" />
              Create Assignment
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-navy-300 mb-1">Request Date</label>
                <input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) => setFormData({...formData, request_date: e.target.value})}
                  className="w-full p-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-navy-300 mb-1">Requested By</label>
                <input
                  type="text"
                  value={formData.requested_by}
                  onChange={(e) => setFormData({...formData, requested_by: e.target.value})}
                  className="w-full p-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-navy-300 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className={`w-full p-2 bg-navy-800 border rounded-lg focus:outline-none ${getPriorityColor(formData.priority)}`}
                >
                  <option value="urgent">🚨 Urgent</option>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-navy-300 mb-1">Assign Crew</label>
                <input
                  type="text"
                  placeholder="e.g., Crew A - Station Team"
                  value={formData.assigned_crew}
                  onChange={(e) => setFormData({...formData, assigned_crew: e.target.value})}
                  className="w-full p-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-sm text-navy-300 mb-1">Notes</label>
                <textarea
                  placeholder="Additional instructions from Khalda..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full p-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="border-t border-navy-700 pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-navy-300">Selected Valves:</span>
                  <span className="font-bold text-amber-400">{selectedValves.length}</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting || selectedValves.length === 0}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-navy-950 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    'Creating...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Create Work Order
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link 
            href="/campaign-dashboard" 
            className="text-navy-300 hover:text-amber-400 text-sm flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            View Campaign Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}