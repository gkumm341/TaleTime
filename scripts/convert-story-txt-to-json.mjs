#!/usr/bin/env node
/**
 * Convert a legacy TaleTime local story .txt file into a structured blocks JSON file.
 *
 * Usage:
 *   node scripts/convert-story-txt-to-json.mjs \
 *     --in .data/texts/by-title/<Title>/bedtime.txt \
 *     --out .data/texts/by-title/<Title>/bedtime.story.json \
 *     --title "<Title>" --author "<Author>"
 */

import fs from 'node:fs/promises';
import path from 'node:path';

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, '\n');
}

function legacyTextToBlocks(text) {
  const normalized = normalizeNewlines(text);

  // Split into paragraphs on blank lines.
  const rawParagraphs = normalized
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  /** @type {Array<any>} */
  const blocks = [];

  for (const paragraph of rawParagraphs) {
    const imageOnly = paragraph.match(/^\{\{([^}]+)\}\}$/);
    if (imageOnly) {
      blocks.push({ type: 'image', src: imageOnly[1].trim() });
      continue;
    }

    // Best-effort: if there are multiple image placeholders on separate lines,
    // keep it as a paragraph. This avoids accidentally changing semantics.
    blocks.push({ type: 'paragraph', text: paragraph });
  }

  return blocks;
}

async function main() {
  const inputPath = getArgValue('--in') ?? getArgValue('-i');
  const outputPath = getArgValue('--out') ?? getArgValue('-o');
  const title = getArgValue('--title');
  const author = getArgValue('--author');

  if (!inputPath || !outputPath) {
    console.error('Missing required args: --in and --out');
    process.exitCode = 2;
    return;
  }

  const rawText = await fs.readFile(inputPath, 'utf8');
  const blocks = legacyTextToBlocks(rawText);

  const doc = {
    version: 1,
    ...(title ? { title } : {}),
    ...(author ? { author } : {}),
    blocks,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${outputPath} (${blocks.length} blocks)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
