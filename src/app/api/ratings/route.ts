import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { bookRatings } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';

const USER_ID = 'default'; // For now, single-user mode

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function clampRating(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value) : NaN;
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

// GET /api/ratings?bookIds=1,2,3
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const idsRaw = searchParams.get('bookIds') || '';
    const ids = idsRaw
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (ids.length === 0) {
      return NextResponse.json({ ratings: {} });
    }

    const uniqueIds = Array.from(new Set(ids)).slice(0, 200);

    const rows = await db
      .select({ bookId: bookRatings.bookId, rating: bookRatings.rating })
      .from(bookRatings)
      .where(and(eq(bookRatings.userId, USER_ID), inArray(bookRatings.bookId, uniqueIds)));

    const ratings: Record<number, number> = {};
    for (const r of rows) {
      ratings[r.bookId] = r.rating;
    }

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('Ratings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
  }
}

// POST /api/ratings { bookId, rating }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bookId = parsePositiveInt(String(body?.bookId ?? ''));
    const rating = clampRating(body?.rating);

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }
    if (!rating) {
      return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 });
    }

    const existing = await db
      .select({ id: bookRatings.id })
      .from(bookRatings)
      .where(and(eq(bookRatings.userId, USER_ID), eq(bookRatings.bookId, bookId)))
      .limit(1);

    const now = Date.now();

    if (existing.length > 0) {
      await db
        .update(bookRatings)
        .set({ rating, updatedAt: now })
        .where(eq(bookRatings.id, existing[0].id));
    } else {
      await db.insert(bookRatings).values({
        bookId,
        userId: USER_ID,
        rating,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true, bookId, rating });
  } catch (error) {
    console.error('Ratings POST error:', error);
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
  }
}

// DELETE /api/ratings?bookId=123
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      await db.delete(bookRatings).where(eq(bookRatings.userId, USER_ID));
      return NextResponse.json({ success: true });
    }

    const bookId = parsePositiveInt(searchParams.get('bookId'));
    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    await db
      .delete(bookRatings)
      .where(and(eq(bookRatings.userId, USER_ID), eq(bookRatings.bookId, bookId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ratings DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete rating' }, { status: 500 });
  }
}
