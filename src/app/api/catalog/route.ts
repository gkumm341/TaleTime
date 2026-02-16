import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, estimates, cacheManifest } from '@/db/schema';
import { eq, sql, like, and, or, inArray } from 'drizzle-orm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { syncLocalByTitleToDb } from '@/lib/local-book-sync';
import { maybeTranslateManyTexts, resolveRequestLocale, shouldTranslate } from '@/lib/server/translation';

export const runtime = 'nodejs'; // Required for SQLite

const DEFAULT_ITEMS_PER_PAGE = 100;
const MAX_ITEMS_PER_PAGE = 100;

function normalizeTitleKey(input: string): string {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const HIDDEN_LOCAL_TITLE_KEYS = new Set([
  normalizeTitleKey('The Blue Fairy Book'),
]);

function isHiddenLocalTitle(title: string): boolean {
  return HIDDEN_LOCAL_TITLE_KEYS.has(normalizeTitleKey(title));
}

function buildTitleCandidates(rawTitle: string): string[] {
  const candidates = [
    rawTitle,
    rawTitle.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    rawTitle.replace(/\s*\[[^\]]*\]\s*$/, '').trim(),
    rawTitle.split(':')[0]?.trim() || rawTitle,
    rawTitle.replace(/\s*:\s*\$[a-z]\b\s*/gi, ' ').trim(),
    rawTitle.replace(/\$[a-z]\b/gi, ' ').trim(),
  ]
    .map((t) => t.replace(/\s*\[[^\]]*\]\s*$/, '').trim())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const k = normalizeTitleKey(c);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

async function getLocalBookIdsWithText(): Promise<number[]> {
  const baseDir = process.env.LOCAL_TEXT_DIR || '.data/texts';
  const rootDir = path.resolve(process.cwd(), baseDir);

  let entries: Array<{ name: string; isDirectory: () => boolean }> = [];
  try {
    entries = (await fs.readdir(rootDir, { withFileTypes: true })) as unknown as typeof entries;
  } catch {
    return [];
  }

  const candidates = entries
    .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
    .map((e) => ({ id: Number(e.name), dir: path.join(rootDir, e.name) }))
    .filter((x) => Number.isFinite(x.id) && x.id > 0);

  const exists = async (p: string) => {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  };

  const checks = await Promise.all(
    candidates.map(async (c) => {
      const hasFull =
        (await exists(path.join(c.dir, 'full.txt'))) ||
        (await exists(path.join(c.dir, 'full.story.json'))) ||
        (await exists(path.join(c.dir, 'full.pages.json')));
      const hasBedtime =
        (await exists(path.join(c.dir, 'bedtime.txt'))) ||
        (await exists(path.join(c.dir, 'bedtime.story.json'))) ||
        (await exists(path.join(c.dir, 'bedtime.pages.json')));
      return { id: c.id, ok: hasFull || hasBedtime };
    })
  );

  const numericIds = checks.filter((c) => c.ok).map((c) => c.id);

  // Also support: ${LOCAL_TEXT_DIR}/by-title/<Title>/full.txt|bedtime.txt
  const byTitleRoot = path.join(rootDir, 'by-title');
  let byTitleEntries: Array<{ name: string; isDirectory: () => boolean }> = [];
  try {
    byTitleEntries = (await fs.readdir(byTitleRoot, { withFileTypes: true })) as unknown as typeof byTitleEntries;
  } catch {
    byTitleEntries = [];
  }

  const byTitleFolders = byTitleEntries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !isHiddenLocalTitle(name));

  const byTitleWithText = await Promise.all(
    byTitleFolders.map(async (folder) => {
      const fullPath = path.join(byTitleRoot, folder, 'full.txt');
      const bedtimePath = path.join(byTitleRoot, folder, 'bedtime.txt');
      const fullJsonPath = path.join(byTitleRoot, folder, 'full.story.json');
      const bedtimeJsonPath = path.join(byTitleRoot, folder, 'bedtime.story.json');
      const fullPagesPath = path.join(byTitleRoot, folder, 'full.pages.json');
      const bedtimePagesPath = path.join(byTitleRoot, folder, 'bedtime.pages.json');
      return {
        folder,
        ok:
          (await exists(fullPath)) ||
          (await exists(bedtimePath)) ||
          (await exists(fullJsonPath)) ||
          (await exists(bedtimeJsonPath)) ||
          (await exists(fullPagesPath)) ||
          (await exists(bedtimePagesPath)),
      };
    })
  );

  const availableFolders = byTitleWithText.filter((x) => x.ok).map((x) => x.folder);
  if (availableFolders.length === 0) {
    return Array.from(new Set(numericIds));
  }

  const foldersByKey = new Map<string, string>();
  for (const f of availableFolders) {
    const k = normalizeTitleKey(f);
    if (!k) continue;
    if (!foldersByKey.has(k)) foldersByKey.set(k, f);
  }

  // Resolve folder names to book IDs via DB titles (exact-ish, with simple title variants).
  const resolvedIds: number[] = [];
  for (const folder of availableFolders) {
    const folderKey = normalizeTitleKey(folder);
    if (!folderKey) continue;

    // 1) Try case-insensitive exact title match.
    const exact = await db
      .select({ id: books.id, title: books.title })
      .from(books)
      .where(sql`lower(${books.title}) = ${folder.toLowerCase()}`)
      .orderBy(books.id)
      .limit(1);
    if (exact.length > 0) {
      resolvedIds.push(exact[0].id);
      continue;
    }

    // 2) Try matching against simple title candidates for a small pool of likely books.
    //    (Avoid scanning the full DB.)
    const folderWords = folderKey.split(' ').filter(Boolean);
    const stop = new Set(['the', 'a', 'an', 'and', 'of', 'in', 'to', 'on', 'for', 'with']);
    const needle =
      folderWords.find((w) => w.length >= 4 && !stop.has(w)) ||
      folderWords.find((w) => w.length >= 3) ||
      folderWords[0] ||
      folderKey;
    const pool = await db
      .select({ id: books.id, title: books.title })
      .from(books)
      .where(like(books.title, `%${needle}%`))
      .orderBy(books.id)
      .limit(200);

    let bestId: number | null = null;
    for (const b of pool) {
      const candidates = buildTitleCandidates(b.title);
      for (const c of candidates) {
        if (normalizeTitleKey(c) === folderKey) {
          bestId = bestId == null ? b.id : Math.min(bestId, b.id);
          break;
        }
      }
    }
    if (bestId != null) resolvedIds.push(bestId);
  }

  return Array.from(new Set([...numericIds, ...resolvedIds]));
}

