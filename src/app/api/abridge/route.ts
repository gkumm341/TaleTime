import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

type Mode = 'llm' | 'extractive' | 'local';

interface AbridgeRequest {
  bookId: number;
  minutes?: number;
  wpm?: number;
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

async function loadFirstExistingTextFile(paths: string[]): Promise<{ filePath: string; text: string } | null> {
  for (const p of paths) {
    try {
      const text = await fs.readFile(p, 'utf8');
      return { filePath: p, text };
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

async function llmAbridge(params: {
  title: string;
  author: string;
  text: string;
  targetMinutes: number;
  wpm: number;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  // Keep inputs bounded: use a trimmed window of the text.
  // (For public-domain novels, full text can be huge. Sample beginning/middle/end.)
  const maxChars = 120_000;
  const input = buildTriWindowSample(params.text, maxChars);

  const targetWords = params.targetMinutes * params.wpm;
  const targetChars = Math.max(2000, Math.round(targetWords * 6));

  const system =
    'You are an expert literary abridger. Produce an abridged version of the provided public-domain book text.\n' +
    '- Ignore/omit front matter such as title pages, tables of contents, and illustration captions.\n' +
    '- You will be given excerpts from the beginning, middle, and end. Use them to cover the full arc.\n' +
    '- Keep the plot coherent and chronological.\n' +
    '- Preserve the tone/voice; do not modernize language unless needed for clarity.\n' +
    '- Do not invent events or characters; only compress what is present.\n' +
    '- Keep key turning points and the ending.\n' +
    '- Output only the abridged narrative text (no headings, no bullet points).';

  const user =
    `Book: ${params.title}\nAuthor: ${params.author}\n` +
    `Target reading time: ~${params.targetMinutes} minutes at ${params.wpm} wpm (about ${targetWords} words).\n\n` +
    'Source text (possibly truncated):\n' +
    input;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: Math.min(4000, Math.round(targetChars / 4)),
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`LLM request failed: ${resp.status} ${errText}`);
  }

  const json = (await resp.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('LLM returned no content');
  }

  return content.trim();
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

    const book = await db.query.books.findFirst({ where: eq(books.id, bookId) });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    const contentMode = (process.env.CONTENT_MODE || 'remote').toLowerCase();

    // Local mode: read provided .txt files from disk and skip remote fetching entirely.
    if (contentMode === 'local') {
      const baseDir = process.env.LOCAL_TEXT_DIR || '.data/texts';
      const rootDir = path.resolve(process.cwd(), baseDir);
      const bookDir = path.join(rootDir, String(bookId));

      const rawTitle = book.title;
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

      const candidates: string[] = [];

      // Preferred layout: ${LOCAL_TEXT_DIR}/by-title/<Title>/bedtime.txt|full.txt
      const byTitleRoot = path.join(rootDir, 'by-title');
      const byTitleFolder = await findMatchingSubdir({ parentDir: byTitleRoot, titleCandidates });
      if (byTitleFolder) {
        const byTitleDir = path.join(byTitleRoot, byTitleFolder);
        if (variant === 'full') {
          candidates.push(path.join(byTitleDir, 'full.txt'));
        } else {
          candidates.push(path.join(byTitleDir, 'bedtime.txt'));
          candidates.push(path.join(byTitleDir, 'full.txt'));
        }
      }

      if (variant === 'full') {
        candidates.push(path.join(bookDir, 'full.txt'));
      } else {
        candidates.push(path.join(bookDir, 'bedtime.txt'));
        candidates.push(path.join(bookDir, 'full.txt'));

        // Alternative layout: ${LOCAL_TEXT_DIR}/bookBedtime/<Title> (Bedtime).txt
        for (const t of titleCandidates) {
          candidates.push(path.join(rootDir, 'bookBedtime', `${t} (Bedtime).txt`));
          candidates.push(path.join(rootDir, 'bookBedtime', `${t}.txt`));
        }
      }

      const loaded = await loadFirstExistingTextFile(candidates);
      if (!loaded) {
        return NextResponse.json(
          {
            error: 'Missing local text file for this book',
            expectedPaths: candidates,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        bookId,
        minutes: variant === 'full' ? 0 : (minutes ?? 0),
        wpm,
        title: book.title,
        author: book.authors || 'Unknown',
        content: loaded.text.trim(),
        mode: 'local' as Mode,
      });
    }

    // Remote mode (kept for later): fetch via txtUrl and abridge.
    if (!book.txtUrl) {
      return NextResponse.json({ error: 'No text URL available for this book' }, { status: 400 });
    }

    let url: URL;
    try {
      url = new URL(book.txtUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid txtUrl' }, { status: 400 });
    }

    const allow = parseAllowHosts();
    if (!isAllowedHost(url, allow)) {
      return NextResponse.json({ error: `Blocked host: ${url.hostname}` }, { status: 403 });
    }

    const upstream = await fetch(book.txtUrl, {
      signal: AbortSignal.timeout(30000),
      headers: {
        // Encourage plain text
        Accept: 'text/plain,*/*;q=0.8',
      },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream error', status: upstream.status }, { status: 502 });
    }

    const raw = await upstream.text();
    const cleaned = stripEndBoilerplate(stripFrontMatter(stripGutenbergBoilerplate(raw)));

    // Remote mode: if no minutes are provided (bedtime-only flow), use a conservative default.
    const effectiveMinutes = variant === 'timed' ? (minutes ?? 10) : variant === 'bedtime' ? 10 : 0;
    const targetWords = effectiveMinutes * wpm;

    let content: string;
    let mode: Mode = 'extractive';

    // Try LLM if configured; otherwise use extractive.
    if (process.env.OPENAI_API_KEY) {
      try {
        content = await llmAbridge({
          title: book.title,
          author: book.authors || 'Unknown',
          text: cleaned,
          targetMinutes: effectiveMinutes || 10,
          wpm,
        });
        mode = 'llm';
      } catch (e) {
        // Fall back to extractive if LLM fails
        content = extractiveAbridge(cleaned, targetWords);
        mode = 'extractive';
      }
    } else {
      content = extractiveAbridge(cleaned, targetWords);
      mode = 'extractive';
    }

    return NextResponse.json({
      bookId,
      minutes,
      wpm,
      title: book.title,
      author: book.authors || 'Unknown',
      content,
      mode,
    });
  } catch (error) {
    console.error('Abridge API error:', error);
    return NextResponse.json({ error: 'Failed to abridge book' }, { status: 500 });
  }
}
