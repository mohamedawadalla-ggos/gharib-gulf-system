// app/dashboard/_lib/queries.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ============================================================================
// TYPES
// ============================================================================

export interface Asset {
  id: string;
  tag_number: string;
  station_id: string;
  maintenance_status: string;
  criticality: string;
  condition: string;
  last_service_date: string | null;
  next_service_date: string | null;
  operating_status: string;
  location_code: string | null;
  size_inches: string | null;
  pressure_class: string | null;
  manufacturer: string | null;
  stations: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface AssetsQueryResult {
  assets: Asset[];
  count: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface StationCode {
  id: string;
  code: string;
  name: string;
}

export interface FilterOptions {
  statuses: string[];
  criticalities: string[];
  totalAssets: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatSupabaseError(error: any): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  if (error.details) return error.details;
  try { return JSON.stringify(error); } 
  catch { return "Error object could not be serialized"; }
}

// ============================================================================
// DASHBOARD QUERIES
// ============================================================================

export async function getDashboardKpis(siteId?: string) {
  const supabase = await createSupabaseServerClient();
  
  try {
    let query = supabase
      .from("assets")
      .select("id, criticality, condition, next_service_date", { count: "exact" })
      .is("deleted_at", null);
    
    if (siteId) {
      const { data: stations, error: stationError } = await supabase
        .from("stations")
        .select("id")
        .eq("site_id", siteId)
        .is("deleted_at", null);
      
      if (stationError) {
        return { total_assets: 0, overdue_count: 0, due_soon_count: 0, critical_count: 0, poor_condition: 0 };
      }
      
      const stationIds = stations?.map((s: any) => s.id) || [];
      if (stationIds.length > 0) {
        query = query.in("station_id", stationIds);
      } else {
        return { total_assets: 0, overdue_count: 0, due_soon_count: 0, critical_count: 0, poor_condition: 0 };
      }
    }
    
    const { data: assets, count: totalAssets, error } = await query;
    
    if (error) {
      console.error("KPI Query Error:", formatSupabaseError(error));
      return { total_assets: 0, overdue_count: 0, due_soon_count: 0, critical_count: 0, poor_condition: 0 };
    }
    
    const safeAssets = Array.isArray(assets) ? assets : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    let overdueCount = 0;
    let dueSoonCount = 0;
    let criticalCount = 0;
    let poorConditionCount = 0;
    
    for (const asset of safeAssets) {
      if (asset.criticality === "critical") criticalCount++;
      if (asset.condition === "poor" || asset.condition === "critical") poorConditionCount++;
      
      if (asset.next_service_date) {
        const nextDate = new Date(asset.next_service_date);
        nextDate.setHours(0, 0, 0, 0);
        if (nextDate < today) overdueCount++;
        else if (nextDate <= thirtyDaysFromNow) dueSoonCount++;
      }
    }
    
    return {
      total_assets: totalAssets || 0,
      overdue_count: overdueCount,
      due_soon_count: dueSoonCount,
      critical_count: criticalCount,
      poor_condition: poorConditionCount,
    };
    
  } catch (err: any) {
    console.error("❌ Error fetching KPIs:", formatSupabaseError(err));
    return { total_assets: 0, overdue_count: 0, due_soon_count: 0, critical_count: 0, poor_condition: 0 };
  }
}

export async function getStationBreakdown(siteId?: string) {
  const supabase = await createSupabaseServerClient();
  
  try {
    let query = supabase
      .from("stations")
      .select(`
        id,
        code,
        name,
        assets!left (
          id,
          criticality,
          next_service_date
        )
      `)
      .is("deleted_at", null);
    
    if (siteId) {
      query = query.eq("site_id", siteId);
    }
    
    const { data: stations, error } = await query;
    
    if (error) {
      console.error("Station Breakdown Error:", formatSupabaseError(error));
      return [];
    }
    
    const safeStations = Array.isArray(stations) ? stations : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = safeStations.map((station: any) => {
      const stationAssets = Array.isArray(station?.assets) ? station.assets : [];
      let overdue = 0;
      let critical = 0;
      
      for (const asset of stationAssets) {
        if (asset.criticality === "critical") critical++;
        if (asset.next_service_date) {
          const nextDate = new Date(asset.next_service_date);
          nextDate.setHours(0, 0, 0, 0);
          if (nextDate < today) overdue++;
        }
      }
      
      return {
        station_code: station?.code || "Unknown",
        station_name: station?.name || "Unknown Station",
        total_assets: stationAssets.length,
        overdue: overdue,
        critical: critical,
      };
    });
    
    return result;
  } catch (err: any) {
    console.error("❌ Error fetching Station Breakdown:", formatSupabaseError(err));
    return [];
  }
}

export async function getOverdueAlerts(limit = 10) {
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    const { data: assets, error } = await supabase
      .from("assets")
      .select(`
        id,
        tag_number,
        station_id,
        stations!inner (
          code,
          name
        ),
        criticality,
        condition,
        next_service_date
      `)
      .is("deleted_at", null)
      .lt("next_service_date", today.toISOString().split('T')[0])
      .order("criticality", { ascending: false, nullsLast: true })
      .limit(limit);
    
    if (error) {
      console.error("Overdue Alerts Error:", formatSupabaseError(error));
      return [];
    }
    
    return Array.isArray(assets) ? assets : [];
  } catch (err: any) {
    console.error("❌ Error fetching Overdue Alerts:", formatSupabaseError(err));
    return [];
  }
}

export async function getMonthlyMaintenanceLog(months = 12) {
  const supabase = await createSupabaseServerClient();
  
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    const { data: assets, error } = await supabase
      .from("assets")
      .select(`
        id,
        last_service_date,
        criticality
      `)
      .is("deleted_at", null)
      .not("last_service_date", "is", null)
      .gte("last_service_date", startDate.toISOString().split('T')[0])
      .lte("last_service_date", endDate.toISOString().split('T')[0]);
    
    if (error) {
      console.error("Monthly Maintenance Error:", formatSupabaseError(error));
      return [];
    }
    
    const monthlyData = new Map();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(monthKey, {
        month: monthKey,
        monthName: date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear(),
        critical: 0,
        high: 0,
        medium: 0,
        total: 0
      });
    }
    
