/**
 * /surveys — Softr embed route for survey custom reports.
 *
 * Delegates to the same DashboardClient and loadEmbedDashboard logic
 * used by /dashboard. This route provides a stable canonical URL for
 * the survey results embed (the old /dashboard path will remain functional
 * for backwards compatibility).
 *
 * URL params: same as /dashboard — userEmail, accountType, assignedSchools,
 *             assignedRegions, and all survey filter params.
 */
import { Suspense } from 'react';
import { loadEmbedDashboard } from '@/lib/loadDashboard';
import DashboardClient from '@/app/dashboard/DashboardClient';
import LoadingOverlay from '@/components/LoadingOverlay';

export const dynamic = 'force-dynamic';

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { filterOptions, schools, userContext } = await loadEmbedDashboard(searchParams);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#17345B]">
          Survey Results
        </h1>
        {userContext.accountType === 'Site_Admin' && (
          <span className="text-xs text-[#5E738C] bg-slate-100 rounded px-2 py-1">
            Site Admin
          </span>
        )}
      </div>

      <Suspense fallback={<LoadingOverlay message="Loading dashboard…" />}>
        <DashboardClient
          filterOptions={filterOptions}
          schools={schools}
          userContext={userContext}
        />
      </Suspense>
    </div>
  );
}
