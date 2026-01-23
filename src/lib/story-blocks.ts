export type StoryBlock =
  | {
      type: 'paragraph';
      text: string;
    }
  | {
      type: 'image';
      /** Relative filename like "1.png" that will be resolved by the illustration API. */
      src: string;
      alt?: string;
    }
  | {
      type: 'sceneBreak';
    }
  | {
      type: 'heading';
      text: string;
      level?: 1 | 2 | 3;
    };

export type StoryDocumentV1 = {
  version: 1;
  title?: string;
  author?: string;
  blocks: StoryBlock[];
};

export type StoryParseResult = {
  doc: StoryDocumentV1;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
}

function ensureString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function coerceBlocks(input: unknown): StoryBlock[] | null {
  if (!Array.isArray(input)) return null;

  const blocks: StoryBlock[] = [];
  for (const item of input) {
    if (!isRecord(item)) return null;
    const type = ensureString(item.type);
    if (!type) return null;

    if (type === 'paragraph') {
      const text = ensureString(item.text);
      if (!text) return null;
      blocks.push({ type: 'paragraph', text: normalizeWhitespace(text).trim() });
      continue;
    }

    if (type === 'image') {
      const src = ensureString(item.src);
      if (!src) return null;
      const alt = ensureString(item.alt) ?? undefined;
      blocks.push({ type: 'image', src: src.trim(), ...(alt ? { alt } : {}) });
      continue;
    }

    if (type === 'sceneBreak') {
      blocks.push({ type: 'sceneBreak' });
      continue;
    }

    if (type === 'heading') {
      const text = ensureString(item.text);
      if (!text) return null;
      const levelRaw = item.level;
      const level =
        levelRaw === 1 || levelRaw === 2 || levelRaw === 3
          ? (levelRaw as 1 | 2 | 3)
          : undefined;
      blocks.push({ type: 'heading', text: normalizeWhitespace(text).trim(), ...(level ? { level } : {}) });
      continue;
    }

    return null;
  }

  return blocks;
}

/**
 * Parses a TaleTime story JSON file.
 *
 * Accepted shapes:
 * - { "version": 1, "blocks": [...] }
 * - [ ...blocks ] (treated as version 1)
 */
export function parseStoryJson(rawJson: string): StoryParseResult {
  const parsed = JSON.parse(rawJson) as unknown;

  // Array-only shorthand
  if (Array.isArray(parsed)) {
    const blocks = coerceBlocks(parsed);
    if (!blocks) throw new Error('Invalid story blocks array');
    return { doc: { version: 1, blocks } };
  }

  if (!isRecord(parsed)) throw new Error('Invalid story JSON');

  const version = parsed.version;
  if (version !== 1) throw new Error('Unsupported story version');

  const blocks = coerceBlocks(parsed.blocks);
  if (!blocks) throw new Error('Invalid story blocks');

  const title = ensureString(parsed.title) ?? undefined;
  const author = ensureString(parsed.author) ?? undefined;

  return { doc: { version: 1, ...(title ? { title } : {}), ...(author ? { author } : {}), blocks } };
}

/**
 * Converts blocks into the existing "content" string format.
 *
 * - paragraphs -> text
 * - image -> {{<filename>}}
 * - sceneBreak -> blank line
 * - heading -> its own paragraph
 */
export function storyBlocksToLegacyText(blocks: StoryBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === 'paragraph') {
      const t = normalizeWhitespace(b.text).trim();
      if (t) out.push(t);
      continue;
    }

    if (b.type === 'image') {
      const src = b.src.trim();
      if (src) out.push(`{{${src}}}`);
      continue;
    }

    if (b.type === 'sceneBreak') {
      // Use a blank paragraph break.
      out.push('');
      continue;
    }

    if (b.type === 'heading') {
      const t = normalizeWhitespace(b.text).trim();
      if (t) out.push(t);
      continue;
    }
  }

  // Use double newlines between blocks. Keep it tidy.
  return out
    .map((s) => s.trimEnd())
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Best-effort conversion from current .txt format into blocks.
 *
 * - Paragraphs split on blank lines.
 * - A paragraph that is exactly a single {{...}} placeholder becomes an image block.
 */
export function legacyTextToStoryBlocks(text: string): StoryBlock[] {
  const cleaned = normalizeWhitespace(text);
  const paras = cleaned
    .split(/\n\s*\n+/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: StoryBlock[] = [];
  for (const p of paras) {
    const m = p.match(/^\{\{([^{}]+)\}\}$/);
    if (m?.[1]) {
      const src = m[1].trim();
      if (src) {
        blocks.push({ type: 'image', src });
        continue;
      }
    }

    blocks.push({ type: 'paragraph', text: p });
  }

  return blocks;
}
