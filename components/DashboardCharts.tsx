// components/DashboardCharts.tsx
'use client';

import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

interface DashboardChartsProps {
  assets: any[];
  workOrders: any[];
}

export default function DashboardCharts({ assets, workOrders }: DashboardChartsProps) {
  // Process data for charts
  const applicationData = processApplicationData(assets);
  const manufacturerData = processManufacturerData(assets);
  const locationData = processLocationData(assets);
  const actuationData = processActuationData(assets);
  const timelineData = processTimelineData(workOrders);

  return (
    <div className="space-y-6">
      {/* Row 1: Application & Actuation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Valve Count by Application">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={applicationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {applicationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Valve Actuation Types">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={actuationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {actuationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Top Manufacturers */}
      <ChartCard title="Top 10 Manufacturers by Valve Count">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={manufacturerData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
              labelStyle={{ color: '#f59e0b' }}
            />
            <Bar dataKey="value" fill="#F59E0B" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Row 3: Top Locations */}
      <ChartCard title="Top 15 Locations by Valve Count">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={locationData.slice(0, 15)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" width={150} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
              cursor={{ fill: '#1e293b' }}
            />
            <Bar dataKey="value" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Row 4: Service Activity Timeline */}
      {timelineData.length > 0 && (
        <ChartCard title="Service Activity Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
              />
              <Line type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

// Helper Components
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy-900 rounded-lg border border-navy-700 p-5">
      <h3 className="font-semibold mb-4 text-navy-100">{title}</h3>
      {children}
    </div>
  );
}

// Data Processing Functions
function processApplicationData(assets: any[]) {
  const appCount: Record<string, number> = {};
  
  assets.forEach(asset => {
    const app = asset.application || asset.type || 'Unknown';
    appCount[app] = (appCount[app] || 0) + 1;
  });

  return Object.entries(appCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function processManufacturerData(assets: any[]) {
  const mfgCount: Record<string, number> = {};
  
  assets.forEach(asset => {
    const mfg = asset.manufacturer || asset.brand || 'Unknown';
    mfgCount[mfg] = (mfgCount[mfg] || 0) + 1;
  });

  return Object.entries(mfgCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function processLocationData(assets: any[]) {
  const locCount: Record<string, number> = {};
  
  assets.forEach(asset => {
    const loc = asset.location || asset.station || asset.site || 'Unknown';
    locCount[loc] = (locCount[loc] || 0) + 1;
  });

  return Object.entries(locCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function processActuationData(assets: any[]) {
  const actCount: Record<string, number> = {};
  
  assets.forEach(asset => {
    const act = asset.actuation_type || asset.actuation || asset.valve_type || 'Unknown';
    actCount[act] = (actCount[act] || 0) + 1;
  });

  return Object.entries(actCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function processTimelineData(workOrders: any[]) {
  const monthCount: Record<string, number> = {};
  
  workOrders.forEach(wo => {
    const date = wo.created_at || wo.due_date || wo.service_date;
    if (date) {
      const d = new Date(date);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCount[month] = (monthCount[month] || 0) + 1;
    }
  });

  return Object.entries(monthCount)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}