let lastLocalSyncAt = 0;
let localSyncInFlight: Promise<void> | null = null;

async function maybeSyncLocalByTitle(): Promise<void> {
  const contentMode = (process.env.CONTENT_MODE || 'local').toLowerCase();
  if (contentMode !== 'local') return;

  const now = Date.now();
  // avoid re-scanning on every request
  if (now - lastLocalSyncAt < 10_000) return;

  if (!localSyncInFlight) {
    localSyncInFlight = (async () => {
      await syncLocalByTitleToDb();
      lastLocalSyncAt = Date.now();
    })().finally(() => {
      localSyncInFlight = null;
    });
  }

  await localSyncInFlight;
}

type CatalogBookResult = {
  id: number;
  title: string;
  authors: string;
  subjects: string[];
  coverUrl: string | null;
  txtUrl: string | null;
  epubUrl: string | null;
  downloadCount: number | null;
  minutes: number | null;
  words: number | null;
  isCached: boolean;
};

async function localizeCatalogResults(results: CatalogBookResult[], locale: ReturnType<typeof resolveRequestLocale>) {
  if (!shouldTranslate(locale) || results.length === 0) return results;

  const titles = await maybeTranslateManyTexts(
    results.map((r) => r.title),
    locale,
    'catalog-title'
  );

  const authors = await maybeTranslateManyTexts(
    results.map((r) => r.authors),
    locale,
    'catalog-authors'
  );

  const translatedSubjects = await Promise.all(
    results.map(async (r, idx) =>
      maybeTranslateManyTexts(r.subjects, locale, `catalog-subjects:${idx}`)
    )
  );

  return results.map((r, idx) => ({
    ...r,
    title: titles[idx] ?? r.title,
    authors: authors[idx] ?? r.authors,
    subjects: translatedSubjects[idx] ?? r.subjects,
  }));
}

