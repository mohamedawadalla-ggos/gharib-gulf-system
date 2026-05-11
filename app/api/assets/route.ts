import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log("API route called - using raw SQL");
  
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const stationCode = searchParams.get('station') || '';
    const criticality = searchParams.get('criticality') || '';
    
    const offset = (page - 1) * limit;
    
    // Get stations first
    const { data: allStations } = await supabase
      .from('stations')
      .select('id, code, name')
      .is('deleted_at', null);
    
    const stationMap = new Map();
    (allStations || []).forEach((s: any) => {
      stationMap.set(s.id, { code: s.code, name: s.name });
    });
    
    // Build WHERE clause
    const whereConditions = ['deleted_at IS NULL'];
    
    if (status && status !== 'all') {
      whereConditions.push(`maintenance_status = '${status}'`);
    }
    
    if (criticality && criticality !== 'all') {
      whereConditions.push(`criticality = '${criticality}'`);
    }
    
    if (stationCode && stationCode !== 'all' && allStations) {
      const station = allStations.find((s: any) => s.code === stationCode);
      if (station) {
        whereConditions.push(`station_id = '${station.id}'`);
      }
    }
    
    if (search && search.trim() !== '') {
      whereConditions.push(`tag_number ILIKE '%${search.trim()}%'`);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Use raw SQL query via RPC
    const { data: assets, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT id, tag_number, station_id, maintenance_status, criticality, condition
        FROM assets
        WHERE ${whereClause}
        ORDER BY tag_number ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    });
    
    // Get total count
    const { data: countResult, error: countError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT COUNT(*) as total
        FROM assets
        WHERE ${whereClause}
      `
    });
    
    if (error) {
      console.error("Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const totalCount = countResult?.[0]?.total || 0;
    
    const assetsWithStations = (assets || []).map((asset: any) => ({
      id: asset.id,
      tag_number: asset.tag_number,
      station_id: asset.station_id,
      maintenance_status: asset.maintenance_status,
      criticality: asset.criticality,
      condition: asset.condition,
      stations: asset.station_id ? stationMap.get(asset.station_id) : null,
    }));
    
    return NextResponse.json({
      assets: assetsWithStations,
      count: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      limit
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}