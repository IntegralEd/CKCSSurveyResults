/**
 * POST /api/assessment/results
 *
 * Fetch pre-aggregated assessment school-item results with optional comparison groups.
 *
 * Body:
 *   schoolExtract    — School_Extract value from Assessment_Results_School_Item
 *   bankReportAtId   — Assessment_Bank_Report_AT_ID (recXXX) — required
 *   comparisonGroups — ('city' | 'region' | 'network')[]
 *
 * Returns: AssessmentRow[] sorted by itemOrder ascending
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchAssessmentResults } from '@/lib/assessmentAirtable';
import { buildAssessmentRows } from '@/lib/assessmentAggregation';
import type { AssessmentComparisonGroup } from '@/lib/assessmentTypes';

export const dynamic = 'force-dynamic';

interface AssessmentResultsRequestBody {
  schoolExtract: string;
  bankReportAtId: string;
  comparisonGroups: AssessmentComparisonGroup[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: AssessmentResultsRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { schoolExtract, bankReportAtId, comparisonGroups = [] } = body;

  if (!schoolExtract) {
    return NextResponse.json(
      { error: 'Request body must include `schoolExtract`' },
      { status: 400 }
    );
  }
  if (!bankReportAtId) {
    return NextResponse.json(
      { error: 'Request body must include `bankReportAtId`' },
      { status: 400 }
    );
  }

  const validGroups: AssessmentComparisonGroup[] = ['city', 'region', 'network'];
  const invalidGroups = comparisonGroups.filter((g) => !validGroups.includes(g));
  if (invalidGroups.length > 0) {
    return NextResponse.json(
      { error: `Invalid comparisonGroups: ${invalidGroups.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const rawResults = await fetchAssessmentResults(schoolExtract, bankReportAtId);
    const rows = buildAssessmentRows(rawResults, comparisonGroups);
    return NextResponse.json(rows);
  } catch (err) {
    const detail = err instanceof Error
      ? { message: err.message, stack: err.stack }
      : String(err);
    console.error('[POST /api/assessment/results]', detail);
    return NextResponse.json(
      { error: 'Assessment results fetch failed', detail },
      { status: 500 }
    );
  }
}
