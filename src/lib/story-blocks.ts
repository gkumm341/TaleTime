// src/lib/story-blocks.ts
export type StoryBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'image'; src: string };

export type StoryJsonDoc = {
  version?: number;
  title?: string;
  author?: string;
  blocks: StoryBlock[];
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

  const obj = json as Record<string, unknown>;
  const blocksRaw = obj.blocks;

  if (!Array.isArray(blocksRaw)) {
    throw new Error('Invalid story-json: missing "blocks" array');
  }

  const blocks: StoryBlock[] = blocksRaw
    .map((b) => {
      if (!b || typeof b !== 'object') return null;
      const bb = b as Record<string, unknown>;
      const type = bb.type;

      if (type === 'paragraph') {
        const text = typeof bb.text === 'string' ? bb.text : '';
        const t = text.trim();
        if (!t) return null;
        return { type: 'paragraph', text: text } as const;
      }

      if (type === 'image') {
        const src = typeof bb.src === 'string' ? bb.src : '';
        const s = src.trim();
        if (!s) return null;
        return { type: 'image', src: src } as const;
      }

      return null;
    })
    .filter(Boolean) as StoryBlock[];

  return {
    doc: {
      version: typeof obj.version === 'number' ? obj.version : undefined,
      title: typeof obj.title === 'string' ? obj.title : undefined,
      author: typeof obj.author === 'string' ? obj.author : undefined,
      blocks,
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
      const text = (b.text ?? '').replace(/\r\n?/g, '\n').trim();
      if (text) out.push(text);
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
