/**
 * /dashboard — Server Component shell.
 *
 * Fetches filter options and school list server-side so the initial page
 * render already has all selector data. Heavy client work lives in DashboardClient.
 *
 * Accepts Softr user context via URL search params (set by the embed snippet):
 *   ?accountType=School_User&userEmail=...&assignedSchools=Austin+Brave&assignedRegions=Texas
 */
import { Suspense } from 'react';
import { getFilterOptions, getSchoolOptions } from '@/lib/filters';
import { fetchUserPermissions } from '@/lib/airtable';
import DashboardClient from './DashboardClient';
import LoadingOverlay from '@/components/LoadingOverlay';
import type { UserContext } from '@/lib/types';

export const dynamic = 'force-dynamic';

function parseList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const raw = Array.isArray(v) ? v[0] : v;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const raw = (key: string) => {
    const v = searchParams[key];
    return typeof v === 'string' ? v : (Array.isArray(v) ? v[0] : '');
  };

  const userEmail = raw('userEmail');

  // Run data fetches in parallel; resolve permissions server-side when email is present.
  const [filterOptions, schools, airtablePerms] = await Promise.all([
    getFilterOptions(),
    getSchoolOptions(),
    userEmail ? fetchUserPermissions(userEmail) : Promise.resolve(null),
  ]);

  let userContext: UserContext;

  if (airtablePerms) {
    // Authoritative permissions from Airtable Users_Sync — override URL params.
    userContext = {
      email:           userEmail,
      accountType:     airtablePerms.accountType,
      assignedSchools: airtablePerms.assignedSchools,
      assignedRegions: airtablePerms.assignedRegions,
    };
  } else {
    // No Airtable record found (dev / direct access) — fall back to URL params.
    const accountTypeRaw = raw('accountType');
    const validTypes = ['Site_Admin', 'Client_Admin', 'Region_User', 'School_User'];
    const accountType = validTypes.includes(accountTypeRaw)
      ? (accountTypeRaw as UserContext['accountType'])
      : '';
    userContext = {
      email:           userEmail,
      accountType,
      assignedSchools: parseList(searchParams.assignedSchools),
      assignedRegions: parseList(searchParams.assignedRegions),
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#17345B]">
          Survey Results Dashboard
        </h1>
        {/* Site_Admin badge — visible only when accountType is resolved */}
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
