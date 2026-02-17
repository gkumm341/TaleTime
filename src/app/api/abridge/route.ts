import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getUserFromSessionId } from '@/lib/server/auth';
import { getPremiumEntitlementForUserId } from '@/lib/server/entitlements';
import { isPremiumActive } from '@/lib/entitlements';
import {
  parseStoryJson,
  parseStoryPagesJson,
  storyBlocksToLegacyText,
  storyPagesToLegacyText,
  type StoryBlock,
  type StoryPageInput,
} from '@/lib/story-blocks';
import {
  maybeTranslateBlocks,
  maybeTranslatePages,
  maybeTranslateText,
  resolveRequestLocale,
  shouldTranslate,
} from '@/lib/server/translation';
import { buildCloudTextUrl, getContentMode } from '@/lib/server/content-source';
import { getCloudBookId, loadCloudCatalogMetadata } from '@/lib/server/cloud-catalog';
import type { Locale } from '@/i18n/routing';

export const runtime = 'nodejs';

function shouldBypassPremiumPaywall(): boolean {
  // UX testing default: allow bedtime/timed access without auth/paywall.
  // Set ENFORCE_PREMIUM_GATE=1 (or ENFORCE_PREMIUM_IN_DEV=1 for legacy behavior)
  // to restore auth + premium checks.
  if (process.env.ENFORCE_PREMIUM_GATE === '1' || process.env.ENFORCE_PREMIUM_GATE === 'true') return false;
  if (process.env.ENFORCE_PREMIUM_IN_DEV === '1' || process.env.ENFORCE_PREMIUM_IN_DEV === 'true') return false;
  if (process.env.BYPASS_PREMIUM === '0' || process.env.BYPASS_PREMIUM === 'false') return false;
  return true;
}

type Mode = 'llm' | 'extractive' | 'local';

interface AbridgeRequest {
  bookId: number;
  minutes?: number;
  wpm?: number;
  lang?: string;
  variant?: 'full' | 'bedtime' | 'timed';
}

function resolveLocalTextCandidates(params: {
  bookId: number;
  minutes?: number;
  variant?: 'full' | 'timed';
}): { baseDir: string; candidates: string[] } {
  const baseDir = process.env.LOCAL_TEXT_DIR || '.data/texts';
  const bookDir = path.resolve(process.cwd(), baseDir, String(params.bookId));

  const candidates: string[] = [];

  if (params.variant === 'full') {
    candidates.push(path.join(bookDir, 'full.txt'));
  } else {
    const minutes = params.minutes;
    if (minutes && Number.isFinite(minutes) && minutes > 0) {
      candidates.push(path.join(bookDir, `${minutes}m.txt`));
    }
    // Fallback "bedtime" version for any timed selection.
    candidates.push(path.join(bookDir, 'bedtime.txt'));
    // And finally, if they only provided full.
    candidates.push(path.join(bookDir, 'full.txt'));
  }

  return { baseDir, candidates };
}

async function loadFirstExistingStoryFile(paths: string[]): Promise<
  | {
      filePath: string;
      text: string;
      blocks?: StoryBlock[];
      pages?: StoryPageInput[];
      sourceFormat: 'txt' | 'story-json' | 'story-pages';
    }
  | null
> {
  for (const p of paths) {
    try {
      const raw = await fs.readFile(p, 'utf8');

      const lower = p.toLowerCase();

      if (lower.endsWith('.pages.json')) {
        const parsed = parseStoryPagesJson(raw);
        const pages = parsed.doc.pages;
        const text = storyPagesToLegacyText(pages);
        return { filePath: p, text, pages, sourceFormat: 'story-pages' };
      }

      if (lower.endsWith('.story.json')) {
        const parsed = parseStoryJson(raw);
        const blocks = parsed.doc.blocks;
        const text = storyBlocksToLegacyText(blocks);
        return { filePath: p, text, blocks, sourceFormat: 'story-json' };
      }

      return { filePath: p, text: raw, sourceFormat: 'txt' };
    } catch {
      // ignore
    }
  }
  return null;
}

