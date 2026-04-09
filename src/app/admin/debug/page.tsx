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
import { getFilterOptions } from '@/lib/filters';
import {
  fetchItems,
  fetchRespondents,
  fetchComments,
  SLICER_FIELDS,
  ITEM_FIELDS,
  COMMENT_FIELDS,
  TABLE_RESPONDENTS,
  TABLE_ITEMS,
  TABLE_COMMENTS,
} from '@/lib/airtable';

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
  let filterOptions: Awaited<ReturnType<typeof getFilterOptions>> | null = null;
  let filterError: string | null = null;

  let firstItems: Awaited<ReturnType<typeof fetchItems>> = [];
  let itemsError: string | null = null;

  let respondentCount: number | null = null;
  let respondentError: string | null = null;

  let sampleComments: Awaited<ReturnType<typeof fetchComments>> = [];
  let commentsError: string | null = null;

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

  return (
    <div className="space-y-10 max-w-4xl p-6">
      <h1 className="text-xl font-semibold text-[#17345B]">Airtable Debug</h1>

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

      <p className="text-xs text-[#5E738C]">
        This page is intentionally unprotected for development. Remove or
        gate it before sharing the URL publicly.
      </p>
    </div>
  );
}