    const safeAssets = Array.isArray(assets) ? assets : [];
    for (const asset of safeAssets) {
      if (!asset.last_service_date) continue;
      const date = new Date(asset.last_service_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData.has(monthKey)) {
        const entry = monthlyData.get(monthKey);
        const criticality = asset.criticality?.toLowerCase() || 'medium';
        if (criticality === 'critical') entry.critical++;
        else if (criticality === 'high') entry.high++;
        else entry.medium++;
        entry.total++;
      }
    }
    
    return Array.from(monthlyData.values());
  } catch (err: any) {
    console.error("❌ Error fetching monthly maintenance:", formatSupabaseError(err));
    return [];
  }
}

// ============================================================================
// ASSET REGISTRY QUERIES
// ============================================================================

export async function getAssets(
  page = 1, 
  limit = 20, 
  search?: string, 
  status?: string, 
  stationCode?: string,
  criticality?: string,
  dueRange?: 'overdue' | 'due_soon' | 'future' | 'all'
): Promise<AssetsQueryResult> {
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("assets")
    .select(`
      id,
      tag_number,
      station_id,
      maintenance_status,
      criticality,
      condition,
      last_service_date,
      next_service_date,
      operating_status,
      location_code,
      size_inches,
      pressure_class,
      manufacturer,
      stations (
        id,
        code,
        name
      )
    `, { count: "exact" })
    .eq("deleted_at", null)
    .order("criticality", { ascending: false })
    .order("next_service_date", { ascending: true, nullsLast: true });

  if (status && status !== "all") {
    query = query.eq("maintenance_status", status);
  }

  if (criticality && criticality !== "all") {
    query = query.eq("criticality", criticality);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  if (dueRange === 'overdue') {
    query = query.lt("next_service_date", today.toISOString().split('T')[0]);
  } else if (dueRange === 'due_soon') {
    query = query
      .gte("next_service_date", today.toISOString().split('T')[0])
      .lte("next_service_date", thirtyDaysFromNow.toISOString().split('T')[0]);
  } else if (dueRange === 'future') {
    query = query.gt("next_service_date", thirtyDaysFromNow.toISOString().split('T')[0]);
  }

  if (stationCode && stationCode !== "all") {
    const { data: stations, error: stationError } = await supabase
      .from("stations")
      .select("id, code")
      .eq("code", stationCode);
      
    if (stationError || !stations || stations.length === 0) {
      return { assets: [], count: 0, totalPages: 0, currentPage: page, limit };
    }
    const stationIds = stations.map(s => s.id);
    query = query.in("station_id", stationIds);
  }

  if (search && search.trim() !== "") {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(`tag_number.ilike.${searchTerm},location_code.ilike.${searchTerm}`);
  }

  try {
    const { data: assets, count, error } = await query.range(from, to);

    if (error) {
      console.error("Asset Query Failed:", error);
      return { assets: [], count: 0, totalPages: 0, currentPage: page, limit };
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return { 
      assets: (assets || []) as unknown as Asset[], 
      count: count || 0,
      totalPages,
      currentPage: page,
      limit
    };
  } catch (err: any) {
    console.error("Asset Query Exception:", err);
    return { assets: [], count: 0, totalPages: 0, currentPage: page, limit };
  }
}

export async function getAssetById(id: string): Promise<Asset | null> {
  const supabase = await createSupabaseServerClient();
  
  try {
    const { data: asset, error } = await supabase
      .from("assets")
      .select(`
        id,
        tag_number,
        station_id,
        maintenance_status,
        criticality,
        condition,
        last_service_date,
        next_service_date,
        operating_status,
        location_code,
        size_inches,
        pressure_class,
        manufacturer,
        stations (
          id,
          code,
          name
        )
      `)
      .eq("id", id)
      .eq("deleted_at", null)
      .single();
    
    if (error) throw error;
    return asset as unknown as Asset;
  } catch (err) {
    console.error("❌ Error fetching asset by ID:", formatSupabaseError(err));
    return null;
  }
}

export async function getStationCodes(): Promise<StationCode[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data: stations, error } = await supabase
      .from("stations")
      .select("code, name, id")
      .is("deleted_at", null)
      .order("code");
    
    if (error) throw error;
    return (stations || []) as StationCode[];
  } catch (err) {
    console.error("Station Codes Error:", err);
    return [];
  }
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const supabase = await createSupabaseServerClient();
  
  try {
    const [statusResult, criticalityResult] = await Promise.all([
      supabase.from("assets").select("maintenance_status", { count: "exact" }).is("deleted_at", null),
      supabase.from("assets").select("criticality", { count: "exact" }).is("deleted_at", null)
    ]);
    
    const uniqueStatuses = [...new Set(statusResult.data?.map(a => a.maintenance_status).filter(Boolean) || [])];
    const uniqueCriticalities = [...new Set(criticalityResult.data?.map(a => a.criticality).filter(Boolean) || [])];
    
    return {
      statuses: uniqueStatuses,
      criticalities: uniqueCriticalities,
      totalAssets: statusResult.count || 0
    };
  } catch (err) {
    console.error("Filter options error:", err);
    return { statuses: [], criticalities: [], totalAssets: 0 };
  }
}
