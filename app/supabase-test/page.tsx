import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  const results: any = {};
  
  // Test 1: Check if supabase client is initialized
  try {
    const supabase = await createSupabaseServerClient();
    results.client = "Initialized successfully";
    
    // Test 2: Try a simple query on stations (no date fields)
    const { data: stations, error: stationError } = await supabase
      .from('stations')
      .select('count', { count: 'exact', head: true });
    
    if (stationError) {
      results.stations = { error: stationError.message, details: stationError };
    } else {
      results.stations = "Success - stations table accessible";
    }
    
    // Test 3: Try a raw query using RPC
    const { data: rawData, error: rawError } = await supabase.rpc('version');
    if (rawError) {
      results.rpc = { error: rawError.message };
    } else {
      results.rpc = "RPC works";
    }
    
  } catch (err: any) {
    results.error = err.message;
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <pre className="bg-gray-800 p-4 rounded-lg overflow-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  );
}