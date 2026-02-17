import { NextRequest } from 'next/server';
import { createReadStream } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const BY_TITLE_DIR = join(process.cwd(), '.data', 'texts', 'by-title');

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function encodePathSegments(pathOrSegments: string | string[]): string {
  const raw = Array.isArray(pathOrSegments) ? pathOrSegments.join('/') : pathOrSegments;
  return raw
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function buildCloudDataUrl(pathOrSegments: string | string[]): string | null {
  const baseUrl = (process.env.CLOUDFRONT_BASE_URL || '').trim();
  if (!baseUrl) return null;

  const dataPrefix = trimSlashes(process.env.CLOUDFRONT_DATA_PREFIX || '');
  const encodedPath = encodePathSegments(pathOrSegments);
  const base = baseUrl.replace(/\/+$/, '');

  if (dataPrefix) {
    return `${base}/${dataPrefix}/${encodedPath}`;
  }

  return `${base}/${encodedPath}`;
}

function buildCloudTextUrl(pathOrSegments: string | string[]): string | null {
  const relative = Array.isArray(pathOrSegments)
    ? ['texts', ...pathOrSegments].join('/')
    : `texts/${pathOrSegments}`;
  return buildCloudDataUrl(relative);
}

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

function buildTitleFolderCandidates(rawTitle: string): string[] {
  const title = rawTitle.trim();
  if (!title) return [];

  const candidates = [
    title,
    title.replace(/'/g, '’'),
    title.replace(/’/g, "'"),
    title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    title.replace(/\s*\[[^\]]*\]\s*$/, '').trim(),
    title.split(':')[0]?.trim() || title,
  ].filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}

function buildCloudImageFilenameCandidates(folderName: string): string[] {
  const stems = [
    folderName,
    folderName.replace(/\s+/g, '_'),
    folderName.replace(/\s+/g, '-'),
    folderName.replace(/[’']/g, ''),
    folderName.replace(/[’']/g, '').replace(/\s+/g, '_'),
    folderName.replace(/[’']/g, '').replace(/\s+/g, '-'),
  ];

  const files = [
    ...stems.map((stem) => `${stem}.png`),
    ...stems.map((stem) => `${stem}.webp`),
    ...stems.map((stem) => `${stem}.jpg`),
    ...stems.map((stem) => `${stem}.jpeg`),
  ];

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const key = file.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(file);
  }
  return unique;
}

async function fetchCloudCoverImage(title: string): Promise<Response | null> {
  const folderCandidates = buildTitleFolderCandidates(title);
  if (folderCandidates.length === 0) return null;

  for (const folderName of folderCandidates) {
    const metadataUrl = buildCloudTextUrl(['by-title', folderName, 'metadata.json']);

    const imageNameCandidates: string[] = [];
    if (metadataUrl) {
      try {
        const metadataRes = await fetch(metadataUrl, { cache: 'no-store' });
        if (metadataRes.ok) {
          const metadata = await metadataRes.json().catch(() => null) as {
            local?: { files?: Array<{ role?: string; filename?: string }> };
          } | null;

          const files = metadata?.local?.files ?? [];
          for (const file of files) {
            if (!file?.filename) continue;
            if (file.role === 'image' || isSupportedImage(file.filename)) {
              imageNameCandidates.push(file.filename);
            }
          }
        }
      } catch {
      }
    }

    imageNameCandidates.push(...buildCloudImageFilenameCandidates(folderName));

    const seen = new Set<string>();
    for (const imageName of imageNameCandidates) {
      const key = imageName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const imageUrl = buildCloudTextUrl(['by-title', folderName, imageName]);
      if (!imageUrl) continue;

      try {
        const imageRes = await fetch(imageUrl, { cache: 'no-store' });
        if (!imageRes.ok || !imageRes.body) continue;

        return new Response(imageRes.body, {
          status: 200,
          headers: {
            'Content-Type': imageRes.headers.get('content-type') || guessContentType(imageName),
            'Cache-Control': 'no-store, max-age=0',
          },
        });
      } catch {
      }
    }
  }

  return null;
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
    const cloudCover = await fetchCloudCoverImage(title);
    if (cloudCover) return cloudCover;

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
    const cloudCover = await fetchCloudCoverImage(title);
    if (cloudCover) return cloudCover;

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
