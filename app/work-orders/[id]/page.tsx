'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useUserRole } from '@/lib/useUserRole'; // ✅ Added role hook
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  Calendar, 
  Wrench, 
  Save,
  Trash2,
  AlertTriangle,
  Download,
  FileText,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  X
} from 'lucide-react';

const supabase = createSupabaseBrowserClient();

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // ✅ Role-based access control
  const { isClient, canEdit, canDelete } = useUserRole();
  
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rollingForward, setRollingForward] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddAssetsModal, setShowAddAssetsModal] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    status: '',
    actual_hours: '',
    notes: ''
  });

  useEffect(() => {
    if (params.id) {
      fetchWorkOrder();
    }
  }, [params.id]);

  async function fetchWorkOrder() {
    setLoading(true);
    setError(null);
    try {
      // Fetch work order
      const { data: workOrderData, error: woError } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', params.id)
        .single();

      if (woError) throw woError;
      
      // Fetch items with asset details - FIXED: Use assets_clean
      const { data: itemsData, error: itemsError } = await supabase
        .from('work_order_items')
        .select(`
          id,
          asset_id,
          status,
          asset:assets_clean!inner(
            id,
            tag_number,
            location_code,
            stations(code)
          )
        `)
        .eq('work_order_id', params.id);
      
      if (itemsError) {
        console.error('Items fetch error:', itemsError);
      }
      
      // Ensure items is always an array
      const items = itemsData || [];
      
      setWorkOrder({
        ...workOrderData,
        items: items
      });
      
      setFormData({
        status: workOrderData.status,
        actual_hours: workOrderData.actual_hours?.toString() || '',
        notes: workOrderData.notes || ''
      });
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // FIXED: Update individual item status
  async function updateItemStatus(itemId: string, newStatus: string) {
    // ✅ Block clients from editing
    if (isClient) {
      alert('View-only access: Contact your supervisor to update valve status');
      return;
    }
    
    try {
      console.log(`Updating item ${itemId} to ${newStatus}`);
      
      const { error } = await supabase
        .from('work_order_items')
        .update({ status: newStatus })
        .eq('id', itemId);

      if (error) {
        console.error('Item update error:', error);
        throw error;
      }
      
      console.log('Item updated successfully');
      // Refresh the work order to get latest status
      await fetchWorkOrder();
    } catch (err: any) {
      console.error('Item update failed:', err);
      alert('Failed to update valve status: ' + err.message);
    }
  }

  async function updateWorkOrderStatus(newStatus: string) {
    if (isClient) {
      alert('View-only access: Contact your supervisor to update work order status');
      return;
    }
    
    setUpdating(true);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_date = new Date().toISOString().split('T')[0];
      }
      
      const { error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', params.id);

      if (error) throw error;
      await fetchWorkOrder();
      alert(`Work order marked as ${newStatus}`);
    } catch (err: any) {
      alert('Update failed: ' + err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function updateWorkOrder() {
    if (isClient) {
      alert('View-only access: Contact your supervisor to update work order details');
      return;
    }
    
    setUpdating(true);
    setError(null);
    try {
      const updates: any = {};
      
      if (formData.status !== workOrder?.status) updates.status = formData.status;
      if (formData.actual_hours) {
        const hours = parseFloat(formData.actual_hours);
        if (!isNaN(hours)) updates.actual_hours = hours;
      }
      if (formData.notes !== workOrder?.notes) updates.notes = formData.notes;
      
      if (formData.status === 'completed' && workOrder?.status !== 'completed') {
        updates.completed_date = new Date().toISOString().split('T')[0];
      }
      
      if (Object.keys(updates).length === 0) {
        alert('No changes to save');
        setUpdating(false);
        return;
      }
      
      const { error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', params.id);

      if (error) throw error;
      await fetchWorkOrder();
      alert('Work order updated successfully');
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  // FIXED: Mark all items as completed
  async function markAllItemsCompleted() {
    if (isClient) {
      alert('View-only access: Contact your supervisor to complete work orders');
      return;
    }
    
    if (!workOrder?.items) return;
    
    try {
      const itemIds = workOrder.items.map((item: any) => item.id);
      
      // Update all items to completed
      const { error } = await supabase
        .from('work_order_items')
        .update({ status: 'completed' })
        .in('id', itemIds);

      if (error) throw error;
      
      // Refresh to get updated status
      await fetchWorkOrder();
      
      // Now mark the work order as completed
      await updateWorkOrderStatus('completed');
      
    } catch (err: any) {
      alert('Failed to mark all items: ' + err.message);
    }
  }

  async function rollForwardToTomorrow() {
    if (isClient) {
      alert('View-only access: Contact your supervisor to transfer valves');
      return;
    }
    
    const pendingCount = workOrder?.items?.filter((i: any) => i.status === 'pending').length;
    if (pendingCount === 0) {
      alert('No pending valves to transfer');
      return;
    }
    
    if (!confirm(`Transfer ${pendingCount} pending valves to tomorrow's work order?`)) return;
    
    setRollingForward(true);
    try {
      const { data, error } = await supabase.rpc('transfer_remaining_to_next_day', {
        p_work_order_id: params.id,
        p_closure_notes: `End of day transfer on ${new Date().toLocaleDateString()}`
      });
      
      if (error) throw error;
      
      if (data?.success) {
        alert(`✅ ${data.transferred_count} valves transferred to ${data.new_wo_number}`);
        router.push(`/work-orders/${data.new_wo_id}`);
      } else {
        alert(data?.message || 'Transfer failed');
      }
    } catch (err: any) {
      alert('Transfer failed: ' + err.message);
    } finally {
      setRollingForward(false);
    }
  }

  async function fetchAvailableFutureAssets() {
    setLoadingAssets(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          due_date,
          items:work_order_items(
            id,
            asset_id,
            status,
            asset:assets_clean(
              id,
              tag_number,
              location_code,
              stations(code)
            )
          )
        `)
        .eq('status', 'pending')
        .neq('id', params.id)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .limit(10);
      
      if (error) throw error;
      
      const futureAssets: any[] = [];
      (data || []).forEach((wo: any) => {
        (wo.items || []).forEach((item: any) => {
          if (item.status === 'pending' && item.asset) {
            futureAssets.push({
              id: item.asset_id,
              tag_number: item.asset.tag_number,
              location_code: item.asset.location_code,
              station_code: item.asset.stations?.code,
              source_wo_id: wo.id,
              source_wo_number: wo.work_order_number
            });
          }
        });
      });
      
      setAvailableAssets(futureAssets);
    } catch (err) {
      console.error('Fetch future assets error:', err);
    } finally {
      setLoadingAssets(false);
    }
  }

  async function addAssetsToWorkOrder() {
    if (isClient) {
      alert('View-only access: Contact your supervisor to add valves');
      return;
    }
    
    if (selectedAssets.length === 0) {
      alert('Please select assets to add');
      return;
    }
    
    setRollingForward(true);
    try {
      // Add selected assets to current work order
      const items = selectedAssets.map(asset => ({
        work_order_id: params.id,
        asset_id: asset.id,
        status: 'pending'
      }));
      
      const { error: insertError } = await supabase
        .from('work_order_items')
        .insert(items);
      
      if (insertError) throw insertError;
      
      // Remove from source work orders
      const sourceWoIds = [...new Set(selectedAssets.map(a => a.source_wo_id))];
      for (const woId of sourceWoIds) {
        const assetIds = selectedAssets.filter(a => a.source_wo_id === woId).map(a => a.id);
        const { error: deleteError } = await supabase
          .from('work_order_items')
          .delete()
          .eq('work_order_id', woId)
          .in('asset_id', assetIds);
        
        if (deleteError) console.error('Delete from source error:', deleteError);
      }
      
      alert(`✅ Added ${selectedAssets.length} valve(s) to today's work order`);
      setShowAddAssetsModal(false);
      setSelectedAssets([]);
      fetchWorkOrder();
    } catch (err: any) {
      alert('Add failed: ' + err.message);
    } finally {
      setRollingForward(false);
    }
  }

  const toggleAssetSelection = (asset: any) => {
    if (selectedAssets.find(a => a.id === asset.id)) {
      setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id));
    } else {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  async function exportToCSV() {
    if (!workOrder) return;
    
    const rows = [['Tag Number', 'Location Code', 'Station', 'Status']];
    for (const item of workOrder.items || []) {
      rows.push([
        item.asset?.tag_number || item.asset_id,
        item.asset?.location_code || '-',
        item.asset?.stations?.code || '-',
        item.status
      ]);
    }
    
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `work-order-${workOrder.work_order_number}-assets.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportToPDF() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print');
      return;
    }
    
    const assetRows = (workOrder?.items || []).map((item: any) => `
      <tr style="border-bottom: 1px solid #333;">
        <td style="padding: 8px;">${item.asset?.tag_number || item.asset_id}</td>
        <td style="padding: 8px;">${item.asset?.location_code || '-'}</td>
        <td style="padding: 8px;">${item.asset?.stations?.code || '-'}</td>
        <td style="padding: 8px;">${item.status}</td>
      </tr>
    `).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Work Order ${workOrder?.work_order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #333; color: white; padding: 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()">Print / Save as PDF</button>
          <button onclick="window.close()">Close</button>
        </div>
        <div class="header">
          <h1>GHARIB GULF MAINTENANCE SYSTEM</h1>
          <h2>Work Order: ${workOrder?.work_order_number}</h2>
          <p>${workOrder?.title}</p>
        </div>
        <div class="info">
          <p><strong>Crew:</strong> ${workOrder?.assigned_crew || 'Unassigned'}</p>
          <p><strong>Due Date:</strong> ${workOrder?.due_date || 'Not set'}</p>
          <p><strong>Priority:</strong> ${workOrder?.priority?.toUpperCase()}</p>
        </div>
        <h3>Valves (${workOrder?.items?.length || 0})</h3>
        <table>
          <thead><tr><th>Tag Number</th><th>Location</th><th>Station</th><th>Status</th></tr></thead>
          <tbody>${assetRows}</tbody>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">Generated by Gharib Gulf Maintenance System</p>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="min-h-screen bg-navy-950 p-6">
        <div className="max-w-md mx-auto bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Work Order Not Found</h2>
          <p className="text-navy-300 mb-4">{error || 'The requested work order does not exist.'}</p>
          <button onClick={() => router.push('/work-orders')} className="px-4 py-2 bg-amber-500 text-navy-950 rounded-lg">
            Back to Work Orders
          </button>
        </div>
      </div>
    );
  }

  const completedCount = workOrder.items?.filter((i: any) => i.status === 'completed').length || 0;
  const pendingCount = workOrder.items?.filter((i: any) => i.status === 'pending').length || 0;
  const totalCount = workOrder.items?.length || 0;

  const statusConfig: Record<string, any> = {
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Completed' },
    in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock, label: 'In Progress' },
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pending' },
    assigned: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: User, label: 'Assigned' },
    cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle, label: 'Cancelled' }
  };
  
  const currentStatus = statusConfig[workOrder.status] || statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button onClick={() => router.push('/work-orders')} className="flex items-center gap-2 text-navy-300 hover:text-navy-100 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Work Orders
        </button>

        {/* Main Card */}
        <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{workOrder.title}</h1>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${currentStatus.bg} ${currentStatus.text}`}>
                  <StatusIcon className="w-4 h-4" /> {currentStatus.label}
                </span>
              </div>
              <p className="text-navy-400 font-mono text-sm">{workOrder.work_order_number}</p>
            </div>
            
            {/* Action Buttons Group */}
            <div className="flex flex-wrap gap-2">
              {/* Export Buttons - Available to all roles */}
              <button onClick={exportToCSV} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-900/50 text-green-400 border border-green-500/30 hover:bg-green-900/70 transition">
                <FileSpreadsheet className="w-4 h-4" /> CSV
              </button>
              <button onClick={exportToPDF} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-900/50 text-blue-400 border border-blue-500/30 hover:bg-blue-900/70 transition">
                <FileText className="w-4 h-4" /> PDF
              </button>
              
              {/* ✅ Delete Button - Only for Admins */}
              {canDelete && (
                <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-900/50 text-red-400 border border-red-500/30 hover:bg-red-900/70 transition">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          {workOrder.description && (
            <p className="text-navy-300 mb-4 border-l-2 border-amber-500 pl-3">{workOrder.description}</p>
          )}

          {/* Progress Summary Bar */}
          <div className="mb-6 p-4 bg-navy-800/50 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-navy-300">Progress</span>
              <span className="text-navy-300">{completedCount} of {totalCount} valves completed</span>
            </div>
            <div className="w-full bg-navy-700 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${totalCount ? (completedCount * 100 / totalCount) : 0}%` }} />
            </div>
            <div className="flex justify-between text-xs text-navy-400 mt-2">
              <span>✅ Completed: {completedCount}</span>
              <span>⏳ Pending: {pendingCount}</span>
            </div>
          </div>

          {/* Work Order Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-navy-800/50 rounded-lg">
            <div><span className="text-navy-400">Crew:</span> <span className="text-navy-100">{workOrder.assigned_crew || 'Unassigned'}</span></div>
            <div><span className="text-navy-400">Due Date:</span> <span className="text-navy-100">{workOrder.due_date || 'Not set'}</span></div>
            <div><span className="text-navy-400">Priority:</span> <span className={`font-bold ${
              workOrder.priority === 'urgent' ? 'text-red-400' :
              workOrder.priority === 'high' ? 'text-orange-400' :
              workOrder.priority === 'medium' ? 'text-amber-400' : 'text-navy-300'
            }`}>{workOrder.priority?.toUpperCase()}</span></div>
            <div><span className="text-navy-400">Est. Hours:</span> <span className="text-navy-100">{workOrder.estimated_hours || '-'}</span></div>
          </div>

          {/* Assets Table - FIXED: Individual item updates now work */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Wrench className="w-4 h-4 text-amber-400" /> Valves ({totalCount})</h3>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-navy-800 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Tag Number</th>
                    <th className="text-left p-2">Location</th>
                    <th className="text-left p-2">Station</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800">
                  {workOrder.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-navy-800/50">
                      <td className="p-2 font-mono text-amber-400">{item.asset?.tag_number || item.asset_id}</td>
                      <td className="p-2">{item.asset?.location_code || '-'}</td>
                      <td className="p-2">{item.asset?.stations?.code || '-'}</td>
                      <td className="p-2">
                        {/* ✅ Status Dropdown - Read-only for clients */}
                        {canEdit ? (
                          <select
                            value={item.status}
                            onChange={(e) => updateItemStatus(item.id, e.target.value)}
                            className="px-2 py-1 bg-navy-800 border border-navy-600 rounded text-xs"
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="skipped">Skipped</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {item.status === 'pending' && canEdit && (
                          <button
                            onClick={() => updateItemStatus(item.id, 'completed')}
                            className="text-xs text-green-400 hover:text-green-300"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ✅ END OF DAY ACTIONS SECTION - Hidden for clients */}
          {!isClient && (
            <div className="border-t border-navy-700 pt-6 mt-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-amber-400">
                <Clock className="w-5 h-5" />
                END OF DAY ACTIONS
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Button 1: All Valves Done */}
                <button
                  onClick={markAllItemsCompleted}
                  disabled={pendingCount === 0 && completedCount === totalCount}
                  className={`py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                    pendingCount === 0 && completedCount === totalCount
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : pendingCount > 0
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-navy-700 text-navy-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  ✅ SCENARIO 1: All Done - Mark All Complete
                </button>

                {/* Button 2: Partial Completion - Transfer Remaining */}
                <button
                  onClick={rollForwardToTomorrow}
                  disabled={pendingCount === 0 || rollingForward}
                  className={`py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                    pendingCount > 0
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-navy-700 text-navy-400 cursor-not-allowed'
                  }`}
                >
                  <ArrowRight className="w-4 h-4" />
                  ⏸️ SCENARIO 2: Partial Day ({pendingCount} remaining)
                </button>

                {/* Button 3: Early Finish - Add More Valves */}
                <button
                  onClick={() => {
                    fetchAvailableFutureAssets();
                    setShowAddAssetsModal(true);
                  }}
                  className="py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  🚀 SCENARIO 3: Early Finish - Add Valves
                </button>
              </div>
            </div>
          )}

          {/* ✅ Manual Update Section - Hidden for clients */}
          {!isClient && (
            <div className="border-t border-navy-700 pt-6 mt-4">
              <h3 className="font-semibold mb-3">Manual Status Update</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})} 
                  className="p-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400"
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <input 
                  type="number" 
                  step="0.5" 
                  placeholder="Actual hours" 
                  value={formData.actual_hours} 
                  onChange={(e) => setFormData({...formData, actual_hours: e.target.value})} 
                  className="p-2 bg-navy-800 border border-navy-600 rounded-lg"
                />
                <button 
                  onClick={updateWorkOrder} 
                  disabled={updating} 
                  className="py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-navy-950 rounded-lg font-medium transition"
                >
                  <Save className="w-4 h-4 inline mr-1" /> {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-navy-900 rounded-lg border border-red-500/30 p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <h3 className="text-xl font-bold text-red-400">Delete Work Order</h3>
            </div>
            <p className="text-navy-200 mb-2">Are you sure you want to delete this work order?</p>
            <p className="text-sm text-navy-400 mb-4"><strong>{workOrder?.work_order_number}</strong> - {workOrder?.title}</p>
            <div className="flex gap-3">
              <button onClick={async () => {
                const { error } = await supabase
                  .from('work_orders')
                  .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
                  .eq('id', params.id);
                if (!error) router.push('/work-orders');
              }} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg">Delete</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-navy-700 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Assets Modal (Scenario 3) */}
      {showAddAssetsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-900 rounded-lg border border-blue-500/30 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                <Plus className="w-5 h-5" /> Add Valves from Future Work Orders
              </h3>
              <button onClick={() => setShowAddAssetsModal(false)} className="text-navy-400 hover:text-navy-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-navy-300 mb-4">Select valves to add to today's work order (early finish scenario):</p>
            
            {loadingAssets ? (
              <div className="text-center py-8 text-navy-400">Loading available valves...</div>
            ) : availableAssets.length === 0 ? (
              <div className="text-center py-8 text-navy-400">No pending valves available from future work orders</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableAssets.map((asset) => (
                  <label key={asset.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                    selectedAssets.find(a => a.id === asset.id)
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-navy-800/50 hover:bg-navy-800 border border-navy-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={!!selectedAssets.find(a => a.id === asset.id)}
                      onChange={() => toggleAssetSelection(asset)}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-400 text-sm">{asset.tag_number}</span>
                        <span className="text-xs text-navy-400">{asset.station_code}</span>
                      </div>
                      <p className="text-xs text-navy-500">From: {asset.source_wo_number}</p>
                    </div>
                    <span className="text-xs text-navy-400">{asset.location_code || '-'}</span>
                  </label>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={addAssetsToWorkOrder}
                disabled={selectedAssets.length === 0 || rollingForward}
                className="flex-1 py-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/50 text-white rounded-lg font-medium"
              >
                {rollingForward ? 'Adding...' : `Add ${selectedAssets.length} Valve(s)`}
              </button>
              <button onClick={() => setShowAddAssetsModal(false)} className="flex-1 py-2 bg-navy-700 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
