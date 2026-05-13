// app/dashboard/page.tsx
import DashboardNew from './page.new';
import DashboardLegacy from './page.legacy';

const DASHBOARD_VERSION = process.env.NEXT_PUBLIC_DASHBOARD_VERSION || 'new';

export default function DashboardPage() {
  return DASHBOARD_VERSION === 'legacy' ? <DashboardLegacy /> : <DashboardNew />;
}