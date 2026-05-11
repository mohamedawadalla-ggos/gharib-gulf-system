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
  Line,
  ComposedChart
} from 'recharts';

interface MonthlyData {
  month: string;
  monthName: string;
  critical: number;
  high: number;
  medium: number;
  total: number;
}

interface MonthlyMaintenanceChartProps {
  data: MonthlyData[];
}

export function MonthlyMaintenanceChart({ data }: MonthlyMaintenanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Maintenance Log (Last 12 Months)</h3>
        <div className="h-[400px] flex items-center justify-center text-gray-500">
          No maintenance data available for the last 12 months
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></span>
              Critical: <span className="font-semibold">{payload[0]?.value || 0}</span>
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
              High: <span className="font-semibold">{payload[1]?.value || 0}</span>
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
              Medium: <span className="font-semibold">{payload[2]?.value || 0}</span>
            </p>
            <p className="text-sm border-t pt-1 mt-1">
              <span className="font-semibold">Total: {payload[0]?.value + payload[1]?.value + payload[2]?.value || 0}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate total valves maintained
  const totalMaintained = data.reduce((sum, month) => sum + month.total, 0);
  const avgPerMonth = Math.round(totalMaintained / data.length);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Monthly Maintenance Log (Last 12 Months)</h3>
        <p className="text-sm text-gray-500">
          Number of valves maintained per month by priority | 
          Total: {totalMaintained.toLocaleString()} valves | 
          Avg: {avgPerMonth} per month
        </p>
      </div>
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="monthName" 
              angle={-45}
              textAnchor="end"
              height={70}
              interval={0}
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              label={{ value: 'Number of Valves', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            
            <Bar 
              dataKey="critical" 
              name="Critical" 
              fill="#dc2626" 
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar 
              dataKey="high" 
              name="High" 
              fill="#f97316" 
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar 
              dataKey="medium" 
              name="Medium" 
              fill="#eab308" 
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Line
              type="monotone"
              dataKey="total"
              name="Total Trend"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        Showing maintenance activity for the last 12 months ({data[0]?.monthName} - {data[data.length - 1]?.monthName})
      </div>
    </div>
  );
}