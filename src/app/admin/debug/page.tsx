/**
 * /admin/debug — Server Component
 *
 * Diagnostic page. Verifies Airtable connectivity and real field name mappings.
 * Fetches:
 *   1. Slicer field names and sample values (using SLICER_FIELDS constant)
 *   2. First 5 Survey_Items with Question_Label → Respondent field mapping
 *   3. Total respondent count (no filters applied)
 *   4. Sample comment records (first 5)
 *
 * Useful for verifying Airtable field names and data shape before using the dashboard.
 *
 * NOTE: This page is intentionally unprotected for development.
 *   Remove or gate it before sharing the URL publicly.
 */
import { getFilterOptions, filterRespondents, getSchoolOptions } from '@/lib/filters';
import { getSurveyItems, getItemMapById } from '@/lib/items';
import { aggregateAgreement, buildComparisonRows } from '@/lib/aggregation';
import {
  fetchItems,
  fetchRespondents,
  fetchComments,
  fetchSchoolItemResults,
  fetchUserPermissions,
  fetchAllRecords,
  SLICER_FIELDS,
  ITEM_FIELDS,
  COMMENT_FIELDS,
  SCHOOL_RESULT_FIELDS,
  TABLE_RESPONDENTS,
  TABLE_ITEMS,
  TABLE_COMMENTS,
  TABLE_SCHOOL_ITEM_RESULTS,
  TABLE_SCHOOLS,
} from '@/lib/airtable';

export const dynamic = 'force-dynamic';

