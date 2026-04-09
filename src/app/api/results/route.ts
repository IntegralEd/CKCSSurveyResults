/**
 * POST /api/results
 *
 * Body: { filters: ActiveFilters, mode: 'agreement' | 'topn' }
 * Returns: AgreementRow[] or TopNRow[]
 */
import { NextRequest, NextResponse } from 'next/server';
import { filterRespondents } from '@/lib/filters';
import { getSurveyItems } from '@/lib/items';
import { aggregateAgreement, aggregateTopN } from '@/lib/aggregation';
import type { ResultsRequestBody } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ResultsRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { filters, mode } = body;

  if (!filters || !mode) {
    return NextResponse.json(
      { error: 'Request body must include `filters` and `mode`' },
      { status: 400 }
    );
  }

  if (mode !== 'agreement' && mode !== 'topn') {
    return NextResponse.json(
      { error: '`mode` must be "agreement" or "topn"' },
      { status: 400 }
    );
  }

  try {
    // Run respondent filtering and item fetching in parallel.
    const [respondents, allItems] = await Promise.all([
      filterRespondents(filters),
      getSurveyItems(),
    ]);

    // Only aggregate Likert-scale items — exclude Metadata and Demographic types
    // which have no response data in Survey_Respondents.
    const likertItems = allItems.filter((i) => i.questionType === 'Likert');

    // Apply domain filter to items if specified.
    // categorySelect is a string[] — pass if any category matches a selected domain.
    const items =
      filters.domain.length > 0
        ? likertItems.filter((i) => i.categorySelect.some((c) => filters.domain.includes(c)))
        : likertItems;

    const rows =
      mode === 'agreement'
        ? aggregateAgreement(respondents, items)
        : aggregateTopN(respondents, items);

    return NextResponse.json(rows);
  } catch (err) {
    const detail = err instanceof Error
      ? { message: err.message, stack: err.stack }
      : String(err);
    console.error('[POST /api/results]', detail);
    return NextResponse.json(
      { error: 'Aggregation failed', detail },
      { status: 500 }
    );
  }
}
