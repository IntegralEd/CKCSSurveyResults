/**
 * GET /api/filters
 *
 * Returns FilterOptions: the unique values for each slicer field
 * (Administration, School, Region, Race, Gender, Grade, Domain).
 *
 * Response is cached for 5 minutes at the edge/server level.
 */
import { NextResponse } from 'next/server';
import { getFilterOptions } from '@/lib/filters';

export const dynamic = 'force-dynamic'; // disable static generation; data is live

export async function GET(): Promise<NextResponse> {
  try {
    const filterOptions = await getFilterOptions();
    return NextResponse.json(filterOptions, {
      headers: {
        // Cache for 5 minutes; stale-while-revalidate for 60 s
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('[GET /api/filters]', err);
    return NextResponse.json(
      { error: 'Failed to fetch filter options', detail: String(err) },
      { status: 500 }
    );
  }
}
