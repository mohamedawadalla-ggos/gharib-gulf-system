// components/DashboardCharts.tsx
'use client';

import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useMemo } from 'react';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#F472B6', '#64748B'];

interface DashboardChartsProps {
  assets: any[];
  workOrders: any[];
  campaigns?: any[];
}

export default function DashboardCharts({ assets, workOrders, campaigns = [] }: DashboardChartsProps) {
  // ✅ Use useMemo for synchronous data processing
  const chartData = useMemo(() => {
    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return {
        applicationData: [],
        manufacturerData: [],
        locationData: [],
        actuationData: [],
        timelineData: [],
        serviceFlagData: []
      };
    }

    try {
      return {
        applicationData: processApplicationData(assets),
        manufacturerData: processManufacturerData(assets),
        locationData: processLocationData(assets),
        actuationData: processActuationData(assets),
        timelineData: processTimelineData(assets),
        serviceFlagData: processServiceFlagData(assets)
      };
    } catch (err) {
      console.error('❌ Chart processing error:', err);
      return {
        applicationData: [],
        manufacturerData: [],
        locationData: [],
        actuationData: [],
        timelineData: [],
        serviceFlagData: []
      };
    }
  }, [assets, workOrders, campaigns]);

  // ✅ Helper function to group top N + Others
  const groupTopNWithOthers = (data: any[], topN: number, othersLabel: string = 'Others') => {
    if (!data || data.length <= topN) return data;
    
    const topItems = data.slice(0, topN);
    const othersSum = data.slice(topN).reduce((sum, item) => sum + item.value, 0);
    
    return [
      ...topItems,
      { name: othersLabel, value: othersSum }
    ];
  };

  // ✅ Safe destructuring with defaults
  const {
    applicationData = [],
    manufacturerData = [],
    locationData = [],
    actuationData = [],
    timelineData = [],
    serviceFlagData = []
  } = chartData || {};

  // ✅ Group manufacturers: Top 10 + Others
  const manufacturersWithOthers = useMemo(() => 
    groupTopNWithOthers(manufacturerData, 10, 'Others'),
    [manufacturerData]
  );

  // ✅ Group locations: Top 10 + Others
  const locationsWithOthers = useMemo(() => 
    groupTopNWithOthers(locationData, 10, 'Others'),
    [locationData]
  );

  // ✅ Group actuation types: Top 10 + Others
  const actuationWithOthers = useMemo(() => 
    groupTopNWithOthers(actuationData, 10, 'Others'),
    [actuationData]
  );

  // ✅ Early return if no data
  if (!assets || assets.length === 0) {
    return (
      <div className="bg-navy-800/30 border border-navy-700 rounded-lg p-6 text-center text-navy-400">
        No valve data available for charts
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Application & Actuation Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {applicationData && applicationData.length > 0 && (
          <ChartCard title={`Valves Application Type (${applicationData.length} types)`}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={applicationData} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false} 
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} 
                  outerRadius={100} 
                  fill="#8884d8" 
                  dataKey="value"
                >
                  {applicationData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} 
                  itemStyle={{ color: '#f59e0b' }} 
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} verticalAlign="bottom" height={40} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
        {actuationWithOthers && actuationWithOthers.length > 0 && (
          <ChartCard title={`Valve Classification Criteria (${actuationWithOthers.length} categories)`}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={actuationWithOthers} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false} 
                  label={({ name, percent }: any) => {
                    const displayName = name.length > 15 ? name.substring(0, 12) + '...' : name;
                    return `${displayName} ${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={100} 
                  fill="#8884d8" 
                  dataKey="value"
                  minAngle={15}
                >
                  {actuationWithOthers.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} 
                  itemStyle={{ color: '#3B82F6', fontSize: '11px' }}
                  formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} valves`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} verticalAlign="bottom" height={60} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Row 2: Top Manufacturers - Multi-Color Bars (Top 10 + Others) */}
      {manufacturersWithOthers && manufacturersWithOthers.length > 0 && (
        <ChartCard title={`Top 10 Manufacturers by Valve Count`}>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={manufacturersWithOthers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                angle={-45} 
                textAnchor="end" 
                height={100} 
                interval={0} 
                fontSize={11} 
              />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} 
                labelStyle={{ color: '#f59e0b', fontWeight: 'bold' }} 
                formatter={(value: any) => [`${Number(value).toLocaleString()} valves`, 'Count']} 
              />
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]} 
                label={{ position: 'top', fill: '#94a3b8', fontSize: 10, formatter: (v: any) => Number(v).toLocaleString() }}
              >
                {manufacturersWithOthers.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Others' ? '#64748B' : COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Row 3: Top Locations - Multi-Color Horizontal Bars (Top 10 + Others) */}
      {locationsWithOthers && locationsWithOthers.length > 0 && (
        <ChartCard title={`Top 10 Locations by Valve Count`}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={locationsWithOthers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#94a3b8" 
                width={140} 
                interval={0} 
                fontSize={10} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} 
                cursor={{ fill: '#1e293b', opacity: 0.3 }} 
                formatter={(value: any, name: any, props: any) => [`${Number(value).toLocaleString()} valves`, props?.payload?.name || '']} 
              />
              <Bar 
                dataKey="value" 
                radius={[0, 4, 4, 0]} 
                label={{ position: 'right', fill: '#94a3b8', fontSize: 10, formatter: (v: any) => Number(v).toLocaleString() }}
              >
                {locationsWithOthers.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Others' ? '#64748B' : COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Row 4: Service Activity Timeline */}
      {timelineData && timelineData.length > 0 && (
        <ChartCard title="Service Activity Over Time (Nov 2018 – Dec 2025)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="month" 
                stroke="#94a3b8" 
                fontSize={10} 
                interval="preserveStartEnd" 
                tickFormatter={(value: any) => { 
                  const d = new Date(value + '-01'); 
                  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); 
                }} 
              />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} 
                formatter={(value: any) => [`${Number(value).toLocaleString()} services`, 'Count']} 
                labelFormatter={(label: any) => { 
                  const d = new Date(label + '-01'); 
                  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); 
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#F59E0B" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 6, fill: '#fbbf24' }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Row 5: Service Flag Status */}
      {serviceFlagData && serviceFlagData.length > 0 && (
        <ChartCard title="Service Flag Status (Good for Service)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serviceFlagData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" width={120} fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} 
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {serviceFlagData.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name.includes('Good') ? '#10B981' : '#EF4444'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy-900 rounded-lg border border-navy-700 p-5">
      <h3 className="font-semibold mb-4 text-navy-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        {title}
      </h3>
      {children}
    </div>
  );
}

// === DATA PROCESSORS (Same as before) ===

function processApplicationData(assets: any[]): Array<{name: string, value: number}> {
  if (!assets || !Array.isArray(assets)) return [];
  const appCount: Record<string, number> = {};
  
  assets.forEach(asset => {
    if (!asset) return;
    const raw = (asset.service_type || '').toLowerCase();
    const normalized = 
      raw.includes('oil') ? 'Oil' :
      raw.includes('water') ? 'Water' :
      raw.includes('gas') ? 'Gas' :
      raw.includes('diesel') ? 'Diesel' :
      raw.includes('injection') ? 'Injection' :
      raw || 'Unknown';
    
    appCount[normalized] = (appCount[normalized] || 0) + 1;
  });

  return Object.entries(appCount)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);
}

function processManufacturerData(assets: any[]): Array<{name: string, value: number}> {
  if (!assets || !Array.isArray(assets)) return [];
  const mfgCount: Record<string, number> = {};
  
  assets.forEach(asset => {
    if (!asset) return;
    const mfg = asset.manufacturer || 'Unknown';
    mfgCount[mfg] = (mfgCount[mfg] || 0) + 1;
  });

  return Object.entries(mfgCount)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);
}

function processLocationData(assets: any[]): Array<{name: string, value: number}> {
  if (!assets || !Array.isArray(assets)) return [];
  const locCount: Record<string, number> = {};
  
  assets.forEach(asset => {
    if (!asset) return;
    let loc = asset.location_code || asset.detailed_location || asset.parent_well_name || 'Unknown';
    loc = loc.replace(/^-+/, '').replace(/\s+/g, ' ').trim();
    locCount[loc] = (locCount[loc] || 0) + 1;
  });

  return Object.entries(locCount)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);
}

function processActuationData(assets: any[]): Array<{name: string, value: number}> {
  if (!assets || !Array.isArray(assets)) return [];
  const actCount: Record<string, number> = {};
  
  assets.forEach(asset => {
    if (!asset) return;
    const raw = (asset.sct_code || asset.asset_type || '').toLowerCase();
    const normalized = 
      raw.includes('bar stem') ? 'Bar Stem' :
      raw.includes('gear') ? 'Gear Box' :
      raw.includes('h.w') || raw.includes('hand') ? 'Hand Wheel' :
      raw.includes('lever') ? 'Lever' :
      raw || 'Unknown';
    
    actCount[normalized] = (actCount[normalized] || 0) + 1;
  });

  return Object.entries(actCount)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);
}

function processTimelineData(assets: any[]): Array<{month: string, count: number}> {
  if (!assets || !Array.isArray(assets)) return [];
  const monthCount: Record<string, number> = {};
  
  assets.forEach(asset => {
    if (!asset) return;
    [asset.last_service_date, asset.next_service_date, asset.installation_date]
      .filter(Boolean)
      .forEach((dateStr: any) => {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthCount[month] = (monthCount[month] || 0) + 1;
        }
      });
  });

  return Object.entries(monthCount)
    .map(([month, count]) => ({ month, count: count as number }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function processServiceFlagData(assets: any[]): Array<{name: string, value: number}> {
  if (!assets || !Array.isArray(assets)) return [];
  const flagCount: Record<string, number> = {};
  
  assets.forEach(asset => {
    if (!asset) return;
    const isGood = 
      asset.condition === 'good' || 
      asset.maintenance_status === 'up_to_date' || 
      asset.repair_status === 'none';
    
    const flag = isGood ? 'G/F (Good for Service)' : 'N/G or Needs Maintenance';
    flagCount[flag] = (flagCount[flag] || 0) + 1;
  });

  return Object.entries(flagCount)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);
}