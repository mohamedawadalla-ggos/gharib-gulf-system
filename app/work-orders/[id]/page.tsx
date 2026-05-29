// app/work-orders/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useUserRole } from '@/lib/useUserRole';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';
import { 
  ArrowLeft, CheckCircle, Clock, AlertCircle, User, Calendar, 
  Wrench, Save, Trash2, AlertTriangle, FileText, 
  FileSpreadsheet, Plus, ArrowRight, X, Loader2
} from 'lucide-react';

const supabase = createSupabaseBrowserClient();

// TypeScript Interfaces
interface Asset {
  id: string;
  tag_number: string;
  location_code: string | null;
  stations?: { code: string } | null;
}

interface WorkOrderItem {
  id: string;
  asset_id: string;
  status: 'pending' | 'completed' | 'skipped';
  asset?: Asset | null;
}

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_crew: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  notes: string | null;
  completed_date?: string | null;  // ✅ Added for completed work orders
  items?: WorkOrderItem[];
}

interface FormData {
  status: string;
  actual_hours: string;
  notes: string;
}

interface FutureAsset extends Asset {
  source_wo_id?: string;
  source_wo_number?: string;
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { isClient, canEdit, canDelete } = useUserRole();
  
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rollingForward, setRollingForward] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddAssetsModal, setShowAddAssetsModal] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<FutureAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<FutureAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    status: '',
    actual_hours: '',
    notes: ''
  });

  // Fetch work order with nested asset data
  const fetchWorkOrder = useCallback(async () => {
    if (!params.id) return;
    
    setLoading(true);
    try {
      // Fetch work order
      const { data: workOrderData, error: woError } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', params.id)
        .single();

      if (woError) throw woError;
      
      // Fetch items with proper nested asset join
      const { data: itemsData, error: itemsError } = await supabase
        .from('work_order_items')
        .select(`
          id,
          asset_id,
          status,
          asset:assets (
            id,
            tag_number,
            location_code,
            stations ( code )
          )
        `)
        .eq('work_order_id', params.id);
      
      if (itemsError) {
        console.error('Items fetch error:', itemsError);
        showToast('Failed to load valve details', 'error');
      }
      
      const items = itemsData || [];
      
      setWorkOrder({
        ...workOrderData,
        items: items
      } as WorkOrder);
      
      setFormData({
        status: workOrderData.status,
        actual_hours: workOrderData.actual_hours?.toString() || '',
        notes: workOrderData.notes || ''
      });
    } catch (err: any) {
      console.error('Fetch error:', err);
      showToast(err.message || 'Failed to load work order', 'error');
    } finally {
      setLoading(false);
    }
  }, [params.id, showToast]);

  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  // Update individual item status
  async function updateItemStatus(itemId: string, newStatus: string) {
    if (isClient) {
      showToast('View-only access: Contact your supervisor', 'error');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('work_order_items')
        .update({ status: newStatus })
        .eq('id', itemId);

      if (error) throw error;
      
      showToast('Valve status updated', 'success');
      await fetchWorkOrder();
    } catch (err: any) {
      console.error('Item update failed:', err);
      showToast('Failed to update: ' + err.message, 'error');
    }
  }

  // Update work order status
  async function updateWorkOrderStatus(newStatus: string) {
    if (isClient) {
      showToast('View-only access: Contact your supervisor', 'error');
      return;
    }
    
    setUpdating(true);
    try {
      const updates: Partial<WorkOrder> = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_date = new Date().toISOString().split('T')[0];
      }
      
      const { error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', params.id);

      if (error) throw error;
      
      showToast(`Work order marked as ${newStatus}`, 'success');
      await fetchWorkOrder();
    } catch (err: any) {
      showToast('Update failed: ' + err.message, 'error');
    } finally {
      setUpdating(false);
    }
  }

  // Manual work order update
  async function updateWorkOrder() {
    if (isClient) {
      showToast('View-only access: Contact your supervisor', 'error');
      return;
    }
    
    setUpdating(true);
    try {
      const updates: Partial<WorkOrder> = {};
      
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
        showToast('No changes to save', 'info');
        setUpdating(false);
        return;
      }
      
      const { error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', params.id);

      if (error) throw error;
      
      showToast('Work order updated successfully', 'success');
      await fetchWorkOrder();
    } catch (err: any) {
      console.error('Update error:', err);
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setUpdating(false);
    }
  }

  // Mark all items as completed
  async function markAllItemsCompleted() {
    if (isClient) {
      showToast('View-only access: Contact your supervisor', 'error');
      return;
    }
    
    if (!workOrder?.items) return;
    
    try {
      const itemIds = workOrder.items.map((item) => item.id);
      
      const { error } = await supabase
        .from('work_order_items')
        .update({ status: 'completed' })
        .in('id', itemIds);

      if (error) throw error;
      
      await fetchWorkOrder();
      await updateWorkOrderStatus('completed');
      showToast('All valves marked as completed', 'success');
    } catch (err: any) {
      showToast('Failed: ' + err.message, 'error');
    }
  }

  // Roll forward pending items to tomorrow
  async function rollForwardToTomorrow() {
    if (isClient) {
      showToast('View-only access: Contact your supervisor', 'error');
      return;
    }
    
    const pendingCount = workOrder?.items?.filter((i) => i.status === 'pending').length || 0;
    if (pendingCount === 0) {
      showToast('No pending valves to transfer', 'info');
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
        showToast(`${data.transferred_count} valves transferred`, 'success');
        router.push(`/work-orders/${data.new_wo_id}`);
      } else {
        showToast(data?.message || 'Transfer failed', 'error');
      }
    } catch (err: any) {
      showToast('Transfer failed: ' + err.message, 'error');
    } finally {
      setRollingForward(false);
    }
  }

  // Fetch available future assets for adding
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
            asset:assets (
              id,
              tag_number,
              location_code,
              stations ( code )
            )
          )
        `)
        .eq('status', 'pending')
        .neq('id', params.id)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .limit(10);
      
      if (error) throw error;
      
      const futureAssets: FutureAsset[] = [];
      (data || []).forEach((wo: any) => {
        (wo.items || []).forEach((item: any) => {
          if (item.status === 'pending' && item.asset) {
            futureAssets.push({
              id: item.asset_id,
              tag_number: item.asset.tag_number,
              location_code: item.asset.location_code,
              stations: item.asset.stations,
              source_wo_id: wo.id,
              source_wo_number: wo.work_order_number
            });
          }
        });
      });
      
      setAvailableAssets(futureAssets);
    } catch (err) {
      console.error('Fetch future assets error:', err);
      showToast('Failed to load available valves', 'error');
    } finally {
      setLoadingAssets(false);
    }
  }

  // Add selected assets to current work order
  async function addAssetsToWorkOrder() {
    if (isClient) {
      showToast('View-only access: Contact your supervisor', 'error');
      return;
    }
    
    if (selectedAssets.length === 0) {
      showToast('Please select valves to add', 'error');
      return;
    }
    
    setRollingForward(true);
    try {
      const items = selectedAssets.map(asset => ({
        work_order_id: params.id,
        asset_id: asset.id,
        status: 'pending'
      }));
      
      const { error: insertError } = await supabase
        .from('work_order_items')
        .insert(items);
      
      if (insertError) throw insertError;
      
      const sourceWoIds = [...new Set(selectedAssets.map(a => a.source_wo_id).filter(Boolean))];
      for (const woId of sourceWoIds) {
        const assetIds = selectedAssets
          .filter(a => a.source_wo_id === woId)
          .map(a => a.id);
        
        if (assetIds.length > 0) {
          await supabase
            .from('work_order_items')
            .delete()
            .eq('work_order_id', woId)
            .in('asset_id', assetIds);
        }
      }
      
      showToast(`✅ Added ${selectedAssets.length} valve(s)`, 'success');
      setShowAddAssetsModal(false);
      setSelectedAssets([]);
      fetchWorkOrder();
    } catch (err: any) {
      showToast('Add failed: ' + err.message, 'error');
    } finally {
      setRollingForward(false);
    }
  }

  const toggleAssetSelection = (asset: FutureAsset) => {
    if (selectedAssets.find(a => a.id === asset.id)) {
      setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id));
    } else {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  // CSV Export with proper nested data access
  async function exportToCSV() {
    if (!workOrder?.items) return;
    
    const rows = [['Tag Number', 'Location Code', 'Station', 'Status']];
    for (const item of workOrder.items) {
      rows.push([
        item.asset?.tag_number || 'N/A',
        item.asset?.location_code || '-',
        item.asset?.stations?.code || '-',
        item.status
      ]);
    }
    
    const csvContent = [
      rows[0].join(','),
      ...rows.slice(1).map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `work-order-${workOrder.work_order_number}-assets.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    showToast('CSV exported successfully', 'success');
  }

  // PDF Export
  function exportToPDF() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow pop-ups to print', 'error');
      return;
    }
    
    const assetRows = (workOrder?.items || []).map((item) => `
      <tr style="border-bottom: 1px solid #333;">
        <td style="padding: 8px;">${item.asset?.tag_number || 'N/A'}</td>
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
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 20px; }
          .info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1e293b; color: white; padding: 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #0ea5e9; color: white; border: none; border-radius: 4px; cursor: pointer;">Print / Save as PDF</button>
          <button onclick="window.close()" style="padding: 8px 16px; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        </div>
        <div class="header">
          <h1 style="margin: 0;">GHARIB GULF MAINTENANCE SYSTEM</h1>
          <h2 style="margin: 10px 0;">Work Order: ${workOrder?.work_order_number}</h2>
          <p style="margin: 0; color: #666;">${workOrder?.title}</p>
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
        <p style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">Generated by Gharib Gulf Maintenance System • ${new Date().toLocaleString()}</p>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    showToast('PDF ready - use browser print dialog', 'info');
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-navy-300">Loading work order...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (!workOrder) {
    return (
      <div className="min-h-screen bg-navy-950 p-6">
        <div className="max-w-md mx-auto bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Work Order Not Found</h2>
          <p className="text-navy-300 mb-4">The requested work order does not exist or was deleted.</p>
          <button 
            onClick={() => router.push('/work-orders')} 
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg transition"
          >
            Back to Work Orders
          </button>
        </div>
      </div>
    );
  }

  const completedCount = workOrder.items?.filter((i) => i.status === 'completed').length || 0;
  const pendingCount = workOrder.items?.filter((i) => i.status === 'pending').length || 0;
  const totalCount = workOrder.items?.length || 0;
  const progressPercent = totalCount ? Math.round((completedCount * 100) / totalCount) : 0;

  const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Completed' },
    in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock, label: 'In Progress' },
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pending' },
    assigned: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: User, label: 'Assigned' },
    cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle, label: 'Cancelled' }
  };
  
  const currentStatus = statusConfig[workOrder.status] || statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button 
          onClick={() => router.push('/work-orders')} 
          className="flex items-center gap-2 text-navy-300 hover:text-navy-100 mb-4 transition"
          aria-label="Back to work orders list"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Work Orders
        </button>

        {/* Main Card */}
        <div className="bg-navy-900 rounded-lg border border-navy-700 p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                <h1 className="text-xl md:text-2xl font-bold">{workOrder.title}</h1>
                <span className={`inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${currentStatus.bg} ${currentStatus.text}`} role="status">
                  <StatusIcon className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" /> {currentStatus.label}
                </span>
              </div>
              <p className="text-navy-400 font-mono text-sm">{workOrder.work_order_number}</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={exportToCSV} 
                className="inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm bg-green-900/50 text-green-400 border border-green-500/30 hover:bg-green-900/70 transition"
                aria-label="Export to CSV"
              >
                <FileSpreadsheet className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" /> CSV
              </button>
              <button 
                onClick={exportToPDF} 
                className="inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm bg-blue-900/50 text-blue-400 border border-blue-500/30 hover:bg-blue-900/70 transition"
                aria-label="Export to PDF"
              >
                <FileText className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" /> PDF
              </button>
              
              {canDelete && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm bg-red-900/50 text-red-400 border border-red-500/30 hover:bg-red-900/70 transition"
                  aria-label="Delete work order"
                >
                  <Trash2 className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          {workOrder.description && (
            <p className="text-navy-300 mb-4 border-l-2 border-amber-500 pl-3 text-sm">{workOrder.description}</p>
          )}

          {/* Progress Bar */}
          <div className="mb-6 p-4 bg-navy-800/50 rounded-lg" role="region" aria-label="Progress summary">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-navy-300">Progress</span>
              <span className="text-navy-300">{completedCount} of {totalCount} valves completed</span>
            </div>
            <div className="w-full bg-navy-700 rounded-full h-2" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs text-navy-400 mt-2">
              <span>✅ Completed: {completedCount}</span>
              <span>⏳ Pending: {pendingCount}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 p-4 bg-navy-800/50 rounded-lg" role="region" aria-label="Work order details">
            <div>
              <span className="text-navy-400 text-xs block">Crew:</span> 
              <span className="text-navy-100 text-sm">{workOrder.assigned_crew || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-navy-400 text-xs block">Due Date:</span> 
              <span className="text-navy-100 text-sm">{workOrder.due_date || 'Not set'}</span>
            </div>
            <div>
              <span className="text-navy-400 text-xs block">Priority:</span> 
              <span className={`font-bold text-sm ${
                workOrder.priority === 'urgent' ? 'text-red-400' :
                workOrder.priority === 'high' ? 'text-orange-400' :
                workOrder.priority === 'medium' ? 'text-amber-400' : 'text-navy-300'
              }`}>{workOrder.priority?.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-navy-400 text-xs block">Est. Hours:</span> 
              <span className="text-navy-100 text-sm">{workOrder.estimated_hours || '-'}</span>
            </div>
          </div>

          {/* Valves Table */}
          <div className="mb-6" role="region" aria-label="Valves list">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" aria-hidden="true" /> 
              Valves ({totalCount})
            </h3>
            <div className="overflow-x-auto max-h-64 overflow-y-auto border border-navy-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-navy-800 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="text-left p-2 font-medium">Tag Number</th>
                    <th scope="col" className="text-left p-2 font-medium">Location</th>
                    <th scope="col" className="text-left p-2 font-medium">Station</th>
                    <th scope="col" className="text-left p-2 font-medium">Status</th>
                    <th scope="col" className="text-left p-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800">
                  {workOrder.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-navy-800/50 transition">
                      <td className="p-2 font-mono text-amber-400 text-xs md:text-sm">
                        {item.asset?.tag_number || 'N/A'}
                      </td>
                      <td className="p-2 text-xs md:text-sm">
                        {item.asset?.location_code || '-'}
                      </td>
                      <td className="p-2 text-xs md:text-sm">
                        {item.asset?.stations?.code || '-'}
                      </td>
                      <td className="p-2">
                        {canEdit ? (
                          <select
                            value={item.status}
                            onChange={(e) => updateItemStatus(item.id, e.target.value)}
                            className="px-2 py-1 bg-navy-800 border border-navy-600 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                            aria-label={`Update status for valve ${item.asset?.tag_number}`}
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
                          }`} role="status">
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {item.status === 'pending' && canEdit && (
                          <button
                            onClick={() => updateItemStatus(item.id, 'completed')}
                            className="text-xs text-green-400 hover:text-green-300 transition"
                            aria-label={`Mark valve ${item.asset?.tag_number} as completed`}
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!workOrder.items || workOrder.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-navy-400 text-sm">
                        No valves assigned to this work order
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* End of Day Actions - Hidden for clients */}
          {!isClient && (
            <div className="border-t border-navy-700 pt-6 mt-4" role="region" aria-label="End of day actions">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-amber-400">
                <Clock className="w-5 h-5" aria-hidden="true" />
                END OF DAY ACTIONS
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={markAllItemsCompleted}
                  disabled={pendingCount === 0 && completedCount === totalCount}
                  className={`py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm ${
                    pendingCount === 0 && completedCount === totalCount
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : pendingCount > 0
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-navy-700 text-navy-400 cursor-not-allowed'
                  }`}
                  aria-label="Mark all valves as completed"
                >
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  ✅ All Done
                </button>

                <button
                  onClick={rollForwardToTomorrow}
                  disabled={pendingCount === 0 || rollingForward}
                  className={`py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm ${
                    pendingCount > 0
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-navy-700 text-navy-400 cursor-not-allowed'
                  }`}
                  aria-label="Transfer pending valves to tomorrow"
                >
                  {rollingForward ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  )}
                  ⏸️ Transfer {pendingCount} Remaining
                </button>

                <button
                  onClick={() => {
                    fetchAvailableFutureAssets();
                    setShowAddAssetsModal(true);
                  }}
                  className="py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm"
                  aria-label="Add more valves from future work orders"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  🚀 Add Valves
                </button>
              </div>
            </div>
          )}

          {/* Manual Update Section - Hidden for clients */}
          {!isClient && (
            <div className="border-t border-navy-700 pt-6 mt-4" role="region" aria-label="Manual update">
              <h3 className="font-semibold mb-3">Manual Status Update</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})} 
                  className="p-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:border-amber-400 text-sm"
                  aria-label="Update work order status"
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
                  className="p-2 bg-navy-800 border border-navy-600 rounded-lg text-sm"
                  aria-label="Enter actual hours worked"
                />
                <button 
                  onClick={updateWorkOrder} 
                  disabled={updating} 
                  className="py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-navy-950 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm"
                  aria-label="Save changes"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" aria-hidden="true" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="bg-navy-900 rounded-lg border border-red-500/30 p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" aria-hidden="true" />
              <h3 id="delete-modal-title" className="text-xl font-bold text-red-400">Delete Work Order</h3>
            </div>
            <p className="text-navy-200 mb-2">Are you sure you want to delete this work order?</p>
            <p className="text-sm text-navy-400 mb-4"><strong>{workOrder?.work_order_number}</strong> - {workOrder?.title}</p>
            <div className="flex gap-3">
              <button 
                onClick={async () => {
                  setDeleting(true);
                  const { error } = await supabase
                    .from('work_orders')
                    .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
                    .eq('id', params.id);
                  if (!error) {
                    showToast('Work order deleted', 'success');
                    router.push('/work-orders');
                  } else {
                    showToast('Delete failed: ' + error.message, 'error');
                    setDeleting(false);
                  }
                }} 
                disabled={deleting}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="flex-1 py-2 bg-navy-700 hover:bg-navy-600 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Assets Modal */}
      {showAddAssetsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-assets-modal-title">
          <div className="bg-navy-900 rounded-lg border border-blue-500/30 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 id="add-assets-modal-title" className="text-xl font-bold text-blue-400 flex items-center gap-2">
                <Plus className="w-5 h-5" aria-hidden="true" /> Add Valves from Future Work Orders
              </h3>
              <button 
                onClick={() => setShowAddAssetsModal(false)} 
                className="text-navy-400 hover:text-navy-200 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            
            <p className="text-navy-300 mb-4 text-sm">Select valves to add to today&apos;s work order (early finish scenario):</p>
            
            {loadingAssets ? (
              <div className="text-center py-8 text-navy-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" aria-hidden="true" />
                Loading available valves...
              </div>
            ) : availableAssets.length === 0 ? (
              <div className="text-center py-8 text-navy-400">No pending valves available from future work orders</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto" role="listbox" aria-label="Available valves">
                {availableAssets.map((asset) => (
                  <label 
                    key={asset.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                      selectedAssets.find(a => a.id === asset.id)
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'bg-navy-800/50 hover:bg-navy-800 border border-navy-700'
                    }`}
                    role="option"
                    aria-selected={!!selectedAssets.find(a => a.id === asset.id)}
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedAssets.find(a => a.id === asset.id)}
                      onChange={() => toggleAssetSelection(asset)}
                      className="w-4 h-4 rounded border-navy-600 text-blue-500 focus:ring-blue-500"
                      aria-label={`Select valve ${asset.tag_number}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-400 text-sm truncate">{asset.tag_number}</span>
                        <span className="text-xs text-navy-400 truncate">{asset.stations?.code}</span>
                      </div>
                      <p className="text-xs text-navy-500 truncate">From: {asset.source_wo_number || 'Unknown'}</p>
                    </div>
                    <span className="text-xs text-navy-400 whitespace-nowrap">{asset.location_code || '-'}</span>
                  </label>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={addAssetsToWorkOrder}
                disabled={selectedAssets.length === 0 || rollingForward}
                className="flex-1 py-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {rollingForward ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Adding...
                  </>
                ) : (
                  `Add ${selectedAssets.length} Valve${selectedAssets.length !== 1 ? 's' : ''}`
                )}
              </button>
              <button 
                onClick={() => setShowAddAssetsModal(false)} 
                className="flex-1 py-2 bg-navy-700 hover:bg-navy-600 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}