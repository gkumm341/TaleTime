import { NextRequest } from 'next/server';
import { createReadStream, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { buildCloudTextUrl, getContentMode } from '@/lib/server/content-source';
import { getCloudBookId, loadCloudCatalogMetadata } from '@/lib/server/cloud-catalog';
import { nodeStreamToWeb } from '@/lib/server/node-stream-to-web';

export const runtime = 'nodejs';

const BY_TITLE_DIR = join(process.cwd(), '.data', 'texts', 'by-title');

type CloudMetadata = {
  book?: {
    title?: string;
  };
  local?: {
    folderName?: string;
    files?: Array<{
      role?: string;
      filename?: string;
    }>;
  };
};

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

function resolveAudioPath(title: string, folder?: string | null): { absPath: string; filename: string } | null {
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

function buildCloudAudioHeaders(source: Headers): Headers {
  const headers = new Headers();
  const passThrough = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
  ];

  for (const key of passThrough) {
    const value = source.get(key);
    if (value) headers.set(key, value);
  }

  if (!headers.has('content-type')) {
    headers.set('Content-Type', 'audio/mpeg');
  }

  headers.set('Cache-Control', 'no-store, max-age=0');
  return headers;
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

function resolveFolderCandidates(title: string, folder?: string | null): string[] {
  return uniqueStrings([
    folder || '',
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

function getAudioUrlFromCloudMetadata(metadata: CloudMetadata, fallbackFolder: string): string | null {
  const folder = metadata.local?.folderName?.trim() || fallbackFolder;
  const audioFilename = (metadata.local?.files || []).find((f) => {
    const filename = f.filename || '';
    return f.role === 'audio' && filename.toLowerCase().endsWith('.mp3');
  })?.filename;

  if (!audioFilename) return null;

  const audioUrl = buildCloudTextUrl(['by-title', folder, audioFilename]);
  return audioUrl || null;
}

async function resolveCloudAudioUrl(title: string, folder?: string | null, bookId?: number | null): Promise<string | null> {
  if (bookId != null) {
    try {
      const catalog = await loadCloudCatalogMetadata();
      const matched = catalog.find((item) => getCloudBookId(item) === bookId) as CloudMetadata | undefined;
      if (matched) {
        const fallbackFolder = folder?.trim() || matched.book?.title?.trim() || title;
        const byIdUrl = getAudioUrlFromCloudMetadata(matched, fallbackFolder);
        if (byIdUrl) return byIdUrl;
      }
    } catch {
      // ignore and continue with title/folder candidates
    }
  }

  const candidates = resolveFolderCandidates(title, folder);
  for (const candidate of candidates) {
    const metadata = await fetchCloudMetadataForFolder(candidate);
    if (!metadata) continue;

    const byTitleUrl = getAudioUrlFromCloudMetadata(metadata, candidate);
    if (byTitleUrl) return byTitleUrl;
  }

  return null;
}

export async function HEAD(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title');
  const folder = req.nextUrl.searchParams.get('folder');
  const bookIdRaw = Number(req.nextUrl.searchParams.get('bookId'));
  const bookId = Number.isFinite(bookIdRaw) && bookIdRaw > 0 ? bookIdRaw : null;
  if (!title) {
    return new Response('Missing title', { status: 400 });
  }

  if (getContentMode() === 'cloud') {
    const audioUrl = await resolveCloudAudioUrl(title, folder, bookId);
    if (!audioUrl) return new Response('Audio not found', { status: 404 });

    const range = req.headers.get('range');
    const requestHeaders = new Headers();
    if (range) requestHeaders.set('range', range);

    try {
      const upstream = await fetch(audioUrl, {
        method: 'HEAD',
        headers: requestHeaders,
        cache: 'no-store',
      });

      return new Response(null, {
        status: upstream.status,
        headers: buildCloudAudioHeaders(upstream.headers),
      });
    } catch {
      return new Response('Audio upstream unavailable', { status: 502 });
    }
  }

  const resolved = resolveAudioPath(title, folder);
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
  const folder = req.nextUrl.searchParams.get('folder');
  const bookIdRaw = Number(req.nextUrl.searchParams.get('bookId'));
  const bookId = Number.isFinite(bookIdRaw) && bookIdRaw > 0 ? bookIdRaw : null;
  if (!title) {
    return new Response('Missing title', { status: 400 });
  }

  if (getContentMode() === 'cloud') {
    const audioUrl = await resolveCloudAudioUrl(title, folder, bookId);
    if (!audioUrl) return new Response('Audio not found', { status: 404 });

    const range = req.headers.get('range');
    const requestHeaders = new Headers();
    if (range) requestHeaders.set('range', range);

    try {
      const upstream = await fetch(audioUrl, {
        method: 'GET',
        headers: requestHeaders,
        cache: 'no-store',
      });

      const headers = buildCloudAudioHeaders(upstream.headers);
      return new Response(upstream.body, {
        status: upstream.status,
        headers,
      });
    } catch {
      return new Response('Audio upstream unavailable', { status: 502 });
    }
  }

  const resolved = resolveAudioPath(title, folder);
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
    const body = nodeStreamToWeb(stream);
    return new Response(body, {
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
  const body = nodeStreamToWeb(stream);
  return new Response(body, {
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