export default async function DebugPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // ── User permissions lookup (?testEmail=...) ──────────────────────────────
  const rawTestEmail = searchParams?.testEmail;
  const testEmail = typeof rawTestEmail === 'string' ? rawTestEmail.trim() : '';
  let userPerms: Awaited<ReturnType<typeof fetchUserPermissions>> = null;
  let userPermsError: string | null = null;
  if (testEmail) {
    try {
      userPerms = await fetchUserPermissions(testEmail);
    } catch (e) {
      userPermsError = e instanceof Error ? e.message : String(e);
    }
  }
  let filterOptions: Awaited<ReturnType<typeof getFilterOptions>> | null = null;
  let filterError: string | null = null;

  let firstItems: Awaited<ReturnType<typeof fetchItems>> = [];
  let itemsError: string | null = null;

  let respondentCount: number | null = null;
  let respondentError: string | null = null;

  let sampleComments: Awaited<ReturnType<typeof fetchComments>> = [];
  let commentsError: string | null = null;

  let agreementProbe: { rowCount: number; firstRow: unknown } | null = null;
  let agreementError: string | null = null;

  let comparisonProbe: { schoolCount: number; firstSchool: unknown; rowCount: number; firstRow: unknown } | null = null;
  let comparisonError: string | null = null;

  let schoolResultsSample: unknown[] = [];
  let schoolResultsSampleError: string | null = null;

  try {
    filterOptions = await getFilterOptions();
  } catch (e) {
    filterError = String(e);
  }

  try {
    const allItems = await fetchItems();
    // Show first 5 Likert items — Metadata/Demographic items have no response data
    firstItems = allItems.filter((i) => i.questionType === 'Likert').slice(0, 5);
  } catch (e) {
    itemsError = String(e);
  }

  try {
    const respondents = await fetchRespondents(['Respondent_Key']);
    respondentCount = respondents.length;
  } catch (e) {
    respondentError = String(e);
  }

  try {
    sampleComments = await fetchComments([], 5);
  } catch (e) {
    commentsError = String(e);
  }

  try {
    const EMPTY_FILTERS = {
      administration: [], school: [], region: [],
      race: [], gender: [], grade: [], domain: [],
    };
    const [respondents, allItems] = await Promise.all([
      filterRespondents(EMPTY_FILTERS),
      getSurveyItems(),
    ]);
    const likertItems = allItems.filter((i) => i.questionType === 'Likert');
    const rows = aggregateAgreement(respondents, likertItems);
    agreementProbe = { rowCount: rows.length, firstRow: rows[0] ?? null };
  } catch (e) {
    agreementError = e instanceof Error ? e.message : String(e);
  }

      {/* ── Table IDs ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[#17345B] mb-1">
          Table IDs (confirmed from schema registry)
        </h2>
        <pre className="bg-slate-50 border border-slate-200 rounded p-4 text-xs overflow-auto">
          {JSON.stringify(
            {
              Survey_Respondents: TABLE_RESPONDENTS,
              Survey_Items: TABLE_ITEMS,
              Survey_Item_Comments: TABLE_COMMENTS,
              Survey_School_Item_Results: TABLE_SCHOOL_ITEM_RESULTS,
              Schools: TABLE_SCHOOLS,
            },
            null,
            2
          )}
        </pre>
      </section>

      {/* ── Section 1: Slicer field names ──────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[#17345B] mb-1">
          1. Slicer Field Names (SLICER_FIELDS constant)
        </h2>
        <pre className="bg-slate-50 border border-slate-200 rounded p-4 text-xs overflow-auto mb-3">
          {JSON.stringify(SLICER_FIELDS, null, 2)}
        </pre>

        <h3 className="text-sm font-medium text-[#5E738C] mb-1">
          Sample values per slicer (from getFilterOptions)
        </h3>
        {filterError ? (
          <pre className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-xs overflow-auto">
            {filterError}
          </pre>
        ) : (
          <pre className="bg-slate-50 border border-slate-200 rounded p-4 text-xs overflow-auto">
            {JSON.stringify(
              filterOptions
                ? Object.fromEntries(
                    Object.entries(filterOptions).map(([k, v]) => [
                      k,
                      { count: (v as string[]).length, sample: (v as string[]).slice(0, 5) },
                    ])
                  )
                : null,
              null,
              2
            )}
          </pre>
        )}
      </section>

      {/* ── Section 2: Survey Items ────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[#17345B] mb-1">
          2. First 5 Survey_Items — Question_Label maps to Survey_Respondents column
        </h2>
        <p className="text-xs text-[#5E738C] mb-2">
          ITEM_FIELDS: {JSON.stringify(ITEM_FIELDS)}
        </p>
        {itemsError ? (
          <pre className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-xs overflow-auto">
            {itemsError}
          </pre>
        ) : (
          <pre className="bg-slate-50 border border-slate-200 rounded p-4 text-xs overflow-auto">
            {JSON.stringify(
              firstItems.map((i) => ({
                id: i.id,
                itemAtId: i.itemAtId,
                itemOrder: i.itemOrder,
                questionLabel: i.questionLabel,
                prompt: i.prompt,
                questionType: i.questionType,
                categorySelect: i.categorySelect,
                top2Values: i.top2Values,
                top3Values: i.top3Values,
              })),
              null,
              2
            )}
          </pre>
        )}
      </section>

      {/* ── Section 3: Respondent count ───────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[#17345B] mb-1">
          3. Respondent Count (no filters)
        </h2>
        {respondentError ? (
          <pre className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-xs overflow-auto">
            {respondentError}
          </pre>
        ) : (
          <pre className="bg-slate-50 border border-slate-200 rounded p-4 text-xs overflow-auto">
            {JSON.stringify({ respondentCount }, null, 2)}
          </pre>
        )}
      </section>

      {/* ── Section 4: Sample comments ────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[#17345B] mb-1">
          4. Sample Comment Records (first 5, no filter)
        </h2>
        <p className="text-xs text-[#5E738C] mb-2">
          COMMENT_FIELDS: {JSON.stringify(COMMENT_FIELDS)}
        </p>
        {commentsError ? (
          <pre className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-xs overflow-auto">
            {commentsError}
          </pre>
        ) : (
          <pre className="bg-slate-50 border border-slate-200 rounded p-4 text-xs overflow-auto">
            {JSON.stringify(sampleComments, null, 2)}
          </pre>
        )}
      </section>

  // Raw sample from Survey_School_Item_Results — no filter — to confirm School_Txt values
  try {
    const raw = await fetchAllRecords(TABLE_SCHOOL_ITEM_RESULTS, {
      fields: ['School_Txt', 'School_Item_Result_Key', 'Item_Order', 'Percent_Top_2'],
      maxRecords: 5,
    });
    schoolResultsSample = raw.map((r) => r.fields);
  } catch (e) {
    schoolResultsSampleError = e instanceof Error ? e.message : String(e);
  }

  try {
    const schools = await getSchoolOptions();
    const firstSchool = schools[0];
    if (firstSchool) {
      const itemMapById = await getItemMapById();
      const rawResults = await fetchSchoolItemResults(firstSchool.name);
      const rows = buildComparisonRows(rawResults, ['city', 'region', 'network'], itemMapById);
      comparisonProbe = {
        schoolCount: schools.length,
        firstSchool: { name: firstSchool.name, city: firstSchool.city, region: firstSchool.region },
        rowCount: rows.length,
        firstRow: rows[0] ?? null,
      };
    } else {
      comparisonError = 'No schools returned from Schools table';
    }
  } catch (e) {
    comparisonError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="space-y-10 max-w-4xl p-6">
      <h1 className="text-xl font-semibold text-[#17345B]">Airtable Debug</h1>

      {/* ── User Permissions Lookup ─────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[#17345B] mb-2">
          User Permissions Lookup
        </h2>
        <p className="text-xs text-[#5E738C] mb-3">
          Add <code className="bg-slate-100 rounded px-1">?testEmail=user@example.com</code> to resolve
          permissions from Users_Sync for any email. Uses{' '}
          <code className="bg-slate-100 rounded px-1">School_Access_Formula</code> for school list
          and resolves <code className="bg-slate-100 rounded px-1">Assigned_Regions</code> record IDs to names.
        </p>

        {/* Email input form (GET) */}
        <form method="GET" className="flex items-center gap-2 mb-4">
          <input
            name="testEmail"
            type="email"
            defaultValue={testEmail}
            placeholder="test@example.com"
            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#17345B] w-72"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-[#17345B] text-white hover:bg-[#255694] transition-colors"
          >
            Lookup
          </button>
        </form>

        {testEmail && (
          userPermsError ? (
            <pre className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-xs overflow-auto">
              {userPermsError}
            </pre>
          ) : userPerms === null ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-4 text-sm">
              No record found in Users_Sync for <strong>{testEmail}</strong>.
              This user will receive full-access (dev) defaults.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-semibold text-[#5E738C] uppercase tracking-wide">Email</span>
                  <span className="text-sm font-mono text-slate-800">{testEmail}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-semibold text-[#5E738C] uppercase tracking-wide">accountType</span>
                  <span className="rounded px-2 py-0.5 text-xs font-mono text-white" style={{ background: '#17345B' }}>
                    {userPerms.accountType || '(none)'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#5E738C] uppercase tracking-wide block mb-1.5">
                    assignedSchools ({userPerms.assignedSchools.length}) — from School_Access_Formula
                  </span>
                  {userPerms.assignedSchools.length === 0 ? (
                    <span className="text-xs text-slate-400">— none —</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {userPerms.assignedSchools.map((s) => (
                        <span
                          key={s}
                          className="rounded px-2 py-0.5 text-xs text-white"
                          style={{ background: '#255694' }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#5E738C] uppercase tracking-wide block mb-1.5">
                    assignedRegions ({userPerms.assignedRegions.length})
                  </span>
                  {userPerms.assignedRegions.length === 0 ? (
                    <span className="text-xs text-slate-400">— none —</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {userPerms.assignedRegions.map((r) => (
                        <span
                          key={r}
                          className="rounded px-2 py-0.5 text-xs font-medium"
                          style={{ background: '#BCD631', color: '#17345B' }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <pre className="bg-slate-50 border border-slate-200 rounded p-3 text-xs overflow-auto">
                {JSON.stringify(userPerms, null, 2)}
              </pre>
            </div>
          )
        )}
      </section>

      {/* ── Section 6a: Raw School_Txt sample ─────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[#17345B] mb-1">
          6a. Survey_School_Item_Results — raw School_Txt sample (first 5, no filter)
        </h2>
        <p className="text-xs text-[#5E738C] mb-2">
          Used to verify School_Txt values match Schools.School_Name for the filter join.
        </p>
        {schoolResultsSampleError ? (
          <pre className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-xs overflow-auto">
            {schoolResultsSampleError}
          </pre>
        ) : (
          <pre className="bg-slate-50 border border-slate-200 rounded p-4 text-xs overflow-auto">
            {JSON.stringify(schoolResultsSample, null, 2)}
          </pre>
        )}
      </section>

      {/* ── Section 6: Comparison probe ───────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[#17345B] mb-1">
          6. Comparison Probe — first school, all comparison groups
        </h2>
        <p className="text-xs text-[#5E738C] mb-2">
          SCHOOL_RESULT_FIELDS (key subset): schoolTxt, itemOrder, percentTop2, cityTop2Pct, regionTop2Pct, networkTop2Pct
        </p>
        {comparisonError ? (
          <pre className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-xs overflow-auto">
            {comparisonError}
          </pre>
        ) : (
          <pre className="bg-slate-50 border border-slate-200 rounded p-4 text-xs overflow-auto">
            {JSON.stringify(comparisonProbe, null, 2)}
          </pre>
        )}
      </section>

      {/* ── Section 5: Agreement aggregation probe ────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[#17345B] mb-1">
          5. Agreement Aggregation Probe (no filters, Likert items only)
        </h2>
        {agreementError ? (
          <pre className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-xs overflow-auto">
            {agreementError}
          </pre>
        ) : (
          <pre className="bg-slate-50 border border-slate-200 rounded p-4 text-xs overflow-auto">
            {JSON.stringify(agreementProbe, null, 2)}
          </pre>
        )}
      </section>

      <p className="text-xs text-[#5E738C]">
        This page is intentionally unprotected for development. Remove or
        gate it before sharing the URL publicly.
      </p>
    </div>
  );
}
