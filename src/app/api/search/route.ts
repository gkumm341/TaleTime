import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseStoryJson, parseStoryPagesJson, storyBlocksToLegacyText, storyPagesToLegacyText } from '@/lib/story-blocks';
import {
  maybeTranslateManyTexts,
  maybeTranslateText,
  resolveRequestLocale,
  shouldTranslate,
} from '@/lib/server/translation';

export const runtime = 'nodejs';

interface BookMetadata {
  schemaVersion: number;
  generatedAt: string;
  book: {
    id: number | null;
    title: string;
    authors: string[];
    characters: string[];
    keywords: string[];
    description: string | null;
    languages: string[];
    subjects: string[];
    downloadCount: number | null;
    updatedAt: number | null;
    links: {
      txtUrl: string | null;
      epubUrl: string | null;
      coverUrl: string | null;
    };
    estimate: {
      minutes: number | null;
      words: number | null;
      wpm: number | null;
      source: string | null;
      computedAt: number | null;
    } | null;
    source: {
      kind: string;
      externalId: number | string | null;
    };
  };
  local: {
    layout: string;
    folderName: string;
    relativeDir: string;
    files: Array<{
      role: string;
      filename: string;
      bytes: number | null;
      sha256: string | null;
    }>;
  };
  custom?: Record<string, unknown>;
}

interface SearchResult {
  id: number | null;
  title: string;
  authors: string;
  characters: string[];
  keywords: string[];
  description: string | null;
  subjects: string[];
  coverUrl: string | null;
  minutes: number | null;
  words: number | null;
  folderName: string;
  matchedFields: string[];
  score: number;
}

function sanitizeNonLocalUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return null;
    }
  } catch {
    // Keep non-URL values unchanged.
  }

  return url;
}

function normalizeForSearch(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

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

function tokenize(input: string): string[] {
  return normalizeForSearch(input).split(' ').filter(Boolean);
}

function matchScore(query: string, target: string): number {
  const q = normalizeForSearch(query);
  const t = normalizeForSearch(target);
  
  if (!q || !t) return 0;
  
  // Exact match
  if (t === q) return 100;
  
  // Contains full query
  if (t.includes(q)) return 80;
  
  // Query contains target (for short keywords)
  if (q.includes(t) && t.length >= 3) return 60;
  
  // Token overlap
  const qTokens = tokenize(q);
  const tTokens = tokenize(t);
  
  let matchedTokens = 0;
  for (const qt of qTokens) {
    for (const tt of tTokens) {
      if (tt.includes(qt) || qt.includes(tt)) {
        matchedTokens++;
        break;
      }
    }
  }
  
  if (matchedTokens > 0) {
    return Math.min(50, (matchedTokens / qTokens.length) * 50);
  }
  
  return 0;
}

function searchMetadata(meta: BookMetadata, query: string): { score: number; matchedFields: string[] } {
  const matchedFields: string[] = [];
  let totalScore = 0;

  // Title (highest weight)
  const titleScore = matchScore(query, meta.book.title);
  if (titleScore > 0) {
    matchedFields.push('title');
    totalScore += titleScore * 2;
  }

  // Authors
  for (const author of meta.book.authors) {
    const authorScore = matchScore(query, author);
    if (authorScore > 0) {
      if (!matchedFields.includes('authors')) matchedFields.push('authors');
      totalScore += authorScore * 1.5;
    }
  }

  // Characters
  for (const character of meta.book.characters || []) {
    const charScore = matchScore(query, character);
    if (charScore > 0) {
      if (!matchedFields.includes('characters')) matchedFields.push('characters');
      totalScore += charScore * 1.5;
    }
  }

  // Keywords
  for (const keyword of meta.book.keywords || []) {
    const kwScore = matchScore(query, keyword);
    if (kwScore > 0) {
      if (!matchedFields.includes('keywords')) matchedFields.push('keywords');
      totalScore += kwScore * 1.2;
    }
  }

  // Description
  if (meta.book.description) {
    const descScore = matchScore(query, meta.book.description);
    if (descScore > 0) {
      matchedFields.push('description');
      totalScore += descScore;
    }
  }

  // Subjects
  for (const subject of meta.book.subjects || []) {
    const subjectScore = matchScore(query, subject);
    if (subjectScore > 0) {
      if (!matchedFields.includes('subjects')) matchedFields.push('subjects');
      totalScore += subjectScore;
    }
  }

  return { score: totalScore, matchedFields };
}

async function loadAllMetadata(): Promise<BookMetadata[]> {
  const baseDir = process.env.LOCAL_TEXT_DIR || '.data/texts';
  const byTitleDir = path.resolve(process.cwd(), baseDir, 'by-title');

  let entries: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    entries = await fs.readdir(byTitleDir, { withFileTypes: true }) as unknown as typeof entries;
  } catch {
    return [];
  }

  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !isHiddenLocalTitle(name));
  const results: BookMetadata[] = [];

  for (const folder of folders) {
    const metaPath = path.join(byTitleDir, folder, 'metadata.json');
    try {
      const raw = await fs.readFile(metaPath, 'utf8');
      const parsed = JSON.parse(raw) as BookMetadata;
      if (parsed && typeof parsed === 'object' && parsed.book) {
        results.push(parsed);
      }
    } catch {
      // Skip folders without valid metadata
    }
  }

  return results;
}

