// app/dashboard/error.tsx
"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    // Log error to monitoring service (e.g., Sentry)
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-400">Failed to load dashboard</h2>
        <p className="text-navy-300 max-w-md mx-auto">
          We couldn't retrieve your maintenance data. This could be due to a temporary connection issue or permission change.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 font-semibold rounded transition"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}