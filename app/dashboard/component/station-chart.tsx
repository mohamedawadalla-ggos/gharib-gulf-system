// app/dashboard/_components/station-chart.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface StationBreakdown {
  station_code: string;
  station_name: string;
  total_assets: number;
  overdue: number;
  critical: number;
}

interface StationChartProps {
   StationBreakdown[];
}

export function StationChart({ data }: StationChartProps) {
  const chartData = data.map(station => ({
    name: station.station_code,
    Total: station.total_assets,
    Overdue: station.overdue,
    Critical: station.critical,
  }));

  return (
    // ✅ CRITICAL: Parent container must have explicit height
    <div className="card bg-navy-800 p-4 rounded-lg border border-navy-700" style={{ height: '400px' }}>
      <h3 className="text-lg font-semibold text-navy-50 mb-4">Assets by Station</h3>
      {/* ✅ ResponsiveContainer with explicit width/height */}
      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8"
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis stroke="#94a3b8" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#1e293b", 
              border: "1px solid #475569",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#f1f5f9" }}
          />
          <Legend wrapperStyle={{ color: "#cbd5e1", paddingTop: "10px" }} />
          <Bar dataKey="Total" fill="#64748b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Overdue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Critical" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}