async function loadFirstExistingStoryUrl(urls: string[]): Promise<
  | {
      filePath: string;
      text: string;
      blocks?: StoryBlock[];
      pages?: StoryPageInput[];
      sourceFormat: 'txt' | 'story-json' | 'story-pages';
    }
  | null
> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const raw = await res.text();

      const lower = url.toLowerCase();

      if (lower.endsWith('.pages.json')) {
        const parsed = parseStoryPagesJson(raw);
        const pages = parsed.doc.pages;
        const text = storyPagesToLegacyText(pages);
        return { filePath: url, text, pages, sourceFormat: 'story-pages' };
      }

      if (lower.endsWith('.story.json')) {
        const parsed = parseStoryJson(raw);
        const blocks = parsed.doc.blocks;
        const text = storyBlocksToLegacyText(blocks);
        return { filePath: url, text, blocks, sourceFormat: 'story-json' };
      }

      return { filePath: url, text: raw, sourceFormat: 'txt' };
    } catch {
      // ignore
    }
  }
  return null;
}

function normalizeVariant(v: unknown): 'full' | 'bedtime' | 'timed' {
  if (v === 'full') return 'full';
  if (v === 'bedtime') return 'bedtime';
  if (v === 'timed') return 'timed';
  return 'bedtime';
}

function toSafeFilenameBase(input: string): string {
  // Keep filenames compatible across platforms (especially Windows).
  return input
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

async function findMatchingSubdir(params: {
  parentDir: string;
  titleCandidates: string[];
}): Promise<string | null> {
  let entries: Array<{ name: string; isDirectory: () => boolean }> = [];
  try {
    entries = (await fs.readdir(params.parentDir, { withFileTypes: true })) as unknown as typeof entries;
  } catch {
    return null;
  }

  const byKey = new Map<string, string>();
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const key = normalizeTitleKey(e.name);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, e.name);
  }

  for (const c of params.titleCandidates) {
    const key = normalizeTitleKey(c);
    const match = key ? byKey.get(key) : undefined;
    if (match) return match;
  }

  return null;
}

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const k = v.trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function parseAllowHosts(): RegExp[] {
  return (process.env.ALLOW_HOSTS || 'gutenberg.org,standardebooks.org')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => new RegExp(h.replace(/\./g, '\\.') + '$'));
}