// inside your GET handler, near the top:
export async function GET(req: NextRequest) {
  await maybeSyncLocalByTitle();
  const locale = resolveRequestLocale(req);
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const bookId = searchParams.get('bookId');
  const idsParam = searchParams.get('ids');
  const sortBy = searchParams.get('sortBy') || 'popularity';
  const languages = searchParams.get('languages')?.split(',').filter(Boolean) || [];
  const durations = searchParams.get('durations')?.split(',').filter(Boolean) || [];
  const ageCategories = searchParams.get('ageCategories')?.split(',').filter(Boolean) || [];
  const offlineOnly = searchParams.get('offlineOnly') === 'true';
  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(DEFAULT_ITEMS_PER_PAGE)),
    MAX_ITEMS_PER_PAGE
  );

  try {
    const contentMode = (process.env.CONTENT_MODE || 'local').toLowerCase();
    const localIds = contentMode === 'local' ? await getLocalBookIdsWithText() : null;

    // If ids are provided, return those books (batch fetch) in the same order.
    if (idsParam) {
      const rawIds = idsParam
        .split(',')
        .map((s) => parseInt(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      const uniqueIds = Array.from(new Set(rawIds)).slice(0, MAX_ITEMS_PER_PAGE);

      if (uniqueIds.length === 0) {
        return NextResponse.json({ count: 0, next: null, previous: null, results: [] });
      }

      const allowedIds =
        contentMode === 'local' && localIds ? uniqueIds.filter((id) => localIds.includes(id)) : uniqueIds;

      if (allowedIds.length === 0) {
        return NextResponse.json({ count: 0, next: null, previous: null, results: [] });
      }

      const rows = await db
        .select({
          id: books.id,
          title: books.title,
          authors: books.authors,
          subjects: books.subjects,
          coverUrl: books.coverUrl,
          txtUrl: books.txtUrl,
          epubUrl: books.epubUrl,
          downloadCount: books.downloadCount,
          minutes: estimates.minutes,
          words: estimates.words,
          isCached: cacheManifest.epubBlobKey,
        })
        .from(books)
        .leftJoin(estimates, eq(books.id, estimates.bookId))
        .leftJoin(cacheManifest, eq(books.id, cacheManifest.bookId))
        .where(inArray(books.id, allowedIds))
        .limit(allowedIds.length);

      const byId = new Map<number, (typeof rows)[number]>();
      for (const r of rows) byId.set(r.id, r);

      const ordered = allowedIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((result) => ({
          id: result!.id,
          title: result!.title,
          authors: result!.authors ?? 'Unknown',
          subjects: result!.subjects ? JSON.parse(result!.subjects) : [],
          coverUrl: result!.coverUrl,
          txtUrl: result!.txtUrl,
          epubUrl: result!.epubUrl,
          downloadCount: result!.downloadCount,
          minutes: result!.minutes,
          words: result!.words,
          isCached: Boolean(result!.isCached),
        })) as CatalogBookResult[];

      const localized = await localizeCatalogResults(ordered, locale);

      return NextResponse.json({
        count: localized.length,
        next: null,
        previous: null,
        results: localized,
      });
    }

    // If bookId is provided, return single book
    if (bookId) {
      const parsedId = parseInt(bookId);
      if (contentMode === 'local' && localIds && !localIds.includes(parsedId)) {
        return NextResponse.json(
          { error: 'Book not found (no local text file)' },
          { status: 404 }
        );
      }

      const book = await db
        .select({
          id: books.id,
          title: books.title,
          authors: books.authors,
          subjects: books.subjects,
          coverUrl: books.coverUrl,
          txtUrl: books.txtUrl,
          epubUrl: books.epubUrl,
          downloadCount: books.downloadCount,
          minutes: estimates.minutes,
          words: estimates.words,
          isCached: cacheManifest.epubBlobKey,
        })
        .from(books)
        .leftJoin(estimates, eq(books.id, estimates.bookId))
        .leftJoin(cacheManifest, eq(books.id, cacheManifest.bookId))
        .where(eq(books.id, parsedId))
        .limit(1);

      if (book.length === 0) {
        return NextResponse.json(
          { error: 'Book not found' },
          { status: 404 }
        );
      }

      const result = book[0];
      const localizedSingle = await localizeCatalogResults(
        [{
          id: result.id,
          title: result.title,
          authors: result.authors ?? 'Unknown',
          subjects: result.subjects ? JSON.parse(result.subjects) : [],
          coverUrl: result.coverUrl,
          txtUrl: result.txtUrl,
          epubUrl: result.epubUrl,
          downloadCount: result.downloadCount,
          minutes: result.minutes,
          words: result.words,
          isCached: !!result.isCached,
        }],
        locale
      );

      return NextResponse.json({
        count: 1,
        next: null,
        previous: null,
        results: localizedSingle,
      });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(books.title, `%${search}%`),
          like(books.authors, `%${search}%`)
        )
      );
    }

    // Language filter
    if (languages.length > 0) {
      const languageConditions = languages.map(lang => 
        like(books.languages, `%${lang}%`)
      );
      conditions.push(or(...languageConditions));
    }

    // Age category filter (via subjects)
    if (ageCategories.length > 0) {
      const AGE_KEYWORDS: Record<string, string[]> = {
        'early-readers': ['Nursery rhymes', 'Picture books'],
        'beginning-readers': ['Fairy tales', 'Fables', 'Children\'s stories', 'Juvenile fiction'],
        'middle-grade': ['Adventure', 'Fantasy', 'Bildungsromans', 'Pirates', 'Treasure'],
        'young-adult': ['Young adult', 'Romance', 'Psychological'],
      };
      
      const subjectConditions = ageCategories.flatMap(category => 
        (AGE_KEYWORDS[category] || []).map(keyword => 
          like(books.subjects, `%${keyword}%`)
        )
      );
      
      if (subjectConditions.length > 0) {
        conditions.push(or(...subjectConditions));
      }
    }

    // Offline filter
    if (offlineOnly) {
      conditions.push(sql`${cacheManifest.epubBlobKey} IS NOT NULL`);
    }

    let whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Local mode: only return books that have local text present on disk.
    if (contentMode === 'local') {
      if (!localIds || localIds.length === 0) {
        return NextResponse.json({ count: 0, next: null, previous: null, results: [] });
      }
      whereClause = whereClause ? and(whereClause, inArray(books.id, localIds)) : inArray(books.id, localIds);
    }

    // Determine sort order
    let orderByClause;
    switch (sortBy) {
      case 'title':
        orderByClause = sql`${books.title} ASC`;
        break;
      case 'author':
        orderByClause = sql`${books.authors} ASC`;
        break;
      case 'length':
        orderByClause = sql`${estimates.minutes} ASC`;
        break;
      case 'popularity':
      default:
        orderByClause = sql`${books.downloadCount} DESC`;
        break;
    }

    // Fetch books from database with estimates
    const allBooks = await db
      .select({
        id: books.id,
        title: books.title,
        authors: books.authors,
        subjects: books.subjects,
        coverUrl: books.coverUrl,
        txtUrl: books.txtUrl,
        epubUrl: books.epubUrl,
        downloadCount: books.downloadCount,
        minutes: estimates.minutes,
        words: estimates.words,
        isCached: cacheManifest.epubBlobKey,
      })
      .from(books)
      .leftJoin(estimates, eq(books.id, estimates.bookId))
      .leftJoin(cacheManifest, eq(books.id, cacheManifest.bookId))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Count total for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(whereClause);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Apply duration filter after fetching (since it depends on estimates)
    let filteredBooks = allBooks;
    if (durations.length > 0) {
      filteredBooks = allBooks.filter(book => {
        if (!book.minutes) return false;
        const minutes = book.minutes;
        
        return durations.some(duration => {
          switch (duration) {
            case 'short':
              return minutes < 10;
            case 'medium':
              return minutes >= 10 && minutes <= 25;
            case 'long':
              return minutes > 25;
            default:
              return true;
          }
        });
      });
    }

    // Format response similar to Gutendex
    const results = filteredBooks.map((book) => ({
      id: book.id,
      title: book.title,
      authors: book.authors ?? 'Unknown',
      subjects: book.subjects ? JSON.parse(book.subjects) : [],
      coverUrl: book.coverUrl,
      txtUrl: book.txtUrl,
      epubUrl: book.epubUrl,
      downloadCount: book.downloadCount,
      minutes: book.minutes,
      words: book.words,
      isCached: !!book.isCached,
    })) as CatalogBookResult[];

    const localizedResults = await localizeCatalogResults(results, locale);

    return NextResponse.json({
      count: total,
      next: page < totalPages ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: localizedResults,
    });
  } catch (error) {
    console.error('Catalog API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}
