/**
 * POST /api/comments
 *
 * Body: { filters: ActiveFilters }
 * Returns: CommentRow[]
 */
import { NextRequest, NextResponse } from 'next/server';
import { filterRespondents } from '@/lib/filters';
import { getItemMap } from '@/lib/items';
import { getComments } from '@/lib/comments';
import type { CommentsRequestBody } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: CommentsRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { filters } = body;

  if (!filters) {
    return NextResponse.json(
      { error: 'Request body must include `filters`' },
      { status: 400 }
    );
  }

  try {
    const [respondents, itemMap] = await Promise.all([
      filterRespondents(filters),
      getItemMap(),
    ]);

    const comments = await getComments(respondents, itemMap);
    return NextResponse.json(comments);
  } catch (err) {
    console.error('[POST /api/comments]', err);
    return NextResponse.json(
      { error: 'Failed to fetch comments', detail: String(err) },
      { status: 500 }
    );
  }
}
