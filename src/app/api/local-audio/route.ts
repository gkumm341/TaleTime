import { NextRequest } from 'next/server';
import { createReadStream, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { buildCloudTextUrl, getContentMode } from '@/lib/server/content-source';

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

function buildTitleCandidates(rawTitle: string): string[] {
  const candidates = [
    rawTitle,
    rawTitle.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    rawTitle.replace(/\s*\[[^\]]*\]\s*$/, '').trim(),
    rawTitle.split(':')[0]?.trim() || rawTitle,
  ].filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = normalizeKey(candidate);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
}

function buildFileStemCandidates(folderName: string): string[] {
  const stems = [
    folderName,
    folderName.replace(/\s+/g, '_'),
    folderName.replace(/\s+/g, '-'),
    folderName.replace(/[^\p{L}\p{N}\s_-]+/gu, '').replace(/\s+/g, '_'),
    folderName.replace(/[^\p{L}\p{N}\s_-]+/gu, '').replace(/\s+/g, '-'),
  ];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const stem of stems) {
    const normalized = stem.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

async function findCloudAudioUrl(title: string): Promise<{ url: string; filename: string } | null> {
  const titleCandidates = buildTitleCandidates(title);

  for (const folderName of titleCandidates) {
    const stemCandidates = buildFileStemCandidates(folderName);
    const fileCandidates = [
      ...stemCandidates.map((stem) => `${stem}.mp3`),
      'audio.mp3',
      'narration.mp3',
    ];
    for (const fileName of fileCandidates) {
      const url = buildCloudTextUrl(['by-title', folderName, fileName]);
      if (!url) continue;
      try {
        const head = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (head.ok) return { url, filename: fileName };
      } catch {
      }
    }
  }

  return null;
}

export async function HEAD(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title');
  if (!title) {
    return new Response('Missing title', { status: 400 });
  }

  if (getContentMode() === 'cloud') {
    const cloud = await findCloudAudioUrl(title);
    if (!cloud) return new Response('Audio not found', { status: 404 });

    const upstream = await fetch(cloud.url, { method: 'HEAD', cache: 'no-store' });
    if (!upstream.ok) return new Response('Audio not found', { status: 404 });

    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
        'Content-Length': upstream.headers.get('content-length') || '',
        'Accept-Ranges': upstream.headers.get('accept-ranges') || 'bytes',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
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

  if (getContentMode() === 'cloud') {
    const cloud = await findCloudAudioUrl(title);
    if (!cloud) return new Response('Audio not found', { status: 404 });

    const headers: HeadersInit = {};
    const range = req.headers.get('range');
    if (range) headers.Range = range;

    const upstream = await fetch(cloud.url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      return new Response('Audio not found', { status: 404 });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
        'Content-Length': upstream.headers.get('content-length') || '',
        'Content-Range': upstream.headers.get('content-range') || '',
        'Accept-Ranges': upstream.headers.get('accept-ranges') || 'bytes',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
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
