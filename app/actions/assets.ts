'use server';

export async function getAssetsAction(
  page: number = 1,
  limit: number = 20,
  search: string = '',
  status: string = '',
  stationCode: string = '',
  criticality: string = ''
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Build the URL
    let url = `${supabaseUrl}/rest/v1/assets?select=id,tag_number,station_id,maintenance_status,criticality,condition&deleted_at=is.null&order=tag_number.asc&limit=${limit}&offset=${from}`;
    
    // Add filters
    if (status && status !== 'all') {
      url += `&maintenance_status=eq.${status}`;
    }
    
    if (criticality && criticality !== 'all') {
      url += `&criticality=eq.${criticality}`;
    }
    
    if (search) {
      url += `&tag_number=ilike.%${search}%`;
    }
    
    // Get stations first for mapping
    const stationsUrl = `${supabaseUrl}/rest/v1/stations?select=id,code,name&deleted_at=is.null`;
    const stationsResponse = await fetch(stationsUrl, {
      headers: {
        'apikey': supabaseKey!,
        'Authorization': `Bearer ${supabaseKey!}`,
      }
    });
    
    const stations = await stationsResponse.json();
    const stationMap = new Map();
    stations.forEach((s: any) => {
      stationMap.set(s.id, { code: s.code, name: s.name });
    });
    
    // Get assets
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey!,
        'Authorization': `Bearer ${supabaseKey!}`,
        'Range-Unit': 'items',
        'Prefer': 'count=exact'
      }
    });
    
    const count = parseInt(response.headers.get('content-range')?.split('/')[1] || '0');
    const assets = await response.json();
    
    // Format the response
    const formattedAssets = assets.map((asset: any) => ({
      id: asset.id,
      tag_number: asset.tag_number,
      station_id: asset.station_id,
      maintenance_status: asset.maintenance_status,
      criticality: asset.criticality,
      condition: asset.condition,
      stations: asset.station_id ? stationMap.get(asset.station_id) : null,
      last_service_date: null,
      next_service_date: null
    }));
    
    return {
      assets: formattedAssets,
      count: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit
    };
  } catch (err: any) {
    console.error('Action Error:', err);
    return { assets: [], count: 0, totalPages: 0, currentPage: page, limit };
  }
}