import { NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveRequestLocale } from '@/lib/server/translation';
import { translateStoryJson } from '@/lib/story-translations';
import { maybeTranslateText } from '@/lib/server/translation';
import { buildCloudTextUrl, getContentMode, getLocalTextDir } from '@/lib/server/content-source';


function sanitizeTitleToFolder(title: string) {
  // Your folders are literally the title (e.g. "The Jungle Book")
  // Prevent path traversal:
  if (!title || title.includes('..') || title.includes('/') || title.includes('\\')) return null;
  return title;
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title') || '';
  const variant = (req.nextUrl.searchParams.get('variant') || 'bedtime').toLowerCase();
  const safeVariant = variant === 'full' ? 'full' : 'bedtime';

  const folder = sanitizeTitleToFolder(title);
  if (!folder) return Response.json({ error: 'Invalid title' }, { status: 400 });

  const baseDir = getLocalTextDir();
  const filePath = path.resolve(process.cwd(), baseDir, 'by-title', folder, `${safeVariant}.pages.json`);

  let raw: string;
  if (getContentMode() === 'cloud') {
    const url = buildCloudTextUrl(['by-title', folder, `${safeVariant}.pages.json`]);
    if (!url) return Response.json({ error: 'Missing CLOUDFRONT_BASE_URL for cloud mode' }, { status: 500 });

    try {
      const upstream = await fetch(url, { cache: 'no-store' });
      if (!upstream.ok) {
        return Response.json({ error: 'Story not found' }, { status: 404 });
      }
      raw = await upstream.text();
    } catch {
      return Response.json({ error: 'Story not found' }, { status: 404 });
    }
  } else {
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch {
      return Response.json({ error: 'Story not found' }, { status: 404 });
    }
  }

  let story: any;
  try {
    story = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Invalid story JSON' }, { status: 500 });
  }

const locale = resolveRequestLocale(req, req.nextUrl.searchParams.get('lang'));
  const translated = await translateStoryJson(story, locale, `story-pages:${folder}:${safeVariant}`);

  return Response.json(translated);
}
