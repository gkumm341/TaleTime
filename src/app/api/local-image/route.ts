import { NextRequest } from 'next/server';
import { createReadStream } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const BY_TITLE_DIR = join(process.cwd(), '.data', 'texts', 'by-title');

// 1x1 transparent PNG
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X9m7QAAAAASUVORK5CYII=',
  'base64'
);

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
  const folder = req.nextUrl.searchParams.get('folder');
  if (!title) {
    return new Response('Missing title', { status: 400 });
  }

  const requestedKey = normalizeKey(title);
  const requestedFolder = folder?.trim();

  let matchedFolderName: string | null = null;
  try {
    const entries = readdirSync(BY_TITLE_DIR, { withFileTypes: true });
    const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    if (requestedFolder) {
      const directFolder = folders.find((f) => f === requestedFolder);
      if (directFolder) {
        matchedFolderName = directFolder;
      }
    }

    if (!matchedFolderName) {
      const exact = folders.find((f) => normalizeKey(f) === requestedKey);
      matchedFolderName = exact ?? null;
    }

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
    return new Response(TRANSPARENT_PNG, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
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
    return new Response(TRANSPARENT_PNG, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
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
