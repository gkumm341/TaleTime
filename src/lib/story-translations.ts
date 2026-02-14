// src/lib/story-translation.ts
import type { Locale } from '@/i18n/routing';
import type { StoryPageInput } from '@/lib/story-blocks';
import { maybeTranslateText } from '@/lib/server/translation';

function protectPlaceholders(input: string) {
  const placeholders: string[] = [];
  const protectedText = input.replace(/\{\{[^{}]+\}\}/g, (m) => {
    const idx = placeholders.push(m) - 1;
    return `__PH_${idx}__`;
  });
  return { protectedText, placeholders };
}

function restorePlaceholders(input: string, placeholders: string[]) {
  return input.replace(/__PH_(\d+)__/g, (_, n) => placeholders[Number(n)] ?? _);
}

async function translatePreservingPlaceholders(text: string, locale: Locale, purpose: string) {
  const { protectedText, placeholders } = protectPlaceholders(text);
  const translated = await maybeTranslateText(protectedText, locale, purpose);
  const restored = restorePlaceholders(translated, placeholders);

  // Guard: if anything went wrong and placeholders got lost, fall back.
  for (const ph of placeholders) {
    if (!restored.includes(ph)) return text;
  }
  return restored;
}

export type StoryJson = {
  version: number;
  title?: string;
  author?: string;
  pages: StoryPageInput[];
};

export async function translateStoryJson(story: StoryJson, locale: Locale, purpose: string) {
  if (locale === 'en') return story;

  const next: StoryJson = { ...story, pages: story.pages };

  if (story.title) {
    next.title = await translatePreservingPlaceholders(story.title, locale, `${purpose}:title`);
  }
  if (story.author) {
    next.author = await translatePreservingPlaceholders(story.author, locale, `${purpose}:author`);
  }

  // Translate pages, but make sure placeholders inside paragraphs are protected
  const pages = await Promise.all(
    story.pages.map(async (p, i) => {
      const out: StoryPageInput = { ...p };

      if (typeof p.title === 'string' && p.title.trim()) {
        out.title = await translatePreservingPlaceholders(p.title, locale, `${purpose}:page-title:${i}`);
      }

      if (Array.isArray(p.paragraphs) && p.paragraphs.length) {
        out.paragraphs = await Promise.all(
          p.paragraphs.map((t, j) =>
            translatePreservingPlaceholders(t, locale, `${purpose}:p:${i}:${j}`)
          )
        );
        out.text = out.paragraphs.join('\n\n');
      } else if (typeof p.text === 'string' && p.text.trim()) {
        // if it's a pure placeholder like {{image1.png}} your existing maybeTranslateText will skip anyway,
        // but this keeps it safe even if you change that later.
        out.text = await translatePreservingPlaceholders(p.text, locale, `${purpose}:page-text:${i}`);
      }

      return out;
    })
  );

  next.pages = pages;
  return next;
}
