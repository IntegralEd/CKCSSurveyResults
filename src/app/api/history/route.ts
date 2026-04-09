/**
 * POST /api/history
 *
 * Body: { adminA: string; adminB: string; domain?: string[]; school?: string[] }
 * Returns: HistoryRow[]
 *
 * Fetches and aggregates Likert responses for two administrations, then
 * merges by questionLabel to produce side-by-side top-2% columns.
 */
import { NextRequest, NextResponse } from 'next/server';
import { filterRespondents } from '@/lib/filters';
import { getSurveyItems } from '@/lib/items';
import { aggregateAgreement } from '@/lib/aggregation';
import type { HistoryRow, ActiveFilters } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface HistoryRequestBody {
  adminA: string;
  adminB: string;
  domain?: string[];
  school?: string[];
}

const EMPTY: Omit<ActiveFilters, 'administration' | 'domain' | 'school'> = {
  region: [], race: [], gender: [], grade: [],
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: HistoryRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { adminA, adminB, domain = [], school = [] } = body;
  if (!adminA || !adminB) {
    return NextResponse.json({ error: 'adminA and adminB are required' }, { status: 400 });
  }

  try {
    const filtersA: ActiveFilters = { ...EMPTY, administration: [adminA], domain, school };
    const filtersB: ActiveFilters = { ...EMPTY, administration: [adminB], domain, school };

    const [respondentsA, respondentsB, allItems] = await Promise.all([
      filterRespondents(filtersA),
      filterRespondents(filtersB),
      getSurveyItems(),
    ]);

    const likertItems = allItems.filter((i) => i.questionType === 'Likert');
    const rowsA = aggregateAgreement(respondentsA, likertItems);
    const rowsB = aggregateAgreement(respondentsB, likertItems);

    const mapB = new Map(rowsB.map((r) => [r.questionLabel, r]));

    const history: HistoryRow[] = rowsA.map((a) => {
      const b = mapB.get(a.questionLabel) ?? null;
      return {
        itemOrder: a.itemOrder,
        questionLabel: a.questionLabel,
        prompt: a.prompt,
        domain: a.domain,
        aN: a.n,
        aTop1Pct: a.stronglyAgreePct,
        aTop2Pct: a.top2Pct,
        aTop3Pct: a.top3Pct,
        bN: b ? b.n : null,
        bTop1Pct: b ? b.stronglyAgreePct : null,
        bTop2Pct: b ? b.top2Pct : null,
        bTop3Pct: b ? b.top3Pct : null,
      };
    });

    history.sort((a, b) => a.itemOrder - b.itemOrder);

    return NextResponse.json(history);
  } catch (err) {
    console.error('[POST /api/history]', err);
    return NextResponse.json(
      { error: 'Failed to compute history', detail: String(err) },
      { status: 500 }
    );
  }
}
