/**
 * GET /api/assessment/filters
 *
 * Returns the bank list and optionally a scoped school list for the assessments page.
 *
 * Query params:
 *   bankAtId  — Assessment_Bank_Report_AT_ID (optional). When provided,
 *               the school list is scoped to that bank's records only.
 *
 * Response:
 *   {
 *     banks:   AssessmentBank[]
 *     schools: string[]          — School_Extract values, sorted A–Z
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchAssessmentBanks, fetchAssessmentSchools } from '@/lib/assessmentAirtable';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const bankAtId = request.nextUrl.searchParams.get('bankAtId') ?? undefined;

  try {
    const [banks, schools] = await Promise.all([
      fetchAssessmentBanks(),
      fetchAssessmentSchools(bankAtId),
    ]);
    return NextResponse.json({ banks, schools });
  } catch (err) {
    const detail = err instanceof Error
      ? { message: err.message, stack: err.stack }
      : String(err);
    console.error('[GET /api/assessment/filters]', detail);
    return NextResponse.json(
      { error: 'Assessment filter fetch failed', detail },
      { status: 500 }
    );
  }
}
