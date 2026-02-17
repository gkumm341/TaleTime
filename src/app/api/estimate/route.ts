import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, estimates } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs'; // Required for SQLite

const WPM = parseInt(process.env.READ_ALOUD_WPM || '160');

export async function GET(req: NextRequest) {
  const bookId = parseInt(req.nextUrl.searchParams.get('bookId') || '');
  
  if (!bookId || isNaN(bookId)) {
    return NextResponse.json({ error: 'Invalid bookId' }, { status: 400 });
  }

  try {
    // Check if estimate already exists
    const existingEstimate = await db.query.estimates.findFirst({
      where: eq(estimates.bookId, bookId),
    });

    if (existingEstimate) {
      return NextResponse.json({
        bookId,
        source: existingEstimate.source,
        bytes: existingEstimate.bytes,
        words: existingEstimate.words,
        minutes: existingEstimate.minutes,
        cached: true,
      });
    }

    // Fetch book from database
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    if (!book || !book.txtUrl) {
      return NextResponse.json({ 
        status: 'no-txt',
        message: 'Book not found or no text format available' 
      }, { status: 404 });
    }

    // External fetching disabled: without a precomputed estimate, we can't compute one here.
    // (If you want local-only estimation, we can compute from local files instead.)
    return NextResponse.json(
      {
        error: 'Estimate not available (external fetching disabled)',
        bookId,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Estimate API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function estimateFromBytes(bytes: number) {
  // Subtract typical Gutenberg header/footer (approximately 4KB)
  const adjusted = Math.max(0, bytes - 4096);
  // Average English word: 5.1 characters including spaces/newlines
  const words = Math.round(adjusted / 5.1);
  const minutes = Math.max(1, Math.ceil(words / WPM));
  return { words, minutes };
}

async function upsertEstimate(
  bookId: number, 
  source: string, 
  data: { bytes?: number; sampleBytes?: number; words: number; minutes: number }
) {
  await db
    .insert(estimates)
    .values({
      bookId,
      source,
      bytes: data.bytes ?? null,
      sampleBytes: data.sampleBytes ?? null,
      words: data.words,
      minutes: data.minutes,
      wpm: WPM,
      computedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: estimates.bookId,
      set: {
        source,
        bytes: data.bytes ?? null,
        sampleBytes: data.sampleBytes ?? null,
        words: data.words,
        minutes: data.minutes,
        computedAt: Date.now(),
      },
    });
}
