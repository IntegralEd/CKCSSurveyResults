/**
 * GET /api/filters
 *
 * Returns:
 *   filterOptions — unique values per slicer field (admin, school, region, race, gender, grade, domain)
 *   schools       — SchoolInfo[] with name, fullName, city, region for the school selector
 *                   and comparison group dependency resolution
 */
import { NextResponse } from 'next/server';
import { getFilterOptions, getSchoolOptions } from '@/lib/filters';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const [filterOptions, schools] = await Promise.all([
      getFilterOptions(),
      getSchoolOptions(),
    ]);
    return NextResponse.json({ filterOptions, schools }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/filters]', detail);
    return NextResponse.json(
      { error: 'Failed to fetch filter options', detail },
      { status: 500 }
    );
  }
}
