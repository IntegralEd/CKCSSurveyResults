/**
 * /dashboard — Softr embed route.
 *
 * Resolves user permissions from Airtable (via loadEmbedDashboard) using the
 * userEmail URL param set by the Softr custom code block. Schools and menu
 * options are constrained to the user's School_Access_Formula.
 *
 * No header rendered here — Softr provides its own top-nav.
 * Layout: see dashboard/layout.tsx
 */
import { Suspense } from 'react';
import { loadEmbedDashboard } from '@/lib/loadDashboard';
import DashboardClient from './DashboardClient';
import LoadingOverlay from '@/components/LoadingOverlay';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { filterOptions, schools, userContext } = await loadEmbedDashboard(searchParams);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#17345B]">
          Survey Results Dashboard
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
