import { NextRequest, NextResponse } from 'next/server';
import { db, getDatabaseDisabledReason, isDatabaseEnabled } from '@/db';
import { readingHistory, books, estimates } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const runtime = 'nodejs';

const USER_ID = 'default'; // For now, single-user mode

function dbUnavailableResponse() {
  return NextResponse.json(
    {
      error: 'Reading history is unavailable in cloud-only mode',
      reason: getDatabaseDisabledReason(),
    },
    { status: 503 }
  );
}

// POST /api/history/update - Update reading progress
export async function POST(req: NextRequest) {
  if (!isDatabaseEnabled()) return dbUnavailableResponse();
  try {
    const { bookId, currentCfi, progressPercent, totalReadingTime } = await req.json();

    if (!bookId) {
      return NextResponse.json(
        { error: 'bookId is required' },
        { status: 400 }
      );
    }

    // Check if history entry exists
    const existing = await db
      .select()
      .from(readingHistory)
      .where(
        and(
          eq(readingHistory.bookId, bookId),
          eq(readingHistory.userId, USER_ID)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(readingHistory)
        .set({
          lastReadAt: Date.now(),
          currentCfi: currentCfi || existing[0].currentCfi,
          progressPercent: progressPercent ?? existing[0].progressPercent,
          totalReadingTime: totalReadingTime ?? existing[0].totalReadingTime,
        })
        .where(eq(readingHistory.id, existing[0].id));
    } else {
      // Create new
      await db.insert(readingHistory).values({
        bookId,
        userId: USER_ID,
        lastReadAt: Date.now(),
        currentCfi: currentCfi || null,
        progressPercent: progressPercent || 0,
        totalReadingTime: totalReadingTime || 0,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('History POST error:', error);
    return NextResponse.json(
      { error: 'Failed to update history' },
      { status: 500 }
    );
  }
}

// GET /api/history - Get reading history
export async function GET(req: NextRequest) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({
      total: 0,
      grouped: { today: [], lastWeek: [], earlier: [] },
      warning: getDatabaseDisabledReason(),
    });
  }
  try {
    const historyItems = await db
      .select({
        id: readingHistory.id,
        bookId: books.id,
        title: books.title,
        authors: books.authors,
        subjects: books.subjects,
        coverUrl: books.coverUrl,
        epubUrl: books.epubUrl,
        lastReadAt: readingHistory.lastReadAt,
        currentCfi: readingHistory.currentCfi,
        progressPercent: readingHistory.progressPercent,
        totalReadingTime: readingHistory.totalReadingTime,
        minutes: estimates.minutes,
        words: estimates.words,
      })
      .from(readingHistory)
      .innerJoin(books, eq(readingHistory.bookId, books.id))
      .leftJoin(estimates, eq(books.id, estimates.bookId))
      .where(eq(readingHistory.userId, USER_ID))
      .orderBy(desc(readingHistory.lastReadAt))
      .limit(100);

    // Group by date
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;

    const grouped = {
      today: [] as any[],
      lastWeek: [] as any[],
      earlier: [] as any[],
    };

    historyItems.forEach((item) => {
      const age = now - item.lastReadAt;
      const book = {
        id: item.bookId,
        title: item.title,
        authors: item.authors,
        subjects: item.subjects ? JSON.parse(item.subjects) : [],
        coverUrl: item.coverUrl,
        epubUrl: item.epubUrl,
        lastReadAt: item.lastReadAt,
        currentCfi: item.currentCfi,
        progressPercent: item.progressPercent || 0,
        totalReadingTime: item.totalReadingTime || 0,
        estimatedMinutes: item.minutes,
        estimatedWords: item.words,
      };

      if (age < oneDayMs) {
        grouped.today.push(book);
      } else if (age < sevenDaysMs) {
        grouped.lastWeek.push(book);
      } else {
        grouped.earlier.push(book);
      }
    });

    return NextResponse.json({
      total: historyItems.length,
      grouped,
    });
  } catch (error) {
    console.error('History GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reading history' },
      { status: 500 }
    );
  }
}

// DELETE /api/history?bookId=123 - Remove from history
export async function DELETE(req: NextRequest) {
  if (!isDatabaseEnabled()) return dbUnavailableResponse();
  try {
    const searchParams = req.nextUrl.searchParams;
    const clearAll = searchParams.get('clearAll') === 'true';
    const bookId = searchParams.get('bookId');

    if (clearAll) {
      await db.delete(readingHistory).where(eq(readingHistory.userId, USER_ID));
      return NextResponse.json(
        { success: true, message: 'Cleared all history' },
        { status: 200 }
      );
    }

    if (!bookId) {
      return NextResponse.json(
        { error: 'bookId is required' },
        { status: 400 }
      );
    }

    await db
      .delete(readingHistory)
      .where(
        and(eq(readingHistory.bookId, parseInt(bookId)), eq(readingHistory.userId, USER_ID))
      );

    return NextResponse.json(
      { success: true, message: 'Removed from history' },
      { status: 200 }
    );
  } catch (error) {
    console.error('History DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from history' },
      { status: 500 }
    );
  }
}
