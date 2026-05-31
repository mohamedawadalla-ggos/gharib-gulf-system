// KPI Calculations - ✅ All filters now have explicit types
const kpis = {
  total_assets: assets.length,
  unique_locations: new Set(assets.map((a: any): string => 
    (a.location_code || a.detailed_location || a.parent_well_name || 'Unknown').replace(/^-+/, '').trim()
  )).size,
  unique_manufacturers: new Set(assets.map((a: any): string => a.manufacturer || 'Unknown')).size,
  
  // Service Type - ✅ Fixed: Use !! to force boolean return
  oil_valves: assets.filter((a: any): boolean => 
    !!a.service_type?.toLowerCase().includes('oil')
  ).length,
  water_valves: assets.filter((a: any): boolean => 
    !!a.service_type?.toLowerCase().includes('water')
  ).length,
  gas_valves: assets.filter((a: any): boolean => 
    !!a.service_type?.toLowerCase().includes('gas')
  ).length,
  diesel_valves: assets.filter((a: any): boolean => 
    !!a.service_type?.toLowerCase().includes('diesel')
  ).length,
  
  // Wellhead check - ✅ Fixed: Added explicit types
  wellhead_valves: assets.filter((a: any): boolean => 
    !!(a.sct_code || '').toLowerCase().includes('wellhead')
  ).length,
  
  // Actuation types
  bar_stem: countActuator('bar'),
  gear_box: countActuator('gear'),
  hand_wheel: countActuator('wheel'),
  lever: countActuator('lever'),
  manual: countActuator('manual'),
  
  // Service status
  good_for_service: assets.filter((a: any): boolean => 
    a.condition === 'good' || a.maintenance_status === 'up_to_date' || a.repair_status === 'none'
  ).length,
  
  // Work orders - ✅ Fixed: Added explicit types
  overdue_work_orders: workOrders.filter((wo: any): boolean => 
    !!wo.due_date && wo.due_date < new Date().toISOString().split('T')[0] && wo.status !== 'completed'
  ).length,
  pending_work_orders: workOrders.filter((wo: any): boolean => 
    ['pending', 'assigned', 'in_progress'].includes(wo.status)
  ).length,
  completed_work_orders: workOrders.filter((wo: any): boolean => wo.status === 'completed').length,
  active_campaigns: campaigns.filter((c: any): boolean => c.status === 'active').length
};