/**
 * loadDashboard — shared server-side data fetching for dashboard pages.
 *
 * Used by both:
 *   /dashboard       (Softr embed — resolves user permissions from Airtable)
 *   /admin_access    (direct admin access — no user-context restrictions)
 *
 * Keeping the fetch logic here ensures both routes stay in sync.
 */
import { getFilterOptions, getSchoolOptions } from './filters';
import { fetchUserPermissions } from './airtable';
import type { UserContext } from './types';

function parseList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const raw = Array.isArray(v) ? v[0] : v;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Resolve UserContext for the embed route.
 *
 * When a userEmail is present we look up Airtable for authoritative permissions.
 * Falls back to URL params when no Airtable record is found (dev / direct access).
 */
export async function loadEmbedDashboard(
  searchParams: Record<string, string | string[] | undefined>
): Promise<{
  filterOptions: Awaited<ReturnType<typeof getFilterOptions>>;
  schools: Awaited<ReturnType<typeof getSchoolOptions>>;
  userContext: UserContext;
}> {
  const raw = (key: string) => {
    const v = searchParams[key];
    return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : '';
  };

  const userEmail = raw('userEmail');

  const [filterOptions, schools, airtablePerms] = await Promise.all([
    getFilterOptions(),
    getSchoolOptions(),
    userEmail ? fetchUserPermissions(userEmail) : Promise.resolve(null),
  ]);

  let userContext: UserContext;

  if (airtablePerms) {
    userContext = {
      email:           userEmail,
      accountType:     airtablePerms.accountType,
      assignedSchools: airtablePerms.assignedSchools,
      assignedRegions: airtablePerms.assignedRegions,
    };
  } else {
    // No Airtable record — fall back to URL params (dev / unregistered user)
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

  return { filterOptions, schools, userContext };
}

/**
 * Load dashboard data for the admin_access route.
 * No user-context resolution — all schools and features available.
 */
export async function loadAdminDashboard(): Promise<{
  filterOptions: Awaited<ReturnType<typeof getFilterOptions>>;
  schools: Awaited<ReturnType<typeof getSchoolOptions>>;
}> {
  const [filterOptions, schools] = await Promise.all([
    getFilterOptions(),
    getSchoolOptions(),
  ]);
  return { filterOptions, schools };
}
