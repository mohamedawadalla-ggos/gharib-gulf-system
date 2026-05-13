// components/DashboardCharts.tsx
'use client';

import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useEffect, useState } from 'react';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface DashboardChartsProps {
  assets: any[];
  workOrders: any[];
  campaigns?: any[];
}

export default function DashboardCharts({ assets, workOrders, campaigns = [] }: DashboardChartsProps) {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assets || assets.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const applicationData = processApplicationData(assets);
      const manufacturerData = processManufacturerData(assets);
      const locationData = processLocationData(assets);
      const serviceFlagData = processServiceFlagData(assets);
      const timelineData = processTimelineData(assets); // Using asset service dates

      setChartData({
        applicationData,
        manufacturerData,
        locationData,
        serviceFlagData,
        timelineData
      });
    } catch (err) {
      console.error('❌ Chart processing error:', err);
    } finally {
      setLoading(false);
    }
  }, [assets, workOrders, campaigns]);

  if (loading) return <div className="bg-navy-900 rounded-lg border border-navy-700 p-6 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div></div>;
  if (!assets || assets.length === 0) return <div className="bg-navy-800/30 border border-navy-700 rounded-lg p-6 text-center text-navy-400">No data available</div>;
  if (!chartData) return null;

  const { applicationData, manufacturerData, locationData, serviceFlagData, timelineData } = chartData;

  return (
    <div className="space-y-6">
      {/* Row 1: Application & Service Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {applicationData.length > 0 && (
          <ChartCard title={`Valve Count by Service Type (${applicationData.length} types)`}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={applicationData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {applicationData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} itemStyle={{ color: '#f59e0b' }} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} verticalAlign="bottom" height={40} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {serviceFlagData.length > 0 && (
          <ChartCard title="Service Status (Good for Service vs Needs Maintenance)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceFlagData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={120} fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {serviceFlagData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.name.includes('Good') ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Row 2: Top Manufacturers */}
      {manufacturerData.length > 0 && (
        <ChartCard title={`Top 12 Manufacturers by Valve Count`}>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={manufacturerData.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={100} interval={0} fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} labelStyle={{ color: '#f59e0b', fontWeight: 'bold' }} formatter={(value: number) => [`${value.toLocaleString()} valves`, 'Count']} />
              <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#94a3b8', fontSize: 10, formatter: (v: number) => v.toLocaleString() }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Row 3: Top Locations */}
      {locationData.length > 0 && (
        <ChartCard title={`Top 15 Locations by Valve Count`}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={locationData.slice(0, 15)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" width={140} interval={0} fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} cursor={{ fill: '#1e293b', opacity: 0.3 }} formatter={(value: number, name: string, props: any) => [`${value.toLocaleString()} valves`, props.payload.name]} />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#94a3b8', fontSize: 10, formatter: (v: number) => v.toLocaleString() }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Row 4: Service Activity Timeline */}
      {timelineData.length > 0 && (
        <ChartCard title="Service Activity Over Time (2018–2025)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} interval="preserveStartEnd" />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} formatter={(value: number) => [`${value.toLocaleString()} services`, 'Count']} labelFormatter={(label) => `Month: ${label}`} />
              <Line type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }} activeDot={{ r: 6, fill: '#fbbf24' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy-900 rounded-lg border border-navy-700 p-5">
      <h3 className="font-semibold mb-4 text-navy-100 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span>{title}</h3>
      {children}
    </div>
  );
}

// === EXACT SCHEMA-MAPPED DATA PROCESSORS ===

function processApplicationData(assets: any[]) {
  const appCount: Record<string, number> = {};
  assets.forEach(asset => {
    const app = (asset.service_type || '').toLowerCase();
    const normalized = app.includes('oil') ? 'Oil' : app.includes('water') ? 'Water' : app.includes('gas') ? 'Gas' : app.includes('diesel') ? 'Diesel' : app || 'Unknown';
    appCount[normalized] = (appCount[normalized] || 0) + 1;
  });
  return Object.entries(appCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function processManufacturerData(assets: any[]) {
  const mfgCount: Record<string, number> = {};
  assets.forEach(asset => {
    const mfg = asset.manufacturer || 'Unknown';
    mfgCount[mfg] = (mfgCount[mfg] || 0) + 1;
  });
  return Object.entries(mfgCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function processLocationData(assets: any[]) {
  const locCount: Record<string, number> = {};
  assets.forEach(asset => {
    // Clean up location codes like "-Karama-C.P.F" -> "Karama C.P.F"
    let loc = asset.location_code || asset.detailed_location || asset.parent_well_name || 'Unknown';
    loc = loc.replace(/^-+/, '').replace(/\s+/g, ' ').trim();
    locCount[loc] = (locCount[loc] || 0) + 1;
  });
  return Object.entries(locCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function processServiceFlagData(assets: any[]) {
  const flagCount: Record<string, number> = {};
  assets.forEach(asset => {
    const isGood = asset.condition === 'good' || asset.maintenance_status === 'up_to_date' || asset.repair_status === 'none';
    const flag = isGood ? 'G/F (Good for Service)' : 'N/G or Needs Maintenance';
    flagCount[flag] = (flagCount[flag] || 0) + 1;
  });
  return Object.entries(flagCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function processTimelineData(assets: any[]) {
  const monthCount: Record<string, number> = {};
  assets.forEach(asset => {
    const date = asset.last_service_date || asset.next_service_date || asset.installation_date;
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthCount[month] = (monthCount[month] || 0) + 1;
      }
    }
  });
  return Object.entries(monthCount).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));
}