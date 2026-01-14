import { NextRequest } from 'next/server';
import { createReadStream, readdirSync, statSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const BY_TITLE_DIR = join(process.cwd(), '.data', 'texts', 'by-title');

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

function resolveAudioPath(title: string): { absPath: string; filename: string } | null {
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

  if (!matchedFolderName) return null;

  const folderPath = join(BY_TITLE_DIR, matchedFolderName);

  let audioName: string | null = null;
  try {
    const files = readdirSync(folderPath, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);

    const preferred = files.find(
      (f) => f.toLowerCase().endsWith('.mp3') && normalizeKey(f.replace(/\.[^.]+$/, '')) === requestedKey
    );

    audioName = preferred ?? files.find((f) => f.toLowerCase().endsWith('.mp3')) ?? null;
  } catch {
    audioName = null;
  }

  if (!audioName) return null;
  const absPath = join(folderPath, audioName);
  return { absPath, filename: audioName };
}

export async function HEAD(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title');
  if (!title) {
    return new Response('Missing title', { status: 400 });
  }

  const resolved = resolveAudioPath(title);
  if (!resolved) return new Response('Audio not found', { status: 404 });

  const stat = statSync(resolved.absPath);
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(stat.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title');
  if (!title) {
    return new Response('Missing title', { status: 400 });
  }

  const resolved = resolveAudioPath(title);
  if (!resolved) return new Response('Audio not found', { status: 404 });

  const range = req.headers.get('range');
  const stat = statSync(resolved.absPath);
  const size = stat.size;

  if (range) {
    // Example: bytes=0-1023
    const match = /^bytes=(\d+)-(\d*)$/i.exec(range);
    if (!match) {
      return new Response('Invalid Range', {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }

    const start = Number(match[1]);
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
      return new Response('Invalid Range', {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }

    const chunkSize = end - start + 1;
    const stream = createReadStream(resolved.absPath, { start, end });
    return new Response(stream as any, {
      status: 206,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(chunkSize),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  const stream = createReadStream(resolved.absPath);
  return new Response(stream as any, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes',
      // Keep uncached so newly dropped-in files show up immediately.
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
