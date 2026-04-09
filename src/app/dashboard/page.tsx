/**
 * /dashboard — Server Component shell.
 *
 * Fetches filter options server-side so the initial page render already has
 * all dropdown data. The heavy client-side work (filtering, fetching results)
 * lives in DashboardClient.
 */
import { Suspense } from 'react';
import { getFilterOptions } from '@/lib/filters';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Fetch filter options on the server; errors here surface as a 500.
  const filterOptions = await getFilterOptions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">
          Survey Results Dashboard
        </h1>
      </div>

      <Suspense
        fallback={
          <div className="text-slate-500 text-sm py-8 text-center">
            Loading dashboard…
          </div>
        }
      >
        <DashboardClient filterOptions={filterOptions} />
      </Suspense>
    </div>
  );
}