function isAllowedHost(url: URL, allow: RegExp[]): boolean {
  return allow.some((re) => re.test(url.hostname));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function stripGutenbergBoilerplate(raw: string): string {
  const text = raw.replace(/\r\n/g, '\n');

  // Try START/END markers first
  const startMatch = text.match(/\*\*\*\s*START OF([\s\S]*?)\*\*\*/i);
  const endMatch = text.match(/\*\*\*\s*END OF([\s\S]*?)\*\*\*/i);

  let trimmed = text;
  if (startMatch?.index != null) {
    const afterStart = text.indexOf('\n', startMatch.index + startMatch[0].length);
    if (afterStart !== -1) trimmed = text.slice(afterStart + 1);
  }
  if (endMatch?.index != null) {
    trimmed = trimmed.slice(0, endMatch.index);
  }

  // Normalize spacing
  return trimmed
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function stripFrontMatter(text: string): string {
  // Remove common non-story markers while keeping structure.
  let t = text
    // Standalone bracketed stage directions/illustration lines.
    .replace(/^\s*\[(?:illustration|Illustrations?|frontispiece|plate)\b[^\]]*\]\s*$/gim, '')
    // Gutenberg/SE eBook header crumbs.
    .replace(/^\s*the millennium fulcrum edition\b.*$/gim, '')
    .replace(/^\s*produced by\b.*$/gim, '')
    .replace(/^\s*\*+\s*$/gm, '');

  // Prefer starting at the first actual chapter heading.
  const chapterHeading =
    /^(?:chapter)\s+(?:\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b[^\n]*$/im;
  const match = chapterHeading.exec(t);
  if (match?.index != null) {
    // Avoid cutting to something absurdly late if the pattern misfires.
    const idx = match.index;
    if (idx > 0 && idx < 200_000) {
      t = t.slice(idx);
    }
  }

  return t
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripEndBoilerplate(text: string): string {
  // Some sources don't include the standard "*** END OF" marker; try to detect
  // common license/boilerplate sections and truncate before them.
  const markers: RegExp[] = [
    /^\s*end of the project gutenberg ebook\b.*$/im,
    /^\s*start of (?:the )?project gutenberg(?:\s+license)?\b.*$/im,
    /^\s*start:\s*full license\b.*$/im,
    /^\s*the full project gutenberg license\b.*$/im,
    /^\s*this ebook is for the use of anyone anywhere\b.*$/im,
    /^\s*project gutenberg is a registered trademark\b.*$/im,
    /^\s*www\.gutenberg\.org\b.*$/im,

    // Fallback: catch trademark/license paragraphs even if wrapped mid-line.
    /project gutenberg/i,
    /gutenberg\s*[™\(]*/i,
    /trademark\s+license/i,
  ];

  let cutIndex: number | null = null;
  for (const re of markers) {
    const m = re.exec(text);
    if (m?.index != null) {
      // Only accept cuts in the latter half of the text to avoid accidental early truncation.
      if (m.index > Math.floor(text.length * 0.5)) {
        cutIndex = cutIndex == null ? m.index : Math.min(cutIndex, m.index);
      }
    }
  }

  const trimmed = cutIndex != null ? text.slice(0, cutIndex) : text;
  return trimmed.replace(/\n{3,}/g, '\n\n').trim();
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function buildTriWindowSample(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;

  // Sample from beginning, middle, and end so the model can see the full arc.
  const startChars = Math.floor(maxChars * 0.4);
  const midChars = Math.floor(maxChars * 0.2);
  const endChars = maxChars - startChars - midChars;

  const start = t.slice(0, startChars);

  const midCenter = Math.floor(t.length / 2);
  const midStart = Math.max(0, Math.min(t.length - midChars, midCenter - Math.floor(midChars / 2)));
  const middle = t.slice(midStart, midStart + midChars);

  const end = t.slice(Math.max(0, t.length - endChars));

  return (
    'BEGINNING EXCERPT:\n' +
    start.trim() +
    '\n\nMIDDLE EXCERPT:\n' +
    middle.trim() +
    '\n\nENDING EXCERPT:\n' +
    end.trim()
  );
}

function countWords(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

function extractiveAbridge(text: string, targetWords: number): string {
  const paragraphs = splitIntoParagraphs(text);
  if (paragraphs.length === 0) return '';

  // Very short budgets: just return the opening chunk.
  if (targetWords <= 250) {
    const out: string[] = [];
    let words = 0;
    for (const p of paragraphs) {
      const w = countWords(p);
      if (words + w > targetWords && out.length > 0) break;
      out.push(p);
      words += w;
      if (words >= targetWords) break;
    }
    return out.join('\n\n');
  }

  const n = paragraphs.length;

  // Segment boundaries for beginning/middle/end coverage.
  const startEnd = Math.min(n - 1, Math.max(10, Math.floor(n * 0.2)));
  const endStart = Math.max(startEnd + 1, Math.floor(n * 0.85));
  const midStart = Math.max(startEnd, Math.floor(n * 0.4));
  const midEnd = Math.min(endStart, Math.floor(n * 0.6));

  const stopWords = new Set([
    'the','a','an','and','or','but','if','then','else','when','while','of','to','in','on','for','with','as','at','by','from',
    'is','are','was','were','be','been','being','it','its','that','this','these','those','he','she','they','them','his','her','their',
    'i','you','we','my','your','our','me','him','hers','ours','yours','not','no','yes','do','did','done','so','very'
  ]);

  const seen = new Set<string>();
  const scored = paragraphs
    .map((p, idx) => {
      const words = (p.toLowerCase().match(/[a-z']+/g) || []).filter((w) => w.length > 2 && !stopWords.has(w));
      let novelty = 0;
      for (const w of words) {
        if (!seen.has(w)) novelty++;
      }
      const len = Math.min(280, countWords(p));
      const score = novelty * 2 + len / 10;
      for (const w of words.slice(0, 80)) seen.add(w);
      return { idx, p, score, words: countWords(p) };
    })
    .filter((x) => x.words >= 20)
    .sort((a, b) => b.score - a.score);

  const selectedIdx = new Set<number>();
  let wordsSoFar = 0;

  const tryAdd = (idx: number) => {
    if (idx < 0 || idx >= n) return;
    if (selectedIdx.has(idx)) return;
    const w = countWords(paragraphs[idx]);
    if (wordsSoFar + w > targetWords && selectedIdx.size > 0) return;
    selectedIdx.add(idx);
    wordsSoFar += w;
  };

  // Anchors: beginning, middle, end.
  const introCount = Math.min(5, n);
  for (let i = 0; i < introCount; i++) tryAdd(i);

  const midAnchor = Math.floor((midStart + midEnd) / 2);
  for (let i = -1; i <= 1; i++) tryAdd(midAnchor + i);

  const outroCount = Math.min(4, n);
  for (let i = n - outroCount; i < n; i++) tryAdd(i);

  // Allocate remaining budget across segments (approx 30/40/30).
  const remaining = Math.max(0, targetWords - wordsSoFar);
  const budgetStart = Math.floor(remaining * 0.3);
  const budgetMid = Math.floor(remaining * 0.4);
  const budgetEnd = remaining - budgetStart - budgetMid;

  const fillFromRange = (from: number, to: number, budget: number) => {
    let used = 0;
    for (const item of scored) {
      if (wordsSoFar >= targetWords) break;
      if (item.idx < from || item.idx >= to) continue;
      if (selectedIdx.has(item.idx)) continue;
      if (used + item.words > budget && used > 0) continue;
      tryAdd(item.idx);
      used += item.words;
      if (used >= budget) break;
    }
  };

  fillFromRange(0, startEnd, budgetStart);
  fillFromRange(midStart, Math.max(midStart + 1, midEnd), budgetMid);
  fillFromRange(endStart, n, budgetEnd);

  // If we still have room, top up globally by score.
  for (const item of scored) {
    if (wordsSoFar >= targetWords) break;
    if (selectedIdx.has(item.idx)) continue;
    tryAdd(item.idx);
  }

  const ordered = Array.from(selectedIdx)
    .sort((a, b) => a - b)
    .map((i) => paragraphs[i]);

  // Hard cap to targetWords while preserving order.
  const final: string[] = [];
  let finalWords = 0;
  for (const p of ordered) {
    const w = countWords(p);
    if (finalWords + w > targetWords && final.length > 0) break;
    final.push(p);
    finalWords += w;
    if (finalWords >= targetWords) break;
  }

  return final.join('\n\n');
}

type AbridgeResponsePayload = {
  bookId: number;
  minutes: number;
  wpm: number;
  title: string;
  author: string;
  content?: string;
  blocks?: StoryBlock[] | null;
  pages?: StoryPageInput[] | null;
  sourceFormat?: 'txt' | 'story-json' | 'story-pages';
  mode: Mode;
};

async function localizeAbridgePayload(
  payload: AbridgeResponsePayload,
  locale: Locale
): Promise<AbridgeResponsePayload> {
  if (!shouldTranslate(locale)) return payload;

  const title = await maybeTranslateText(payload.title, locale, `abridge-title:${payload.bookId}`);
  const author = await maybeTranslateText(payload.author, locale, `abridge-author:${payload.bookId}`);

  const content =
    typeof payload.content === 'string' && payload.content.trim().length > 0
      ? await maybeTranslateText(payload.content, locale, `abridge-content:${payload.bookId}`)
      : payload.content;

  const pages = Array.isArray(payload.pages)
    ? await maybeTranslatePages(payload.pages, locale, `abridge-pages:${payload.bookId}`)
    : payload.pages;

  const blocks = Array.isArray(payload.blocks)
    ? await maybeTranslateBlocks(payload.blocks, locale, `abridge-blocks:${payload.bookId}`)
    : payload.blocks;

  return {
    ...payload,
    title,
    author,
    content,
    pages,
    blocks,
  };
}

export async function POST(req: NextRequest) {
  try {
    let body: Partial<AbridgeRequest> = {};
    try {
      // Some clients may send an empty body; treat that as a 400 with a clear message.
      const raw = await req.text();
      if (raw.trim().length === 0) {
        return NextResponse.json({ error: 'Missing JSON body' }, { status: 400 });
      }
      body = JSON.parse(raw) as Partial<AbridgeRequest>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const bookId = Number(body.bookId);
    const locale = resolveRequestLocale(req, typeof body.lang === 'string' ? body.lang : null);
    const variant = normalizeVariant(body.variant);
    const minutesRaw = body.minutes == null ? undefined : Number(body.minutes);
    const minutes = minutesRaw == null || Number.isNaN(minutesRaw) ? undefined : clampInt(minutesRaw, 1, 240);
    const wpm = clampInt(Number(body.wpm ?? process.env.READ_ALOUD_WPM ?? 160), 80, 400);

    if (!bookId || Number.isNaN(bookId)) {
      return NextResponse.json({ error: 'Invalid bookId' }, { status: 400 });
    }
    if (variant === 'timed' && (!minutes || Number.isNaN(minutes))) {
      return NextResponse.json({ error: 'Invalid minutes' }, { status: 400 });
    }

    // Bedtime/timed variants are paid-only.
    // In development mode, bypass auth check to allow testing without login.
    if (variant !== 'full' && !shouldBypassPremiumPaywall()) {
      const sessionId = req.cookies.get('taletime_session')?.value;
      const user = await getUserFromSessionId(sessionId);
      if (!user) {
        return NextResponse.json(
          { error: 'Sign in required to view the bedtime version', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }
      const entitlement = await getPremiumEntitlementForUserId(user.id);
      if (!isPremiumActive(entitlement)) {
        return NextResponse.json(
          { error: 'Premium subscription required to view the bedtime version', code: 'PAYWALL' },
          { status: 402 }
        );
      }
    }

    const contentMode = getContentMode();

    let bookTitle = '';
    let bookAuthor = 'Unknown';
    let cloudFolderHint: string | null = null;

    if (contentMode === 'cloud') {
      const cloudMeta = await loadCloudCatalogMetadata();
      const cloudBook = cloudMeta.find((meta) => getCloudBookId(meta) === bookId);
      if (!cloudBook) {
        return NextResponse.json({ error: 'Book not found in cloud catalog' }, { status: 404 });
      }
      bookTitle = cloudBook.book.title;
      bookAuthor = (cloudBook.book.authors || []).join(', ') || 'Unknown';
      cloudFolderHint = cloudBook.local?.folderName?.trim() || null;
    } else {
      const book = await db.query.books.findFirst({ where: eq(books.id, bookId) });
      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }
      bookTitle = book.title;
      bookAuthor = book.authors || 'Unknown';
    }

    if (contentMode === 'local' || contentMode === 'cloud') {
      const baseDir = process.env.LOCAL_TEXT_DIR || '.data/texts';
      const rootDir = path.resolve(process.cwd(), baseDir);
      const bookDir = path.join(rootDir, String(bookId));

      const rawTitle = bookTitle;
      const titleCandidates = uniqueStrings([
        rawTitle,
        // Common case: DB title includes a parenthetical subtitle, but the file doesn't.
        rawTitle.replace(/\s*\([^)]*\)\s*$/, '').trim(),
        // Common case: DB title includes a bracketed subtitle, but the file doesn't.
        rawTitle.replace(/\s*\[[^\]]*\]\s*$/, '').trim(),
        // MARC-ish: "Title : $b [Subtitle]" → "Title"
        rawTitle.split(':')[0]?.trim() || rawTitle,
        rawTitle.replace(/\s*:\s*\$[a-z]\b\s*/gi, ' ').trim(),
        rawTitle.replace(/\$[a-z]\b/gi, ' ').trim(),
      ])
        .map((t) => t.replace(/\s*\[[^\]]*\]\s*$/, '').trim())
        .map(toSafeFilenameBase)
        .filter(Boolean);

      let expectedSources: string[] = [];
      let loaded:
        | {
            filePath: string;
            text: string;
            blocks?: StoryBlock[];
            pages?: StoryPageInput[];
            sourceFormat: 'txt' | 'story-json' | 'story-pages';
          }
        | null = null;

      if (contentMode === 'local') {
        const candidates: string[] = [];

        // Preferred layout: ${LOCAL_TEXT_DIR}/by-title/<Title>/bedtime.txt|full.txt
        const byTitleRoot = path.join(rootDir, 'by-title');
        const byTitleFolder = await findMatchingSubdir({ parentDir: byTitleRoot, titleCandidates });
        if (byTitleFolder) {
          const byTitleDir = path.join(byTitleRoot, byTitleFolder);
          if (variant === 'full') {
            candidates.push(path.join(byTitleDir, 'full.pages.json'));
            candidates.push(path.join(byTitleDir, 'full.story.json'));
            candidates.push(path.join(byTitleDir, 'full.txt'));
          } else {
            candidates.push(path.join(byTitleDir, 'bedtime.pages.json'));
            candidates.push(path.join(byTitleDir, 'bedtime.story.json'));
            candidates.push(path.join(byTitleDir, 'bedtime.txt'));
            candidates.push(path.join(byTitleDir, 'full.pages.json'));
            candidates.push(path.join(byTitleDir, 'full.story.json'));
            candidates.push(path.join(byTitleDir, 'full.txt'));
          }
        }

        if (variant === 'full' || variant === 'timed') {
          candidates.push(path.join(bookDir, 'full.pages.json'));
          candidates.push(path.join(bookDir, 'full.story.json'));
          candidates.push(path.join(bookDir, 'full.txt'));
        } else {
          candidates.push(path.join(bookDir, 'bedtime.pages.json'));
          candidates.push(path.join(bookDir, 'bedtime.story.json'));
          candidates.push(path.join(bookDir, 'bedtime.txt'));
          candidates.push(path.join(bookDir, 'full.pages.json'));
          candidates.push(path.join(bookDir, 'full.story.json'));
          candidates.push(path.join(bookDir, 'full.txt'));

          // Alternative layout: ${LOCAL_TEXT_DIR}/bookBedtime/<Title> (Bedtime).txt
          for (const t of titleCandidates) {
            candidates.push(path.join(rootDir, 'bookBedtime', `${t} (Bedtime).txt`));
            candidates.push(path.join(rootDir, 'bookBedtime', `${t}.txt`));
          }
        }

        expectedSources = candidates;
        loaded = await loadFirstExistingStoryFile(candidates);
      } else {
        const cloudCandidates: string[] = [];
        const byTitleCandidates = uniqueStrings([cloudFolderHint || '', rawTitle, ...titleCandidates]);

        const pushCloud = (segments: string[]) => {
          const url = buildCloudTextUrl(segments);
          if (url) cloudCandidates.push(url);
        };

        for (const folder of byTitleCandidates) {
          if (variant === 'full') {
            pushCloud(['by-title', folder, 'full.pages.json']);
            pushCloud(['by-title', folder, 'full.story.json']);
            pushCloud(['by-title', folder, 'full.txt']);
          } else {
            pushCloud(['by-title', folder, 'bedtime.pages.json']);
            pushCloud(['by-title', folder, 'bedtime.story.json']);
            pushCloud(['by-title', folder, 'bedtime.txt']);
            pushCloud(['by-title', folder, 'full.pages.json']);
            pushCloud(['by-title', folder, 'full.story.json']);
            pushCloud(['by-title', folder, 'full.txt']);
          }
        }

        if (variant === 'full' || variant === 'timed') {
          pushCloud([String(bookId), 'full.pages.json']);
          pushCloud([String(bookId), 'full.story.json']);
          pushCloud([String(bookId), 'full.txt']);
        } else {
          pushCloud([String(bookId), 'bedtime.pages.json']);
          pushCloud([String(bookId), 'bedtime.story.json']);
          pushCloud([String(bookId), 'bedtime.txt']);
          pushCloud([String(bookId), 'full.pages.json']);
          pushCloud([String(bookId), 'full.story.json']);
          pushCloud([String(bookId), 'full.txt']);

          for (const t of titleCandidates) {
            pushCloud(['bookBedtime', `${t} (Bedtime).txt`]);
            pushCloud(['bookBedtime', `${t}.txt`]);
          }
        }

        expectedSources = cloudCandidates;
        loaded = await loadFirstExistingStoryUrl(cloudCandidates);
      }

      if (!loaded) {
        return NextResponse.json(
          {
            error: contentMode === 'cloud' ? 'Missing cloud text file for this book' : 'Missing local text file for this book',
            expectedPaths: expectedSources,
          },
          { status: 400 }
        );
      }

      if (loaded.pages && loaded.pages.length > 0) {
        if (variant === 'full') {
          return NextResponse.json(await localizeAbridgePayload({
            bookId,
            minutes: 0,
            wpm,
            title: bookTitle,
            author: bookAuthor,
            pages: loaded.pages,
            content: '',
            blocks: null,
            sourceFormat: loaded.sourceFormat,
            mode: 'local' as Mode,
          }, locale));
        }

        if (variant === 'bedtime') {
          const bedtimeMinutes = 10;
          return NextResponse.json(await localizeAbridgePayload({
            bookId,
            minutes: bedtimeMinutes,
            wpm,
            title: bookTitle,
            author: bookAuthor,
            pages: loaded.pages,
            content: '',
            blocks: null,
            sourceFormat: loaded.sourceFormat,
            mode: 'local' as Mode,
          }, locale));
        }

        const effectiveMinutes = minutes ?? 10;
        return NextResponse.json(await localizeAbridgePayload({
          bookId,
          minutes: effectiveMinutes,
          wpm,
          title: bookTitle,
          author: bookAuthor,
          pages: loaded.pages,
          content: '',
          blocks: null,
          sourceFormat: loaded.sourceFormat,
          mode: 'local' as Mode,
        }, locale));
      }

      const raw = loaded.text.trim();
      const cleaned = stripEndBoilerplate(stripFrontMatter(stripGutenbergBoilerplate(raw)));

      if (variant === 'full') {
        return NextResponse.json(await localizeAbridgePayload({
          bookId,
          minutes: 0,
          wpm,
          title: bookTitle,
          author: bookAuthor,
          content: cleaned,
          blocks: loaded.blocks ?? null,
          sourceFormat: loaded.sourceFormat,
          mode: 'local' as Mode,
        }, locale));
      }

      if (variant === 'bedtime') {
        // Prefer a dedicated bedtime file; otherwise fall back to an extractive 10-minute version.
        const bedtimeMinutes = 10;
        const bedtimeTargetWords = bedtimeMinutes * wpm;
        const bedtimeContent = loaded.filePath.toLowerCase().endsWith('bedtime.txt') || loaded.filePath.toLowerCase().endsWith('bedtime.story.json')
          ? cleaned
          : extractiveAbridge(cleaned, bedtimeTargetWords);

        return NextResponse.json(await localizeAbridgePayload({
          bookId,
          minutes: bedtimeMinutes,
          wpm,
          title: bookTitle,
          author: bookAuthor,
          content: bedtimeContent,
          blocks: loaded.blocks ?? null,
          sourceFormat: loaded.sourceFormat,
          mode: ((loaded.filePath.toLowerCase().endsWith('bedtime.txt') || loaded.filePath.toLowerCase().endsWith('bedtime.story.json')) ? 'local' : 'extractive') as Mode,
        }, locale));
      }

      // timed
      const effectiveMinutes = minutes ?? 10;
      const targetWords = effectiveMinutes * wpm;
      const content = extractiveAbridge(cleaned, targetWords);
      return NextResponse.json(await localizeAbridgePayload({
        bookId,
        minutes: effectiveMinutes,
        wpm,
        title: bookTitle,
        author: bookAuthor,
        content,
        mode: 'extractive' as Mode,
      }, locale));
    }

    return NextResponse.json({ error: `Unsupported CONTENT_MODE: ${contentMode}` }, { status: 400 });
  } catch (error) {
    console.error('Abridge API error:', error);
    return NextResponse.json({ error: 'Failed to abridge book' }, { status: 500 });
  }
}
