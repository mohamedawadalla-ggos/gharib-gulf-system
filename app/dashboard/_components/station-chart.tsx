'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StationBreakdown {
  station_code: string;
  station_name: string;
  total_assets: number;
  overdue: number;
  critical: number;
}

interface StationChartProps {
  data: StationBreakdown[];
}

export function StationChart({ data }: StationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-navy-400">
        No station data available
      </div>
    );
  }

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="station_code"
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis tick={{ fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9',
            }}
            labelStyle={{ color: '#f1f5f9' }}
          />
          <Legend
            wrapperStyle={{ color: '#94a3b8' }}
            formatter={(value) => {
              const colors: Record<string, string> = {
                critical: '#ef4444',
                overdue: '#f59e0b',
                total: '#3b82f6',
              };
              return <span style={{ color: colors[value] || '#94a3b8' }}>{value}</span>;
            }}
          />
          <Bar dataKey="critical" name="Critical" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="overdue" name="Overdue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="total_assets" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}