// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-navy-950 text-navy-50 p-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="h-8 w-48 bg-navy-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-navy-800 rounded animate-pulse" />
        </div>
        <div className="h-10 w-40 bg-navy-800 rounded animate-pulse" />
      </div>

      {/* KPI Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-navy-800 rounded-lg border border-navy-700 animate-pulse" />
        ))}
      </div>

      {/* Chart & Alerts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-navy-800 rounded-lg border border-navy-700 animate-pulse" />
        <div className="h-96 bg-navy-800 rounded-lg border border-navy-700 animate-pulse" />
      </div>
    </div>
  );
}