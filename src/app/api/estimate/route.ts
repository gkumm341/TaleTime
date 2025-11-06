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

    // Try HEAD request first
    try {
      const head = await fetch(book.txtUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      
      if (head.ok) {
        const len = parseInt(head.headers.get('content-length') || '0');
        if (len > 1024) {
          const est = estimateFromBytes(len);
          await upsertEstimate(bookId, 'txt-head', { bytes: len, ...est });
          return NextResponse.json({ 
            bookId, 
            source: 'txt-head', 
            ...est 
          });
        }
      }
    } catch (headError) {
      console.log('HEAD request failed, falling back to Range:', headError);
    }

    // Fallback: Range request for 128 KB sample
    try {
      const range = await fetch(book.txtUrl, { 
        headers: { Range: 'bytes=0-131071' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!range.ok) {
        return NextResponse.json(
          { error: 'Upstream error', status: range.status },
          { status: 502 }
        );
      }

      const buf = await range.arrayBuffer();
      const sampleBytes = buf.byteLength;
      const text = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf));
      const words = (text.trim().match(/\S+/g) || []).length;

      // Extract total size from Content-Range header if available
      const cr = range.headers.get('content-range');
      const total = cr && /\/(\d+)$/.exec(cr)?.[1] 
        ? parseInt(/\/(\d+)$/.exec(cr)![1]) 
        : sampleBytes;

      const est = estimateFromSample(total, sampleBytes, words);
      await upsertEstimate(bookId, 'txt-sample', { 
        bytes: total, 
        sampleBytes, 
        words: est.words, 
        minutes: est.minutes 
      });

      return NextResponse.json({ 
        bookId, 
        source: 'txt-sample', 
        ...est 
      });
    } catch (rangeError) {
      console.error('Range request failed:', rangeError);
      return NextResponse.json(
        { error: 'Failed to sample text file' },
        { status: 500 }
      );
    }
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

function estimateFromSample(
  totalBytes: number, 
  sampleBytes: number, 
  sampleWords: number
) {
  const words = Math.round((sampleWords / sampleBytes) * totalBytes);
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
