/**
 * /admin_access — Direct admin access route.
 *
 * Identical dashboard experience to /dashboard with two differences:
 *   1. Full access — no user-context restrictions on schools or menu items.
 *   2. Brand AppHeader is visible (rendered by admin_access/layout.tsx).
 *
 * Both routes share DashboardClient and loadDashboard helpers so changes
 * to data fetching or UI logic stay in sync automatically.
 */
import { Suspense } from 'react';
import { loadAdminDashboard } from '@/lib/loadDashboard';
import DashboardClient from '@/app/dashboard/DashboardClient';
import LoadingOverlay from '@/components/LoadingOverlay';

export const dynamic = 'force-dynamic';

export default async function AdminAccessPage() {
  const { filterOptions, schools } = await loadAdminDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#17345B]">
          Survey Results Dashboard
        </h1>
        <span className="text-xs text-[#5E738C] bg-slate-100 rounded px-2 py-1">
          Admin Access
        </span>
      </div>

      <Suspense fallback={<LoadingOverlay message="Loading dashboard…" />}>
        {/* No userContext prop → full access, showDebug = true */}
        <DashboardClient
          filterOptions={filterOptions}
          schools={schools}
        />
      </Suspense>
    </div>
  );
}
