// src/lib/story-blocks.ts
export type StoryBlock =
  | { type: 'paragraph'; text?: string; [key: string]: unknown }
  | { type: 'image'; src?: string; text?: string; [key: string]: unknown }
  | { type: 'heading' | 'hr' | 'list' | 'quote' | 'code' | 'divider'; text?: string; [key: string]: unknown }
  | { type: string; text?: string; src?: string; [key: string]: unknown };

export type StoryJsonDoc = {
  version?: number;
  title?: string;
  author?: string;
  blocks: StoryBlock[];
};

export type StoryPageInput = {
  id?: string;
  title?: string;
  image?: string;
  imageSrc?: string;
  text?: string;
  paragraphs?: string[];
};

export type StoryPagesDoc = {
  version?: number;
  title?: string;
  author?: string;
  pages: StoryPageInput[];
};

export function parseStoryJson(raw: string): { doc: StoryJsonDoc } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON: could not parse story-json');
  }

  if (!json || typeof json !== 'object') {
    throw new Error('Invalid story-json: not an object');
  }

  const root = json as Record<string, unknown>;
  const docCandidate =
    root.doc && typeof root.doc === 'object' && root.doc !== null ? (root.doc as Record<string, unknown>) : root;

  const blocksRaw = docCandidate.blocks;
  if (!Array.isArray(blocksRaw)) {
    throw new Error('Invalid story-json: missing "blocks" array (expected { blocks: [...] } or { doc: { blocks: [...] } })');
  }

  const blocks: StoryBlock[] = blocksRaw
    .map((b) => {
      if (!b || typeof b !== 'object') return null;
      const bb = b as Record<string, unknown>;
      const type = typeof bb.type === 'string' ? bb.type : null;
      if (!type) return null;

      const text = typeof bb.text === 'string' ? bb.text : undefined;
      const src = typeof bb.src === 'string' ? bb.src : undefined;

      return { type, ...(text !== undefined ? { text } : {}), ...(src !== undefined ? { src } : {}) } as StoryBlock;
    })
    .filter(Boolean) as StoryBlock[];

  return {
    doc: {
      version: typeof docCandidate.version === 'number' ? docCandidate.version : undefined,
      title: typeof docCandidate.title === 'string' ? docCandidate.title : undefined,
      author: typeof docCandidate.author === 'string' ? docCandidate.author : undefined,
      blocks,
    },
  };
}

export function parseStoryPagesJson(raw: string): { doc: StoryPagesDoc } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON: could not parse story-pages');
  }

  if (!json || typeof json !== 'object') {
    throw new Error('Invalid story-pages: not an object');
  }

  const root = json as Record<string, unknown>;
  const docCandidate =
    root.doc && typeof root.doc === 'object' && root.doc !== null ? (root.doc as Record<string, unknown>) : root;

  const pagesRaw = docCandidate.pages;
  if (!Array.isArray(pagesRaw)) {
    throw new Error('Invalid story-pages: missing "pages" array (expected { pages: [...] } or { doc: { pages: [...] } })');
  }

  const pages: StoryPageInput[] = pagesRaw
    .map((p) => {
      if (!p || typeof p !== 'object') return null;
      const pp = p as Record<string, unknown>;
      const id = typeof pp.id === 'string' ? pp.id : undefined;
      const title = typeof pp.title === 'string' ? pp.title : undefined;
      const image = typeof pp.image === 'string' ? pp.image : undefined;
      const imageSrc = typeof pp.imageSrc === 'string' ? pp.imageSrc : image;
      const text = typeof pp.text === 'string' ? pp.text : undefined;
      const paragraphs = Array.isArray(pp.paragraphs)
        ? (pp.paragraphs.filter((v) => typeof v === 'string') as string[])
        : undefined;

      const normalizedText = text ?? (paragraphs && paragraphs.length > 0 ? paragraphs.join('\n\n') : undefined);

      return {
        ...(id ? { id } : {}),
        ...(title ? { title } : {}),
        ...(imageSrc ? { imageSrc } : {}),
        ...(normalizedText ? { text: normalizedText } : {}),
        ...(paragraphs ? { paragraphs } : {}),
      } as StoryPageInput;
    })
    .filter(Boolean) as StoryPageInput[];

  return {
    doc: {
      version: typeof docCandidate.version === 'number' ? docCandidate.version : undefined,
      title: typeof docCandidate.title === 'string' ? docCandidate.title : undefined,
      author: typeof docCandidate.author === 'string' ? docCandidate.author : undefined,
      pages,
    },
  };
}

/**
 * Converts blocks to a legacy text format that your paginator already supports:
 * - paragraphs separated by blank lines
 * - images become their own line: {{image1.png}}
 *
 * This is important because your pagination + inline image renderer uses {{...}} tokens.
 */
export function storyBlocksToLegacyText(blocks: StoryBlock[]): string {
  const out: string[] = [];

  for (const b of blocks) {
    if (b.type === 'paragraph') {
      // Keep the author’s line breaks inside paragraphs.
      const text = (b.text ?? '').replace(/\r\n?/g, '\n');
      if (text.trim()) out.push(text);
      continue;
    }

    if (b.type === 'image') {
      // Use only the filename to match your Illustration folder lookups
      // (e.g. "image1.png" not "Illustrations/image1.png").
      const file = (b.src ?? '').split(/[/\\]/).pop()?.trim();
      if (file) out.push(`{{${file}}}`);
      continue;
    }
  }

  // Blank line between blocks for your current paragraph splitting logic.
  return out.join('\n\n').trim();
}

export function storyPagesToLegacyText(pages: StoryPageInput[]): string {
  const out: string[] = [];

  for (const p of pages) {
    const paragraphs = Array.isArray(p.paragraphs)
      ? p.paragraphs.filter((v) => typeof v === 'string')
      : undefined;
    const text = typeof p.text === 'string' ? p.text : undefined;
    const pageText = text ?? (paragraphs && paragraphs.length > 0 ? paragraphs.join('\n\n') : '');
    if (pageText.trim()) out.push(pageText.trim());
  }

  return out.join('\n\n').trim();
}
