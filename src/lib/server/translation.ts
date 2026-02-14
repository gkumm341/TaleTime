import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { DEFAULT_LOCALE, Locale, normalizeLocale } from '@/i18n/routing';
import type { StoryPageInput, StoryBlock } from '@/lib/story-blocks';



console.log('TRANSLATION PROVIDER:', resolveProvider());


const TRANSLATION_TIMEOUT_MS = 30_000;
const TRANSLATION_CACHE_VERSION = 'v1';
const inFlight = new Map<string, Promise<string>>();

type TranslationProvider = 'openai' | 'none';

function isPlaceholderOnlyText(input: string): boolean {
  const trimmed = input.trim();
  return /^\{\{[^{}]+\}\}$/.test(trimmed);
}

function getApiKey(): string | null {
  return process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_SECRET_KEY || null;
}

function getModel(): string {
  return process.env.OPENAI_TRANSLATION_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini';
}

function getLibreTranslateUrl(): string | null {
  const raw = process.env.LIBRETRANSLATE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

function getLibreTranslateApiKey(): string | null {
  const raw = process.env.LIBRETRANSLATE_API_KEY?.trim();
  return raw && raw.length > 0 ? raw : null;
}

function resolveProvider(): TranslationProvider {
  const explicit = (process.env.TRANSLATION_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'none') return 'none';
  if (explicit === 'openai') return getApiKey() ? 'openai' : 'none';

  // Auto mode: prefer local/self-hosted translator first, then OpenAI.
  if (getApiKey()) return 'openai';
  return 'none';
}

function localeToLanguageName(locale: Locale): string {
  switch (locale) {
    case 'es':
      return 'Spanish';
    case 'de':
      return 'German';
    case 'el':
      return 'Greek';
    case 'pt-BR':
      return 'Brazilian Portuguese';
    case 'en':
    default:
      return 'English';
  }
}

function localeToLanguageCode(locale: Locale): string {
  switch (locale) {
    case 'pt-BR':
      return 'pt';
    case 'en':
      return 'en';
    case 'es':
      return 'es';
    case 'de':
      return 'de';
    case 'el':
      return 'el';
    default:
      return 'en';
  }
}

function cacheRoot(): string {
  return path.resolve(process.cwd(), '.data', 'translations', TRANSLATION_CACHE_VERSION);
}

function cacheKey(locale: Locale, text: string, purpose: string): string {
  return createHash('sha256').update(`${locale}\n${purpose}\n${text}`).digest('hex');
}

async function readCache(locale: Locale, key: string): Promise<string | null> {
  const filePath = path.join(cacheRoot(), locale, `${key}.txt`);
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function writeCache(locale: Locale, key: string, value: string): Promise<void> {
  const dirPath = path.join(cacheRoot(), locale);
  const filePath = path.join(dirPath, `${key}.txt`);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, value, 'utf8');
}

async function callOpenAITranslate(text: string, locale: Locale, purpose: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return text;

  const languageName = localeToLanguageName(locale);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getModel(),
        temperature: 0.1,
messages: [
  {
    role: 'system',
    content:
      `You are a professional literary translator for children and families.
Translate the user text to ${languageName}.
Preserve meaning, tone, paragraph breaks, punctuation, and placeholders exactly.
Preserve all placeholders like {{image1.png}} exactly as-is.
Do not add commentary. Return strict JSON: {"translation":"..."}.
Purpose: ${purpose}`,
  },
  {
    role: 'user',
    content: text,
  },
],

        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    // if (!response.ok) {
    //   return text;
    // }
    if (!response.ok) {
  const errText = await response.text().catch(() => '');
  console.error('OpenAI translate failed:', response.status, errText);
  return text;
}


    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return text;

    try {
      const parsed = JSON.parse(content) as { translation?: unknown };
      if (typeof parsed.translation === 'string' && parsed.translation.trim().length > 0) {
        return parsed.translation;
      }
      return text;
    } catch {
      return text;
    }
  } catch {
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function callLibreTranslate(text: string, locale: Locale): Promise<string> {
  const baseUrl = getLibreTranslateUrl();
  if (!baseUrl) return text;

  const target = localeToLanguageCode(locale);
  const apiKey = getLibreTranslateApiKey();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);

  try {
    const payload: Record<string, string> = {
      q: text,
      source: 'en',
      target,
      format: 'text',
    };

    if (apiKey) payload.api_key = apiKey;

    const response = await fetch(`${baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) return text;

    const data = (await response.json()) as { translatedText?: unknown };
    if (typeof data.translatedText === 'string' && data.translatedText.trim().length > 0) {
      return data.translatedText;
    }

    return text;
  } catch {
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function translateViaProvider(text: string, locale: Locale, purpose: string): Promise<string> {
  const provider = resolveProvider();
  console.log('TRANSLATION PROVIDER:', provider); // keep for now

  if (provider === 'none') return text;
  return callOpenAITranslate(text, locale, purpose);
}


export function resolveRequestLocale(req: NextRequest, explicitLang?: string | null): Locale {
  const queryLang = explicitLang ?? req.nextUrl.searchParams.get('lang');
  const cookieLang = req.cookies.get('taletime-language')?.value;
  const headerLang = req.headers.get('x-locale') || req.headers.get('accept-language');

  return (
    normalizeLocale(queryLang) ||
    normalizeLocale(cookieLang) ||
    normalizeLocale(headerLang) ||
    DEFAULT_LOCALE
  );
}

export function shouldTranslate(locale: Locale): boolean {
  return locale !== 'en';
}

export async function maybeTranslateText(
  text: string,
  locale: Locale,
  purpose: string
): Promise<string> {
  if (!text || !text.trim()) return text;
  if (isPlaceholderOnlyText(text)) return text;
  if (!shouldTranslate(locale)) return text;

  const key = cacheKey(locale, text, purpose);
  const cached = await readCache(locale, key);
  if (cached != null) return cached;

  const inflightKey = `${locale}:${key}`;
  const existing = inFlight.get(inflightKey);
  if (existing) return existing;

  const promise = (async () => {
    const translated = await translateViaProvider(text, locale, purpose);
    if (translated !== text) {
      await writeCache(locale, key, translated).catch(() => undefined);
    }
    return translated;
  })();

  inFlight.set(inflightKey, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(inflightKey);
  }
}

export async function maybeTranslateManyTexts(
  texts: string[],
  locale: Locale,
  purpose: string
): Promise<string[]> {
  if (!shouldTranslate(locale)) return texts;
  return Promise.all(texts.map((text, index) => maybeTranslateText(text, locale, `${purpose}:${index}`)));
}

export async function maybeTranslatePages(
  pages: StoryPageInput[],
  locale: Locale,
  purpose: string
): Promise<StoryPageInput[]> {
  if (!shouldTranslate(locale)) return pages;

  const out: StoryPageInput[] = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const next: StoryPageInput = { ...page };

    if (typeof page.title === 'string' && page.title.trim().length > 0) {
      next.title = await maybeTranslateText(page.title, locale, `${purpose}:page-title:${i}`);
    }

    if (Array.isArray(page.paragraphs) && page.paragraphs.length > 0) {
      next.paragraphs = await maybeTranslateManyTexts(page.paragraphs, locale, `${purpose}:paragraphs:${i}`);
      next.text = next.paragraphs.join('\n\n');
    } else if (typeof page.text === 'string' && page.text.trim().length > 0) {
      next.text = await maybeTranslateText(page.text, locale, `${purpose}:page-text:${i}`);
    }

    out.push(next);
  }

  return out;
}

export async function maybeTranslateBlocks(
  blocks: StoryBlock[],
  locale: Locale,
  purpose: string
): Promise<StoryBlock[]> {
  if (!shouldTranslate(locale)) return blocks;

  const out: StoryBlock[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const next: StoryBlock = { ...block };
    if (typeof block.text === 'string' && block.text.trim().length > 0) {
      next.text = await maybeTranslateText(block.text, locale, `${purpose}:block:${i}`);
    }
    out.push(next);
  }

  return out;
}
