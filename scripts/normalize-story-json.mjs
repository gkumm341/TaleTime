#!/usr/bin/env node
/**
 * Normalize TaleTime story JSON files:
 * - Remove accidental trailing literal "\\n" at end-of-file
 * - Ensure valid JSON and rewrite with pretty formatting + final newline
 *
 * Usage:
 *   node scripts/normalize-story-json.mjs <file1> <file2> ...
 */

import fs from 'node:fs/promises';

function stripTrailingLiteralBackslashN(text) {
  // If the file ends with the literal characters "\n" (backslash + n), remove them.
  // This should only happen at EOF, outside the JSON payload.
  return text.replace(/\\n\s*$/u, '\n');
}

async function normalizeFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const fixed = stripTrailingLiteralBackslashN(raw);

  let doc;
  try {
    doc = JSON.parse(fixed);
  } catch (e) {
    throw new Error(`Invalid JSON after normalization for ${filePath}: ${String(e)}`);
  }

  await fs.writeFile(filePath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
}

async function main() {
  const files = process.argv.slice(2).filter(Boolean);
  if (files.length === 0) {
    console.error('Usage: node scripts/normalize-story-json.mjs <file1> <file2> ...');
    process.exitCode = 2;
    return;
  }

  for (const f of files) {
    try {
      await normalizeFile(f);
      console.log(`Normalized ${f}`);
    } catch (e) {
      console.error(String(e));
      process.exitCode = 1;
    }
  }
}

main();
