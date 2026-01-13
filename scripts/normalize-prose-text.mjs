import fs from 'node:fs/promises';
import path from 'node:path';

function usage() {
  console.log('Usage:');
  console.log('  node scripts/normalize-prose-text.mjs <file-or-directory>');
  console.log('');
  console.log('Normalizes Gutenberg-style hard wraps into single-line paragraphs.');
  console.log('If a directory is provided, processes all .txt files recursively (skips .bak-* backups).');
}

function isLikelyVerse(lines) {
  if (lines.length < 4) return false;
  const short = lines.filter((l) => l.trim().length > 0 && l.trim().length < 40).length;
  return short / lines.length >= 0.6;
}

function normalizeBlock(block) {
  const lines = block
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .filter((l) => l.trim().length > 0);

  if (lines.length <= 1) return lines[0] ?? '';
  if (isLikelyVerse(lines)) {
    // Preserve line breaks for verse/stagey formatting.
    return lines.join('\n');
  }

  // Join prose hard-wrap lines.
  return lines
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    usage();
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), fileArg);
  const stat = await fs.stat(inputPath);

  /** @type {string[]} */
  const targets = [];
  if (stat.isDirectory()) {
    const walk = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          await walk(p);
        } else if (e.isFile()) {
          if (!e.name.toLowerCase().endsWith('.txt')) continue;
          if (e.name.includes('.bak-')) continue;
          targets.push(p);
        }
      }
    };
    await walk(inputPath);
  } else {
    targets.push(inputPath);
  }

  let changed = 0;
  let skipped = 0;

  for (const filePath of targets) {
    const original = await fs.readFile(filePath, 'utf8');
    const text = original.replace(/\r\n/g, '\n');

    // Split into blocks separated by 2+ newlines.
    const blocks = text.split(/\n{2,}/);
    const normalizedBlocks = blocks.map(normalizeBlock);
    const normalized = normalizedBlocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

    if (normalized === original) {
      skipped++;
      continue;
    }

    const backupPath = filePath + `.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    await fs.copyFile(filePath, backupPath);
    await fs.writeFile(filePath, normalized, 'utf8');
    changed++;
  }

  console.log(`Processed: ${targets.length}`);
  console.log(`Updated:   ${changed}`);
  console.log(`Unchanged: ${skipped}`);
}

await main();
