import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createReadStream } from 'node:fs';
import Database from 'better-sqlite3';
import { getBookData, normalizeKey as normalizeKeyEnrich } from './book-enrichment-data.mjs';

const SCHEMA_VERSION = 1;

function normalizeTitleKey(input) {
  return String(input || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildTitleCandidates(rawTitle) {
  const t = String(rawTitle || '').trim();
  if (!t) return [];

  const candidates = [
    t,
    t.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    t.replace(/\s*\[[^\]]*\]\s*$/, '').trim(),
    t.split(':')[0]?.trim() || t,
    t.replace(/\s*:\s*\$[a-z]\b\s*/gi, ' ').trim(),
    t.replace(/\$[a-z]\b/gi, ' ').trim(),
  ]
    .map((x) => String(x || '').trim())
    .filter(Boolean);

  const out = [];
  const seen = new Set();
  for (const c of candidates) {
    const k = normalizeTitleKey(c);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function safeJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((x) => typeof x === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
    return [];
  } catch {
    return [];
  }
}

function parseAuthors(raw) {
  const s = String(raw || '').trim();
  if (!s) return [];
  // Heuristic: split on semicolons/newlines; keep commas intact (e.g. "Twain, Mark").
  const parts = s
    .split(/[;\n]+/g)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [s];
}

async function fileInfo(absPath) {
  try {
    const stat = await fs.stat(absPath);
    if (!stat.isFile()) return null;

    const hash = crypto.createHash('sha256');
    await new Promise((resolve, reject) => {
      const stream = createReadStream(absPath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('error', reject);
      stream.on('end', resolve);
    });

    return {
      bytes: stat.size,
      sha256: hash.digest('hex'),
    };
  } catch {
    return null;
  }
}

function isSupportedImage(filename) {
  const lower = filename.toLowerCase();
  return lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.jpg') || lower.endsWith('.jpeg');
}

async function readJsonIfExists(absPath) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function detectSourceKind(bookRow) {
  if (!bookRow) return { kind: 'unknown', externalId: null };
  const id = typeof bookRow.id === 'number' ? bookRow.id : null;
  // Convention: local-only inserts use ids >= 99000.
  if (id != null && id >= 99000) return { kind: 'local', externalId: null };
  // If it has Gutenberg-ish urls, treat as gutenberg.
  const txtUrl = bookRow.txtUrl || '';
  const epubUrl = bookRow.epubUrl || '';
  if (String(txtUrl).includes('gutenberg') || String(epubUrl).includes('gutenberg')) {
    return { kind: 'gutenberg', externalId: id };
  }
  // Fallback: if it looks like a Gutendex/Gutenberg numeric id.
  if (id != null && id > 0 && id < 99000) return { kind: 'gutenberg', externalId: id };
  return { kind: 'unknown', externalId: id };
}

async function main() {
  const baseDir = process.env.LOCAL_TEXT_DIR || '.data/texts';
  const byTitleDir = path.resolve(process.cwd(), baseDir, 'by-title');
  const dbPath = process.env.SQLITE_PATH || '.data/app.db';

  let entries;
  try {
    entries = await fs.readdir(byTitleDir, { withFileTypes: true });
  } catch (e) {
    console.error(`Failed to read by-title directory: ${byTitleDir}`);
    throw e;
  }

  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const db = new Database(path.resolve(process.cwd(), dbPath), { readonly: true });

  const bookRows = db
    .prepare(
      `select id, title, authors, languages, subjects, cover_url as coverUrl, txt_url as txtUrl, epub_url as epubUrl, download_count as downloadCount, updated_at as updatedAt
       from books`
    )
    .all();

  const estimateRows = db
    .prepare(
      `select book_id as bookId, minutes, words, wpm, source, computed_at as computedAt
       from estimates`
    )
    .all();

  db.close();

  const estimatesById = new Map();
  for (const r of estimateRows) {
    if (!r || typeof r.bookId !== 'number') continue;
    estimatesById.set(r.bookId, r);
  }

  // Map normalized title keys -> best matching book row (smallest id wins).
  const bookByKey = new Map();
  for (const r of bookRows) {
    const candidates = buildTitleCandidates(r.title);
    for (const c of candidates) {
      const k = normalizeTitleKey(c);
      if (!k) continue;
      const existing = bookByKey.get(k);
      if (!existing || (typeof r.id === 'number' && typeof existing.id === 'number' && r.id < existing.id)) {
        bookByKey.set(k, r);
      }
    }
  }

  let written = 0;
  let matched = 0;
  const missing = [];
  const catalogEntries = [];

  for (const folderName of folders) {
    const folderPath = path.join(byTitleDir, folderName);

    // Only create metadata if there is at least one text variant.
    const fullPath = path.join(folderPath, 'full.txt');
    const bedtimePath = path.join(folderPath, 'bedtime.txt');

    const hasFull = await fs
      .stat(fullPath)
      .then((s) => s.isFile())
      .catch(() => false);
    const hasBedtime = await fs
      .stat(bedtimePath)
      .then((s) => s.isFile())
      .catch(() => false);

    if (!hasFull && !hasBedtime) continue;

    const folderKey = normalizeTitleKey(folderName);
    const bookRow = bookByKey.get(folderKey) || null;
    if (bookRow) matched++;
    else missing.push(folderName);

    const existingMetaPath = path.join(folderPath, 'metadata.json');
    const existingMeta = await readJsonIfExists(existingMetaPath);
    const preservedCustom = existingMeta && typeof existingMeta.custom === 'object' ? existingMeta.custom : undefined;

    let fileNames = [];
    try {
      fileNames = (await fs.readdir(folderPath, { withFileTypes: true }))
        .filter((e) => e.isFile())
        .map((e) => e.name);
    } catch {
      fileNames = [];
    }

    const files = [];

    if (hasFull) {
      const info = await fileInfo(fullPath);
      files.push({ role: 'full', filename: 'full.txt', bytes: info?.bytes ?? null, sha256: info?.sha256 ?? null });
    }

    if (hasBedtime) {
      const info = await fileInfo(bedtimePath);
      files.push({ role: 'bedtime', filename: 'bedtime.txt', bytes: info?.bytes ?? null, sha256: info?.sha256 ?? null });
    }

    for (const name of fileNames) {
      const lower = name.toLowerCase();
      if (lower === 'full.txt' || lower === 'bedtime.txt' || lower === 'metadata.json') continue;

      let role = 'other';
      if (lower.endsWith('.mp3')) role = 'audio';
      else if (isSupportedImage(lower)) role = 'image';

      const abs = path.join(folderPath, name);
      const info = await fileInfo(abs);
      files.push({ role, filename: name, bytes: info?.bytes ?? null, sha256: info?.sha256 ?? null });
    }

    const estimate = bookRow && typeof bookRow.id === 'number' ? estimatesById.get(bookRow.id) : null;

    // Get enrichment data (characters, keywords, description)
    const enrichment = getBookData(folderName);

    const meta = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      book: {
        id: bookRow ? bookRow.id : null,
        title: bookRow?.title || folderName,
        authors: parseAuthors(bookRow?.authors),
        characters: enrichment?.characters ?? [],
        keywords: enrichment?.keywords ?? [],
        description: enrichment?.description ?? null,
        languages: safeJsonArray(bookRow?.languages),
        subjects: safeJsonArray(bookRow?.subjects),
        downloadCount: typeof bookRow?.downloadCount === 'number' ? bookRow.downloadCount : null,
        updatedAt: typeof bookRow?.updatedAt === 'number' ? bookRow.updatedAt : null,
        links: {
          txtUrl: bookRow?.txtUrl ?? null,
          epubUrl: bookRow?.epubUrl ?? null,
          coverUrl: bookRow?.coverUrl ?? null,
        },
        estimate: estimate
          ? {
              minutes: typeof estimate.minutes === 'number' ? estimate.minutes : null,
              words: typeof estimate.words === 'number' ? estimate.words : null,
              wpm: typeof estimate.wpm === 'number' ? estimate.wpm : null,
              source: typeof estimate.source === 'string' ? estimate.source : null,
              computedAt: typeof estimate.computedAt === 'number' ? estimate.computedAt : null,
            }
          : null,
        source: detectSourceKind(bookRow),
      },
      local: {
        layout: 'by-title',
        folderName,
        relativeDir: path.posix.join('.data', 'texts', 'by-title', folderName),
        files,
      },
      ...(preservedCustom ? { custom: preservedCustom } : {}),
    };

    await fs.writeFile(existingMetaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
    catalogEntries.push(meta);
    written++;
  }

  const catalogPath = path.join(byTitleDir, 'catalog.json');
  const catalogDoc = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    books: catalogEntries,
  };
  await fs.writeFile(catalogPath, JSON.stringify(catalogDoc, null, 2) + '\n', 'utf8');

  console.log(`Wrote metadata.json for ${written} folder(s).`);
  console.log(`Wrote catalog file: ${catalogPath}`);
  console.log(`Matched to DB rows: ${matched}`);
  if (missing.length) {
    console.log('Folders with no DB match (still wrote metadata using folder name):');
    for (const m of missing) console.log(`- ${m}`);
  }
}

await main();