// Optional: search within text content
async function searchTextContent(folderName: string, query: string): Promise<boolean> {
  const baseDir = process.env.LOCAL_TEXT_DIR || '.data/texts';
  const folderPath = path.join(process.cwd(), baseDir, 'by-title', folderName);
  
  const textFiles = ['bedtime.pages.json', 'full.pages.json', 'bedtime.story.json', 'full.story.json', 'bedtime.txt', 'full.txt'];
  const normalizedQuery = normalizeForSearch(query);
  
  for (const file of textFiles) {
    try {
      const raw = await fs.readFile(path.join(folderPath, file), 'utf8');
      let content = raw;
      if (file.endsWith('.pages.json')) {
        content = storyPagesToLegacyText(parseStoryPagesJson(raw).doc.pages);
      } else if (file.endsWith('.story.json')) {
        content = storyBlocksToLegacyText(parseStoryJson(raw).doc.blocks);
      }
      const normalizedContent = normalizeForSearch(content);
      if (normalizedContent.includes(normalizedQuery)) {
        return true;
      }
    } catch {
      // File doesn't exist, continue
    }
  }
  
  return false;
}

export async function GET(req: NextRequest) {
  const locale = resolveRequestLocale(req);
  const query = req.nextUrl.searchParams.get('q')?.trim();
  const includeContent = req.nextUrl.searchParams.get('content') === 'true';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 });
  }

  try {
    const allMetadata = await loadAllMetadata();
    const results: SearchResult[] = [];

    for (const meta of allMetadata) {
      const { score, matchedFields } = searchMetadata(meta, query);
      
      let finalScore = score;
      const finalMatchedFields = [...matchedFields];

      // Optionally search text content
      if (includeContent && score === 0) {
        const contentMatch = await searchTextContent(meta.local.folderName, query);
        if (contentMatch) {
          finalScore = 10;
          finalMatchedFields.push('content');
        }
      }

      if (finalScore > 0) {
        results.push({
          id: meta.book.id,
          title: meta.book.title,
          authors: meta.book.authors.join('; ') || 'Unknown',
          characters: meta.book.characters || [],
          keywords: meta.book.keywords || [],
          description: meta.book.description,
          subjects: meta.book.subjects || [],
          coverUrl: sanitizeNonLocalUrl(meta.book.links.coverUrl),
          minutes: meta.book.estimate?.minutes ?? null,
          words: meta.book.estimate?.words ?? null,
          folderName: meta.local.folderName,
          matchedFields: finalMatchedFields,
          score: finalScore,
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    const sliced = results.slice(0, limit);

    if (shouldTranslate(locale) && sliced.length > 0) {
      const titles = await maybeTranslateManyTexts(
        sliced.map((r) => r.title),
        locale,
        'search-title'
      );

      const authors = await maybeTranslateManyTexts(
        sliced.map((r) => r.authors),
        locale,
        'search-authors'
      );

      const translated = await Promise.all(
        sliced.map(async (r, idx): Promise<SearchResult> => ({
          ...r,
          title: titles[idx] ?? r.title,
          authors: authors[idx] ?? r.authors,
          description:
            typeof r.description === 'string'
              ? await maybeTranslateText(r.description, locale, `search-description:${idx}`)
              : r.description,
          subjects: await maybeTranslateManyTexts(r.subjects, locale, `search-subjects:${idx}`),
        }))
      );

      return NextResponse.json({
        query,
        count: results.length,
        results: translated,
      });
    }

    return NextResponse.json({
      query,
      count: results.length,
      results: sliced,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
