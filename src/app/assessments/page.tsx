/**
 * /assessments — Softr embed route for assessment results.
 *
 * URL params (set by the Softr embed snippet):
 *   userEmail        — triggers Airtable permission lookup
 *   accountType      — fallback if no Airtable record
 *   assignedSchools  — comma-separated school names (fallback)
 *   assignedRegions  — comma-separated region names (fallback)
 *   bankAtId         — Assessment_Bank_Report_AT_ID to pre-select a bank
 *
 * When bankAtId is present the school list is scoped to that bank's records.
 * When absent, the user picks both bank and school.
 */
import { Suspense } from 'react';
import { loadAssessmentDashboard } from '@/lib/loadAssessmentDashboard';
import AssessmentClient from './AssessmentClient';
import LoadingOverlay from '@/components/LoadingOverlay';

export const dynamic = 'force-dynamic';

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { banks, schools, defaultBankReportAtId, userContext } =
    await loadAssessmentDashboard(searchParams);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#17345B]">
          Assessment Results
        </h1>
        {userContext.accountType === 'Site_Admin' && (
          <span className="text-xs text-[#5E738C] bg-slate-100 rounded px-2 py-1">
            Site Admin
          </span>
        )}
      </div>

      <Suspense fallback={<LoadingOverlay message="Loading…" />}>
        <AssessmentClient
          banks={banks}
          schools={schools}
          defaultBankReportAtId={defaultBankReportAtId}
          userContext={userContext}
        />
      </Suspense>
    </div>
  );
}
