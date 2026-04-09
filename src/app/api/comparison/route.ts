/**
 * POST /api/comparison
 *
 * Fetch pre-aggregated school-level results with optional comparison groups.
 *
 * Body:
 *   schoolTxt        — School_Txt value from Survey_School_Item_Results
 *   comparisonGroups — ('city' | 'region' | 'network')[]
 *   domain           — string[] domain filter (empty = all)
 *
 * Returns: ComparisonRow[] sorted by itemOrder ascending
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchSchoolItemResults } from '@/lib/airtable';
import { getItemMapById } from '@/lib/items';
import { buildComparisonRows } from '@/lib/aggregation';
import type { ComparisonGroup } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ComparisonRequestBody {
  schoolTxt: string;        // School_Txt value from Survey_School_Item_Results (= SchoolInfo.name)
  comparisonGroups: ComparisonGroup[];
  domain?: string[];
  administration?: string;  // Administration_Key to filter; dedup applied as safety net
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ComparisonRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { schoolTxt, comparisonGroups, domain = [], administration } = body;

  if (!schoolTxt) {
    return NextResponse.json(
      { error: 'Request body must include `schoolTxt`' },
      { status: 400 }
    );
  }

  const validGroups: ComparisonGroup[] = ['city', 'region', 'network'];
  const invalidGroups = (comparisonGroups ?? []).filter(
    (g) => !validGroups.includes(g)
  );
  if (invalidGroups.length > 0) {
    return NextResponse.json(
      { error: `Invalid comparisonGroups: ${invalidGroups.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const [rawResults, itemMapById] = await Promise.all([
      fetchSchoolItemResults(schoolTxt),
      getItemMapById(),
    ]);

    // Apply optional domain filter
    let filtered =
      domain.length > 0
        ? rawResults.filter((r) => {
            const item = itemMapById.get(r.surveyItemRecordId);
            return item
              ? item.categorySelect.some((c) => domain.includes(c))
              : false;
          })
        : rawResults;

    // Filter by administration when provided, then deduplicate by questionLabel.
    // Survey_School_Item_Results has one row per school × item × administration,
    // so without filtering the same item appears once per administration.
    if (administration) {
      const adminFiltered = filtered.filter(
        (r) => !r.administrationKey || r.administrationKey === administration
      );
      // Fall back to all records if key format doesn't match (e.g. record ID vs label)
      if (adminFiltered.length > 0) filtered = adminFiltered;
    }
    // Dedup: keep first occurrence per questionLabel (results already sorted by itemOrder asc)
    const seen = new Set<string>();
    filtered = filtered.filter((r) => {
      if (seen.has(r.questionLabel)) return false;
      seen.add(r.questionLabel);
      return true;
    });

    const rows = buildComparisonRows(
      filtered,
      comparisonGroups ?? [],
      itemMapById
    );

    return NextResponse.json(rows);
  } catch (err) {
    const detail = err instanceof Error
      ? { message: err.message, stack: err.stack }
      : String(err);
    console.error('[POST /api/comparison]', detail);
    return NextResponse.json(
      { error: 'Comparison fetch failed', detail },
      { status: 500 }
    );
  }
}
