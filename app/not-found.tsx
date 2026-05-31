// app/not-found.tsx
'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-navy-50 mb-2">Page Not Found</h1>
        <p className="text-navy-300 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}