import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getContentMode } from '@/lib/server/content-source';
import { getCloudBookId, loadCloudCatalogMetadata, type CloudBookMetadata } from '@/lib/server/cloud-catalog';
import {
  maybeTranslateManyTexts,
  resolveRequestLocale,
  shouldTranslate,
} from '@/lib/server/translation';

export const runtime = 'nodejs';

const DEFAULT_ITEMS_PER_PAGE = 100;
const MAX_ITEMS_PER_PAGE = 100;

interface BookMetadata {
  book: {
    id: number | null;
    title: string;
    authors: string[];
    languages: string[];
    subjects: string[];
    downloadCount: number | null;
    links: {
      txtUrl: string | null;
      epubUrl: string | null;
      coverUrl: string | null;
    };
    estimate: {
      minutes: number | null;
      words: number | null;
    } | null;
  };
  local?: {
    folderName?: string;
  };
}

type LocalBookResult = {
  id: number;
  title: string;
  localFolderName: string;
  authors: string;
  subjects: string[];
  coverUrl: string | null;
  txtUrl: string | null;
  epubUrl: string | null;
  downloadCount: number;
  minutes: number | null;
  words: number | null;
  isCached: boolean;
  languages: string[];
};

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

async function loadAllMetadata(): Promise<BookMetadata[]> {
  if (getContentMode() === 'cloud') {
    const cloudItems = await loadCloudCatalogMetadata();
    return cloudItems as BookMetadata[];
  }

  const baseDir = process.env.LOCAL_TEXT_DIR || '.data/texts';
  const byTitleDir = path.resolve(process.cwd(), baseDir, 'by-title');

  let entries: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    entries = (await fs.readdir(byTitleDir, { withFileTypes: true })) as unknown as typeof entries;
  } catch {
    return [];
  }

  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !isHiddenLocalTitle(name));

  const out: BookMetadata[] = [];
  for (const folder of folders) {
    const metadataPath = path.join(byTitleDir, folder, 'metadata.json');
    try {
      const raw = await fs.readFile(metadataPath, 'utf8');
      const parsed = JSON.parse(raw) as BookMetadata;
      if (parsed?.book?.title) out.push(parsed);
    } catch {
      // Skip folders without usable metadata.json
    }
  }

  return out;
}

async function localizeResults(results: LocalBookResult[], locale: ReturnType<typeof resolveRequestLocale>) {
  if (!shouldTranslate(locale) || results.length === 0) return results;

  const titles = await maybeTranslateManyTexts(
    results.map((r) => r.title),
    locale,
    'local-books-title'
  );

  const authors = await maybeTranslateManyTexts(
    results.map((r) => r.authors),
    locale,
    'local-books-authors'
  );

  const translatedSubjects = await Promise.all(
    results.map(async (r, idx) => maybeTranslateManyTexts(r.subjects, locale, `local-books-subjects:${idx}`))
  );

  return results.map((r, idx) => ({
    ...r,
    title: titles[idx] ?? r.title,
    authors: authors[idx] ?? r.authors,
    subjects: translatedSubjects[idx] ?? r.subjects,
  }));
}

export async function GET(req: NextRequest) {
  const locale = resolveRequestLocale(req);
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const sortBy = searchParams.get('sortBy') || 'popularity';
  const languages = searchParams.get('languages')?.split(',').filter(Boolean) || [];
  const durations = searchParams.get('durations')?.split(',').filter(Boolean) || [];
  const ageCategories = searchParams.get('ageCategories')?.split(',').filter(Boolean) || [];
  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(DEFAULT_ITEMS_PER_PAGE)),
    MAX_ITEMS_PER_PAGE
  );

  try {
    const allMetadata = await loadAllMetadata();

    if (getContentMode() === 'cloud' && allMetadata.length === 0) {
      return NextResponse.json(
        {
          error: 'Cloud catalog is empty or unavailable',
          hint: 'Upload .data/texts/by-title/catalog.json to CloudFront, or set CLOUDFRONT_CATALOG_URL.',
        },
        { status: 503 }
      );
    }

    const allBooks: LocalBookResult[] = allMetadata.map((meta) => {
      const title = meta.book.title;
      const id = getCloudBookId(meta as CloudBookMetadata);
      const localFolderName = meta.local?.folderName?.trim() || title;
      return {
        id,
        title,
        localFolderName,
        authors: meta.book.authors?.join(', ') || 'Unknown',
        subjects: meta.book.subjects || [],
        coverUrl: meta.book.links?.coverUrl ?? null,
        txtUrl: meta.book.links?.txtUrl ?? null,
        epubUrl: meta.book.links?.epubUrl ?? null,
        downloadCount: meta.book.downloadCount ?? 0,
        minutes: meta.book.estimate?.minutes ?? null,
        words: meta.book.estimate?.words ?? null,
        isCached: true,
        languages: meta.book.languages?.length ? meta.book.languages : ['en'],
      };
    });

    let filtered = allBooks;

    if (languages.length > 0) {
      const wanted = new Set(languages.map((l) => l.toLowerCase()));
      filtered = filtered.filter((book) => book.languages.some((l) => wanted.has(l.toLowerCase())));
    }

    if (ageCategories.length > 0) {
      const AGE_KEYWORDS: Record<string, string[]> = {
        'early-readers': ['Nursery rhymes', 'Picture books'],
        'beginning-readers': ['Fairy tales', 'Fables', "Children's stories", 'Juvenile fiction'],
        'middle-grade': ['Adventure', 'Fantasy', 'Bildungsromans', 'Pirates', 'Treasure'],
        'young-adult': ['Young adult', 'Romance', 'Psychological'],
      };

      const keywords = ageCategories.flatMap((category) => AGE_KEYWORDS[category] || []);
      if (keywords.length > 0) {
        filtered = filtered.filter((book) =>
          keywords.some((keyword) => book.subjects.some((subject) => subject.includes(keyword)))
        );
      }
    }

    if (durations.length > 0) {
      filtered = filtered.filter((book) => {
        if (!book.minutes) return false;
        return durations.some((duration) => {
          if (duration === 'short') return book.minutes! < 10;
          if (duration === 'medium') return book.minutes! >= 10 && book.minutes! <= 25;
          if (duration === 'long') return book.minutes! > 25;
          return true;
        });
      });
    }

    switch (sortBy) {
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'author':
        filtered.sort((a, b) => a.authors.localeCompare(b.authors));
        break;
      case 'length':
        filtered.sort((a, b) => (a.minutes ?? Number.MAX_SAFE_INTEGER) - (b.minutes ?? Number.MAX_SAFE_INTEGER));
        break;
      case 'popularity':
      default:
        filtered.sort((a, b) => (b.downloadCount ?? 0) - (a.downloadCount ?? 0));
        break;
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paged = filtered.slice(offset, offset + limit);
    const localizedResults = await localizeResults(paged, locale);

    return NextResponse.json({
      count: total,
      next: page < totalPages ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: localizedResults.map(({ languages: _languages, ...rest }) => rest),
    });
  } catch (error) {
    console.error('Local books API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch local books' },
      { status: 500 }
    );
  }
}
