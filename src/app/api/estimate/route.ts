import { NextRequest, NextResponse } from 'next/server';
import { db, getDatabaseDisabledReason, isDatabaseEnabled } from '@/db';
import { books, estimates } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs'; // Required for SQLite

const WPM = parseInt(process.env.READ_ALOUD_WPM || '160');

function parseAllowHosts(): RegExp[] {
  return (process.env.ALLOW_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => new RegExp(h.replace(/\./g, '\\.') + '$'));
}

function isAllowedHost(url: URL, allow: RegExp[]): boolean {
  return allow.some((re) => re.test(url.hostname));
}

async function estimateFromUrl(url: string): Promise<
  | { source: 'head'; bytes: number; words: number; minutes: number }
  | { source: 'range'; sampleBytes: number; words: number; minutes: number }
  | null
> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!isAllowedHost(parsed, parseAllowHosts())) {
    return null;
  }

  try {
    const headRes = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
    });
    const length = headRes.headers.get('content-length');
    const bytes = length ? parseInt(length, 10) : NaN;
    if (headRes.ok && Number.isFinite(bytes) && bytes > 0) {
      const { words, minutes } = estimateFromBytes(bytes);
      return { source: 'head', bytes, words, minutes };
    }
  } catch {
    // continue with range fallback
  }

  try {
    const rangeRes = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-65535' },
      cache: 'no-store',
    });

    if (!rangeRes.ok) return null;

    const sample = await rangeRes.text();
    const sampleBytes = new TextEncoder().encode(sample).byteLength;
    if (!Number.isFinite(sampleBytes) || sampleBytes <= 0) return null;

    const words = Math.max(1, Math.round(sample.split(/\s+/).filter(Boolean).length));
    const estimatedWords = Math.max(words, Math.round((words / sampleBytes) * 300_000));
    const minutes = Math.max(1, Math.ceil(estimatedWords / WPM));
    return { source: 'range', sampleBytes, words: estimatedWords, minutes };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json(
      {
        error: 'Estimate cache is unavailable in cloud-only mode',
        reason: getDatabaseDisabledReason(),
      },
      { status: 503 }
    );
  }

  const bookId = parseInt(req.nextUrl.searchParams.get('bookId') || '');
  
  if (!bookId || isNaN(bookId)) {
    return NextResponse.json({ error: 'Invalid bookId' }, { status: 400 });
  }

  let txtUrl: string | null = null;

  try {
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

    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });
    txtUrl = book?.txtUrl ?? null;
  } catch (dbError) {
    console.warn('Estimate API DB lookup failed:', dbError);
    return NextResponse.json(
      {
        status: 'estimate-unavailable',
        message: 'Estimate service is temporarily unavailable',
        bookId,
      },
      { status: 503 }
    );
  }

  if (!txtUrl) {
    return NextResponse.json(
      {
        status: 'no-txt',
        message: 'Book not found or no text format available',
      },
      { status: 404 }
    );
  }

  const estimate = await estimateFromUrl(txtUrl);
  if (!estimate) {
    return NextResponse.json(
      {
        status: 'estimate-unavailable',
        message: 'Unable to estimate reading time right now',
        bookId,
      },
      { status: 404 }
    );
  }

  try {
    await upsertEstimate(bookId, estimate.source, estimate);
  } catch (cacheError) {
    console.warn('Estimate API cache write failed:', cacheError);
  }

  return NextResponse.json({
    bookId,
    source: estimate.source,
    bytes: 'bytes' in estimate ? estimate.bytes : null,
    sampleBytes: 'sampleBytes' in estimate ? estimate.sampleBytes : null,
    words: estimate.words,
    minutes: estimate.minutes,
    cached: false,
  });
}

function estimateFromBytes(bytes: number) {
  // Subtract typical header/footer overhead (approximately 4KB)
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
