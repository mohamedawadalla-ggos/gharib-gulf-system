// app/dashboard/_components/loading-skeleton.tsx
export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={"animate-pulse bg-navy-800/50 rounded " + className} />
  );
}

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="card p-4 rounded-lg border border-navy-700">
          <div className="flex items-center justify-between mb-2">
            <LoadingSkeleton className="h-4 w-24 bg-navy-700" />
            <LoadingSkeleton className="h-5 w-5 bg-navy-700 rounded" />
          </div>
          <LoadingSkeleton className="h-8 w-16 bg-navy-700" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card bg-navy-800 p-4 rounded-lg border border-navy-700">
      <LoadingSkeleton className="h-6 w-48 bg-navy-700 mb-4" />
      <LoadingSkeleton className="h-80 w-full bg-navy-700" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="card bg-navy-800 p-4 rounded-lg border border-navy-700">
      <LoadingSkeleton className="h-6 w-48 bg-navy-700 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="p-3 bg-navy-900/50 rounded border border-navy-700">
            <LoadingSkeleton className="h-4 w-32 bg-navy-700 mb-2" />
            <LoadingSkeleton className="h-3 w-48 bg-navy-700" />
          </div>
        ))}
      </div>
    </div>
  );
}