import { NextRequest } from 'next/server';
import { createReadStream } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const BY_TITLE_DIR = join(process.cwd(), '.data', 'texts', 'by-title');

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createFallbackCoverSvg(title: string): string {
  const trimmed = title.trim();
  const safeTitle = escapeXml(trimmed || 'Story');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" role="img" aria-label="${safeTitle} cover placeholder">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e2a47"/>
      <stop offset="100%" stop-color="#344f84"/>
    </linearGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <rect x="34" y="34" width="532" height="832" rx="24" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
  <text x="300" y="220" text-anchor="middle" fill="rgba(255,255,255,0.78)" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="34" font-weight="600">TaleTime</text>
  <foreignObject x="70" y="280" width="460" height="430">
    <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;height:100%;text-align:center;color:#fff;font-size:42px;line-height:1.2;font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;font-weight:700;word-break:break-word;">
      ${safeTitle}
    </div>
  </foreignObject>
</svg>`;
}

function normalizeKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    // normalize common punctuation variants
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    // collapse non-alphanumerics to spaces
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessContentType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function isSupportedImage(filename: string) {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg')
  );
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title');
  if (!title) {
    return new Response('Missing title', { status: 400 });
  }

  const fallbackSvg = createFallbackCoverSvg(title);

  const requestedKey = normalizeKey(title);

  let matchedFolderName: string | null = null;
  try {
    const entries = readdirSync(BY_TITLE_DIR, { withFileTypes: true });
    const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    const exact = folders.find((f) => normalizeKey(f) === requestedKey);
    matchedFolderName = exact ?? null;

    // Fallback: pick best partial match
    if (!matchedFolderName) {
      matchedFolderName =
        folders.find((f) => normalizeKey(f).includes(requestedKey)) ??
        folders.find((f) => requestedKey.includes(normalizeKey(f))) ??
        null;
    }
  } catch {
    matchedFolderName = null;
  }

  if (!matchedFolderName) {
    return new Response(fallbackSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  const folderPath = join(BY_TITLE_DIR, matchedFolderName);

  let imageName: string | null = null;
  try {
    const files = readdirSync(folderPath, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);

    const preferred = files.find(
      (f) => isSupportedImage(f) && normalizeKey(f.replace(/\.[^.]+$/, '')) === requestedKey
    );
    imageName =
      preferred ??
      files.find((f) => f.toLowerCase().endsWith('.png')) ??
      files.find((f) => f.toLowerCase().endsWith('.webp')) ??
      files.find((f) => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg')) ??
      null;
  } catch {
    imageName = null;
  }

  if (!imageName) {
    return new Response(fallbackSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  const absPath = join(folderPath, imageName);
  const stream = createReadStream(absPath);
  return new Response(stream as any, {
    status: 200,
    headers: {
      'Content-Type': guessContentType(imageName),
      // Keep this uncached so newly dropped-in files show up immediately.
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
