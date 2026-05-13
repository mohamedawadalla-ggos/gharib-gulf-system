// app/debug-env/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function DebugEnvPage() {
  const [supabaseUrl, setSupabaseUrl] = useState<string>('Checking...');
  const [supabaseKey, setSupabaseKey] = useState<string>('Checking...');
  const [testResult, setTestResult] = useState<string>('Testing...');

  useEffect(() => {
    // Check environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ MISSING';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
      ? '✅ PRESENT (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' 
      : '❌ MISSING';
    
    setSupabaseUrl(url);
    setSupabaseKey(key);

    // Test Supabase connection
    async function testSupabase() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {  { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          setTestResult(`❌ Supabase Error: ${error.message}`);
        } else if (user) {
          setTestResult(`✅ Supabase Connected! Logged in as: ${user.email}`);
        } else {
          setTestResult(`✅ Supabase Connected! (Not logged in)`);
        }
      } catch (err: any) {
        setTestResult(`❌ Connection Failed: ${err.message}`);
      }
    }
    
    testSupabase();
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-amber-400">🔍 Environment Debug</h1>
        
        <div className="space-y-6">
          {/* Environment Variables */}
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-navy-400">NEXT_PUBLIC_SUPABASE_URL:</label>
                <p className={`font-mono text-sm mt-1 p-2 rounded ${
                  supabaseUrl.includes('❌') ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                }`}>
                  {supabaseUrl}
                </p>
              </div>
              
              <div>
                <label className="text-sm text-navy-400">NEXT_PUBLIC_SUPABASE_ANON_KEY:</label>
                <p className={`font-mono text-sm mt-1 p-2 rounded ${
                  supabaseKey.includes('❌') ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                }`}>
                  {supabaseKey}
                </p>
              </div>
            </div>
          </div>

          {/* Supabase Connection Test */}
          <div className="bg-navy-900 rounded-lg border border-navy-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Supabase Connection Test</h2>
            <p className={`font-mono text-sm p-3 rounded ${
              testResult.includes('✅') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
            }`}>
              {testResult}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            <a href="/login" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg font-medium">
              ← Back to Login
            </a>
            <a href="/dashboard" className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-navy-50 rounded-lg font-medium">
              Go to Dashboard →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}