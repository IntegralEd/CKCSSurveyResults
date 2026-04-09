/**
 * GET /api/items
 *
 * Returns all Survey_Items where Include_In_Report is true,
 * sorted by Display_Order ascending.
 */
import { NextResponse } from 'next/server';
import { getSurveyItems } from '@/lib/items';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const items = await getSurveyItems();
    return NextResponse.json(items, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('[GET /api/items]', err);
    return NextResponse.json(
      { error: 'Failed to fetch survey items', detail: String(err) },
      { status: 500 }
    );
  }
}
