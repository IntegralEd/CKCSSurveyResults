/**
 * /dashboard — Server Component shell.
 *
 * Fetches filter options and school list server-side so the initial page
 * render already has all selector data. Heavy client work lives in DashboardClient.
 */
import { Suspense } from 'react';
import { getFilterOptions, getSchoolOptions } from '@/lib/filters';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [filterOptions, schools] = await Promise.all([
    getFilterOptions(),
    getSchoolOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#17345B]">
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
        <DashboardClient filterOptions={filterOptions} schools={schools} />
      </Suspense>
    </div>
  );
}
