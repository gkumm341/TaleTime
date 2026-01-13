import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

const ROOT = path.resolve(process.cwd(), '.data', 'texts');
const BEDTIME_DIR = path.join(ROOT, 'bookBedtime');
const FULL_DIR = path.join(ROOT, 'bookFull');
const DB_PATH = path.resolve(process.cwd(), '.data', 'app.db');

function toSafeFilenameBase(input) {
  return String(input)
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(input) {
  return String(input)
    .toLowerCase()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\$[a-z]\b/gi, ' ')
    .replace(/\s*:\s*\$[a-z]\b\s*/gi, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCandidatesFromDbTitle(rawTitle) {
  const t = String(rawTitle || '').trim();
  if (!t) return [];

  const base = t.split(':')[0]?.trim() || t;

  const candidates = [
    t,
    base,
    t.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    t.replace(/\s*\[[^\]]*\]\s*$/, '').trim(),
    t.replace(/\s*:\s*\$[a-z]\b\s*/gi, ' ').trim(),
    t.replace(/\$[a-z]\b/gi, ' ').trim(),
    t.replace(/\s*:\s*\$[a-z]\b[\s\S]*/i, '').trim(),
  ];

  // De-dupe preserving order
  const out = [];
  const seen = new Set();
  for (const c of candidates) {
    const v = c.trim();
    if (!v) continue;
    const k = normalizeKey(v);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function listTxtFiles(dir) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.txt'))
    .map((e) => path.join(dir, e.name));
}

function parseTitleFromFilename(filePath) {
  const base = path.basename(filePath, '.txt');
  return base.replace(/\s*\(Bedtime\)\s*$/i, '').trim();
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function copyWithBackup(src, dest) {
  await ensureDir(path.dirname(dest));
  const srcText = await fs.readFile(src, 'utf8');
  const srcHash = sha256(srcText);

  let destExists = false;
  let destHash = null;
  try {
    const destText = await fs.readFile(dest, 'utf8');
    destExists = true;
    destHash = sha256(destText);
  } catch {
    // no dest
  }

  if (destExists && destHash === srcHash) {
    return { action: 'skipped-identical' };
  }

  if (destExists) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = dest.replace(/\.txt$/i, '') + `.bak-${ts}.txt`;
    await fs.rename(dest, backup);
  }

  await fs.writeFile(dest, srcText, 'utf8');
  return { action: destExists ? 'replaced' : 'copied' };
}

function buildBookIndex() {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare('select id, title from books').all();
  db.close();

  /** @type {Map<string, Array<{id:number,title:string}>>} */
  const byKey = new Map();
  for (const r of rows) {
    const candidates = titleCandidatesFromDbTitle(r.title);
    for (const c of candidates) {
      const k = normalizeKey(c);
      if (!k) continue;
      const arr = byKey.get(k) || [];
      arr.push({ id: r.id, title: r.title });
      byKey.set(k, arr);
    }
  }
  return { rows, byKey };
}

function pickBestMatch(matches) {
  if (matches.length === 1) return { picked: matches[0], ambiguous: false };
  // Prefer smallest id as a deterministic tie-breaker
  const sorted = [...matches].sort((a, b) => a.id - b.id);
  return { picked: sorted[0], ambiguous: true };
}

async function main() {
  console.log(`Local texts root: ${ROOT}`);
  console.log(`DB: ${DB_PATH}`);

  const bedtimeFiles = await listTxtFiles(BEDTIME_DIR);
  const fullFiles = await listTxtFiles(FULL_DIR);

  console.log(`Found bedtime files: ${bedtimeFiles.length}`);
  console.log(`Found full files: ${fullFiles.length}`);

  const fullByKey = new Map();
  for (const f of fullFiles) {
    const t = parseTitleFromFilename(f);
    fullByKey.set(normalizeKey(t), f);
  }

  const { byKey } = buildBookIndex();

  const unmatched = [];
  const ambiguous = [];
  let copiedBedtime = 0;
  let copiedFull = 0;

  for (const bedtimePath of bedtimeFiles) {
    const bedtimeTitle = parseTitleFromFilename(bedtimePath);
    const key = normalizeKey(bedtimeTitle);

    const matches = byKey.get(key) || [];
    if (matches.length === 0) {
      unmatched.push({ title: bedtimeTitle, file: bedtimePath });
      continue;
    }

    const { picked, ambiguous: isAmb } = pickBestMatch(matches);
    if (isAmb) {
      ambiguous.push({ title: bedtimeTitle, matches });
    }

    const bookDir = path.join(ROOT, String(picked.id));
    const bedtimeDest = path.join(bookDir, 'bedtime.txt');
    const fullDest = path.join(bookDir, 'full.txt');

    const r1 = await copyWithBackup(bedtimePath, bedtimeDest);
    if (r1.action !== 'skipped-identical') copiedBedtime++;

    // If a matching full file exists, also copy it.
    const fullPath = fullByKey.get(key);
    if (fullPath) {
      const r2 = await copyWithBackup(fullPath, fullDest);
      if (r2.action !== 'skipped-identical') copiedFull++;
    }
  }

  console.log('---');
  console.log(`Bedtime copied/replaced: ${copiedBedtime}`);
  console.log(`Full copied/replaced: ${copiedFull}`);

  if (ambiguous.length) {
    console.log('---');
    console.log('Ambiguous matches (used smallest id):');
    for (const a of ambiguous) {
      console.log(`- ${a.title} -> ${a.matches.map((m) => `${m.id}:${toSafeFilenameBase(m.title)}`).join(', ')}`);
    }
  }

  if (unmatched.length) {
    console.log('---');
    console.log('Unmatched bedtime files:');
    for (const u of unmatched) {
      console.log(`- ${u.title} (${u.file})`);
    }
  }

  console.log('Done.');
}

await main();
