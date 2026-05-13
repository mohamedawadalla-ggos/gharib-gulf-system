// app/dashboard/DashboardToggle.tsx
'use client';

import { useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';

export function DashboardToggle() {
  const [version, setVersion] = useState<'new' | 'legacy'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('dashboard_version') as 'new' | 'legacy') || 'new';
    }
    return 'new';
  });

  const switchVersion = (newVersion: 'new' | 'legacy') => {
    setVersion(newVersion);
    localStorage.setItem('dashboard_version', newVersion);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 bg-navy-900 border border-navy-700 rounded-lg p-3 shadow-lg z-50">
      <p className="text-xs text-navy-400 mb-2">Dashboard Version</p>
      <div className="flex gap-2">
        <button
          onClick={() => switchVersion('new')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1 ${
            version === 'new' 
              ? 'bg-amber-500 text-navy-950' 
              : 'bg-navy-800 text-navy-300 hover:bg-navy-700'
          }`}
        >
          <Save className="w-3 h-3" /> New
        </button>
        <button
          onClick={() => switchVersion('legacy')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1 ${
            version === 'legacy' 
              ? 'bg-amber-500 text-navy-950' 
              : 'bg-navy-800 text-navy-300 hover:bg-navy-700'
          }`}
        >
          <RotateCcw className="w-3 h-3" /> Legacy
        </button>
      </div>
    </div>
  );
}