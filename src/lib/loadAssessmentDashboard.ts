/**
 * lib/loadAssessmentDashboard.ts
 *
 * Server-side data fetching for the /assessments page.
 * Mirrors the pattern used by loadDashboard.ts for the survey pages.
 *
 * Two entry modes:
 *   1. bankAtId in URL params  → pre-select that bank; school selector shows
 *      only schools with data for that bank.
 *   2. No bankAtId             → show all banks in DDL; school selector starts empty.
 *
 * In both modes the user context is resolved from Airtable when an email is present,
 * falling back to URL params for dev / unregistered access.
 */
import { fetchAssessmentBanks, fetchAssessmentSchools } from './assessmentAirtable';
import { fetchUserPermissions } from './airtable';
import type { AssessmentBank } from './assessmentTypes';
import type { UserContext, SchoolInfo } from './types';

function parseList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const raw = Array.isArray(v) ? v[0] : v;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function rawParam(searchParams: Record<string, string | string[] | undefined>, key: string): string {
  const v = searchParams[key];
  return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : '';
}

export interface AssessmentDashboardProps {
  banks: AssessmentBank[];
  schools: SchoolInfo[];
  defaultBankReportAtId: string;   // empty string = no pre-selection
  userContext: UserContext;
}

/**
 * Load all data needed to render the assessments page.
 *
 * @param searchParams  Next.js page searchParams (from the server component)
 */
export async function loadAssessmentDashboard(
  searchParams: Record<string, string | string[] | undefined>
): Promise<AssessmentDashboardProps> {
  const userEmail       = rawParam(searchParams, 'userEmail');
  const bankReportAtId  = rawParam(searchParams, 'bankAtId');   // Assessment_Bank_Report_AT_ID

  const [banks, schools, airtablePerms] = await Promise.all([
    fetchAssessmentBanks(),
    // When a bankAtId is in the URL, scope the school list to that bank.
    // Otherwise return all schools present in the results table.
    fetchAssessmentSchools(bankReportAtId || undefined),
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
    const accountTypeRaw = rawParam(searchParams, 'accountType');
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

  // Validate the bankReportAtId from the URL against the actual bank list.
  // If it doesn't match any known bank, treat it as no pre-selection.
  const bankExists = banks.some((b) => b.reportAtId === bankReportAtId);
  const defaultBankReportAtId = bankExists ? bankReportAtId : '';

  return { banks, schools, defaultBankReportAtId, userContext };
}
