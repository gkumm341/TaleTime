import { NextRequest } from 'next/server';
import { createReadStream, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { buildCloudTextUrl, getContentMode } from '@/lib/server/content-source';

export const runtime = 'nodejs';

const BY_TITLE_DIR = join(process.cwd(), '.data', 'texts', 'by-title');

// 1x1 transparent PNG for fallback
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X9m7QAAAAASUVORK5CYII=',
  'base64'
);

function normalizeKey(input: string) {
  return input
    .normalize('NFKD')
    .trim()
    .toLowerCase()
    // Treat curly quotes/apostrophes as plain apostrophes.
    .replace(/[’'`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessContentType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.ogg')) return 'video/ogg';
  return 'application/octet-stream';
}

function isVideoFile(filename: string) {
  const lower = filename.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg');
}

function findIllustrationsFolder(bookFolderPath: string): string | null {
  try {
    const entries = readdirSync(bookFolderPath, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const candidates = ['illustrations', 'illustration', 'images', 'imgs'];
    for (const d of dirs) {
      const lower = d.toLowerCase();
      if (candidates.includes(lower)) return d;
    }
  } catch {
    // ignore
  }
  return null;
}

function devLogMissingImage(message: string, details: Record<string, string | undefined>) {
  if (process.env.NODE_ENV === 'production') return;
  console.log(`[illustration] ${message}`, details);
}

type CloudMetadata = {
  local?: {
    folderName?: string;
  };
};

function redirectTo(url: string, status = 307) {
  return new Response(null, {
    status,
    headers: {
      Location: url,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const trimmed = v.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function resolveFolderCandidates(title: string): string[] {
  return uniqueStrings([
    title,
    title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    title.replace(/\s*\[[^\]]*\]\s*$/, '').trim(),
    title.split(':')[0]?.trim() || title,
  ]);
}

async function fetchCloudMetadataForFolder(folderName: string): Promise<CloudMetadata | null> {
  const url = buildCloudTextUrl(['by-title', folderName, 'metadata.json']);
  if (!url) return null;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as CloudMetadata;
  } catch {
    return null;
  }
}

async function resolveCloudFolder(title: string): Promise<string | null> {
  const candidates = resolveFolderCandidates(title);
  for (const candidate of candidates) {
    const metadata = await fetchCloudMetadataForFolder(candidate);
    if (!metadata) continue;
    return metadata.local?.folderName?.trim() || candidate;
  }
  return null;
}

async function cloudFileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * GET /api/illustration?title=BookTitle&image=1.png
 * Serves an illustration from the book's Illustrations folder.
 */
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title');
  const image = req.nextUrl.searchParams.get('image');

  if (!title || !image) {
    return new Response('Missing title or image parameter', { status: 400 });
  }

  // Sanitize image filename to prevent path traversal
  const safeImage = image.replace(/[/\\]/g, '').replace(/\.\./g, '');
  if (!safeImage) {
    return new Response('Invalid image parameter', { status: 400 });
  }

  if (getContentMode() === 'cloud') {
    const cloudFolder = await resolveCloudFolder(title);
    if (!cloudFolder) {
      return new Response(TRANSPARENT_PNG, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    const dirCandidates = ['Illustrations', 'illustrations', 'Illustration', 'images', 'imgs'];
    for (const dir of dirCandidates) {
      const url = buildCloudTextUrl(['by-title', cloudFolder, dir, safeImage]);
      if (!url) continue;
      if (await cloudFileExists(url)) {
        return redirectTo(url);
      }
    }

    const directUrl = buildCloudTextUrl(['by-title', cloudFolder, safeImage]);
    if (directUrl && (await cloudFileExists(directUrl))) {
      return redirectTo(directUrl);
    }

    return new Response(TRANSPARENT_PNG, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  const requestedKey = normalizeKey(title);

  // Find matching folder
  let matchedFolderName: string | null = null;
  try {
    const entries = readdirSync(BY_TITLE_DIR, { withFileTypes: true });
    const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    const exact = folders.find((f) => normalizeKey(f) === requestedKey);
    matchedFolderName = exact ?? null;

    // Fallback: partial match
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
    devLogMissingImage('No matching book folder', { title, requestedKey });
    return new Response(TRANSPARENT_PNG, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  // Check illustrations folder (case-insensitive, plug-and-play)
  const bookFolderPath = join(BY_TITLE_DIR, matchedFolderName);
  const illustrationsFolderName = findIllustrationsFolder(bookFolderPath) ?? 'Illustrations';
  const illustrationsPath = join(bookFolderPath, illustrationsFolderName);
  const imagePath = join(illustrationsPath, safeImage);

  // Helper to find and serve an image file
  const serveImage = (filePath: string, fileName: string) => {
    if (isVideoFile(fileName)) {
      const size = statSync(filePath).size;
      const range = req.headers.get('range');

      if (range) {
        const match = /bytes=(\d*)-(\d*)/.exec(range);
        if (match) {
          const start = match[1] ? Number(match[1]) : 0;
          const end = match[2] ? Number(match[2]) : size - 1;
          const clampedStart = Math.max(0, Math.min(start, size - 1));
          const clampedEnd = Math.max(clampedStart, Math.min(end, size - 1));
          const stream = createReadStream(filePath, { start: clampedStart, end: clampedEnd });
          const body = Readable.toWeb(stream) as ReadableStream;
          return new Response(body, {
            status: 206,
            headers: {
              'Content-Type': guessContentType(fileName),
              'Content-Range': `bytes ${clampedStart}-${clampedEnd}/${size}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(clampedEnd - clampedStart + 1),
              'Cache-Control': 'no-store, max-age=0',
            },
          });
        }
      }

      const stream = createReadStream(filePath);
      const body = Readable.toWeb(stream) as ReadableStream;
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': guessContentType(fileName),
          'Accept-Ranges': 'bytes',
          'Content-Length': String(size),
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    const stream = createReadStream(filePath);
    const body = Readable.toWeb(stream) as ReadableStream;
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': guessContentType(fileName),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  };

  // Try exact path first
  if (existsSync(imagePath)) {
    return serveImage(imagePath, safeImage);
  }

  // Try finding the image with various matching strategies
  try {
    const files = readdirSync(illustrationsPath);
    
    // 1. Case-insensitive exact match
    let match = files.find((f) => f.toLowerCase() === safeImage.toLowerCase());
    
    // 2. Try with "image" prefix (e.g., "1.png" -> "image1.png")
    if (!match) {
      const withPrefix = 'image' + safeImage;
      match = files.find((f) => f.toLowerCase() === withPrefix.toLowerCase());
    }
    
    // 3. Try extracting number and matching (e.g., "1.png" matches "image1.png", "illustration_1.png", etc.)
    if (!match) {
      const numMatch = safeImage.match(/^(\d+)\.(png|jpg|jpeg|webp)$/i);
      if (numMatch) {
        const num = numMatch[1];
        const ext = numMatch[2].toLowerCase();
        match = files.find((f) => {
          const lower = f.toLowerCase();
          // Match patterns like: image1.png, illustration1.png, img_1.png, 01.png
          return (
            lower.endsWith(`.${ext}`) &&
            (lower.includes(num) || lower.match(new RegExp(`0*${num}\\.[^.]+$`)))
          );
        });
      }
    }
    
    if (match) {
      const matchedPath = join(illustrationsPath, match);
      return serveImage(matchedPath, match);
    }
  } catch {
    // Illustrations folder doesn't exist
  }
  devLogMissingImage('Image not found', {
    title,
    image: safeImage,
    attempted: imagePath,
    illustrationsPath,
  });
  return new Response(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
