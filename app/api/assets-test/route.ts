import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey
      }, { status: 500 });
    }
    
    // Test fetching just 1 asset using direct fetch
    const url = `${supabaseUrl}/rest/v1/assets?select=id,tag_number&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Supabase error: ${response.status}`,
        status: response.status,
        statusText: response.statusText
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    return NextResponse.json({ 
      success: true,
      data: data,
      supabaseUrl: supabaseUrl
    });
  } catch (err: any) {
    return NextResponse.json({ 
      error: err.message,
      stack: err.stack 
    }, { status: 500 });
  }
}