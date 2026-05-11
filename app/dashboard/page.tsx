import { getDashboardKpis, getStationBreakdown, getOverdueAlerts, getMonthlyMaintenanceLog } from "./_lib/queries";
import { StationChart } from "./_components/station-chart";
import { KpiCards } from "./_components/kpi-cards";
import { OverdueAlerts } from "./_components/overdue-alerts";
import { MonthlyMaintenanceChart } from "./_components/monthly-maintenance-chart";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const params = await searchParams;
  const siteId = params.site;

  // Fetch all data
 const [kpis, stationBreakdown, overdueAlerts, monthlyMaintenance] = await Promise.all([
  getDashboardKpis(siteId),
  getStationBreakdown(siteId),
  getOverdueAlerts(10),
  getMonthlyMaintenanceLog(12),  // Changed from 36 to 12
]);

  // Ensure kpis has default values
  const safeKpis = {
    total_assets: kpis?.total_assets ?? 0,
    overdue_count: kpis?.overdue_count ?? 0,
    due_soon_count: kpis?.due_soon_count ?? 0,
    critical_count: kpis?.critical_count ?? 0,
    poor_condition: kpis?.poor_condition ?? 0,
  };

  console.log("📊 Dashboard Data:", {
    kpis: safeKpis,
    stations: stationBreakdown?.length,
    alerts: overdueAlerts?.length,
    monthlyData: monthlyMaintenance?.length,
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KpiCards 
        total_assets={safeKpis.total_assets}
        overdue_count={safeKpis.overdue_count}
        due_soon_count={safeKpis.due_soon_count}
        critical_count={safeKpis.critical_count}
        poor_condition={safeKpis.poor_condition}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets by Station Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Assets by Station</h3>
          <StationChart data={stationBreakdown || []} />
        </div>

        {/* Overdue Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Overdue Maintenance</h3>
          <OverdueAlerts alerts={overdueAlerts || []} />
        </div>
      </div>

      {/* Monthly Maintenance Log Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <MonthlyMaintenanceChart data={monthlyMaintenance || []} />
      </div>
    </div>
  );
}