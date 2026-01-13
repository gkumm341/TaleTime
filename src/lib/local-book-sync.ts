import { promises as fs } from 'node:fs';
import path from 'node:path';
import { db } from '@/db';
import { books } from '@/db/schema';
import { desc } from 'drizzle-orm';

function normalizeTitleKey(input: string): string {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

async function dirExists(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isFile();
  } catch {
    return false;
  }
}

export async function syncLocalByTitleToDb(): Promise<{ inserted: number; skipped: number }> {
  const baseDir = process.env.LOCAL_TEXT_DIR || '.data/texts';
  const byTitleDir = path.resolve(process.cwd(), baseDir, 'by-title');

  if (!(await dirExists(byTitleDir))) return { inserted: 0, skipped: 0 };

  const entries = await fs.readdir(byTitleDir, { withFileTypes: true });
  const titleFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  // Only consider folders that have at least full.txt or bedtime.txt
  const candidates: Array<{ title: string; key: string }> = [];
  for (const folderName of titleFolders) {
    const fullPath = path.join(byTitleDir, folderName, 'full.txt');
    const bedtimePath = path.join(byTitleDir, folderName, 'bedtime.txt');
    if (!(await fileExists(fullPath)) && !(await fileExists(bedtimePath))) continue;

    const title = folderName.trim();
    if (!title) continue;

    candidates.push({ title, key: normalizeTitleKey(title) });
  }

  if (candidates.length === 0) return { inserted: 0, skipped: 0 };

  // Build a map of existing titles -> id using a normalized key.
  const existing = await db
    .select({ id: books.id, title: books.title })
    .from(books);

  const existingByKey = new Map<string, number>();
  for (const r of existing) {
    const key = normalizeTitleKey(r.title ?? '');
    if (!key) continue;
    if (!existingByKey.has(key)) existingByKey.set(key, r.id);
  }

  // Next ID (keep >= 99000 to avoid clashes with Gutendex IDs)
  const maxRow = await db
    .select({ id: books.id })
    .from(books)
    .orderBy(desc(books.id))
    .limit(1);

  let nextId = Math.max(99000, (maxRow[0]?.id ?? 0) + 1);

  let inserted = 0;
  let skipped = 0;

  for (const c of candidates) {
    if (existingByKey.has(c.key)) {
      skipped++;
      continue;
    }

    // Insert minimal metadata; you can enrich later.
    await db.insert(books).values({
      id: nextId++,
      title: c.title,
      authors: 'Unknown',
      // Keep remote fields empty in local-only mode.
      txtUrl: null,
      epubUrl: null,
      coverUrl: null,
      subjects: JSON.stringify([]),
      languages: JSON.stringify(['en']),
      downloadCount: 0,
    });

    inserted++;
  }

  return { inserted, skipped };
}