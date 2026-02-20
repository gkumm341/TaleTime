import { NextRequest } from 'next/server';
import { createReadStream } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';
import { buildCloudTextUrl, getContentMode } from '@/lib/server/content-source';
import { getCloudBookId, loadCloudCatalogMetadata } from '@/lib/server/cloud-catalog';
import { nodeStreamToWeb } from '@/lib/server/node-stream-to-web';

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

type CloudMetadata = {
  book?: {
    links?: {
      coverUrl?: string;
    };
  };
  local?: {
    folderName?: string;
    files?: Array<{
      role?: string;
      filename?: string;
    }>;
  };
};

async function proxyImage(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok || !res.body) return null;

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentLength = res.headers.get('content-length');

    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'no-store, max-age=0',
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(res.body, {
      status: 200,
      headers,
    });
  } catch {
    return null;
  }
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
  const values = [
    folder || '',
    title,
    title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    title.replace(/\s*\[[^\]]*\]\s*$/, '').trim(),
    title.split(':')[0]?.trim() || title,
  ];
  return uniqueStrings(values);
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

async function resolveCloudMetadata(
  title: string,
  folder?: string | null,
  bookId?: number | null
): Promise<{ metadata: CloudMetadata; folderName: string } | null> {

  if (bookId != null) {
    try {
      const catalog = await loadCloudCatalogMetadata();
      const matched = catalog.find((item) => getCloudBookId(item) === bookId) as CloudMetadata | undefined;
      if (matched) {
        return {
          metadata: matched,
          folderName: matched.local?.folderName?.trim() || folder?.trim() || title,
        };
      }
    } catch {
      // ignore and continue with title/folder candidates
    }
  }

  const candidates = resolveFolderCandidates(title, folder);
  for (const candidate of candidates) {
    const metadata = await fetchCloudMetadataForFolder(candidate);
    if (metadata) {
      return {
        metadata,
        folderName: metadata.local?.folderName?.trim() || candidate,
      };
    }
  }
  return null;
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
    const resolved = await resolveCloudMetadata(title, folder, bookId);
    if (resolved) {
      const cloudFolder = resolved.folderName;
      const files = resolved.metadata.local?.files || [];
      const imageFilename = files.find((f) => {
        const filename = f.filename || '';
        return f.role === 'image' && isSupportedImage(filename);
      })?.filename;

      if (imageFilename) {
        const url = buildCloudTextUrl(['by-title', cloudFolder, imageFilename]);
        if (url) {
          const proxied = await proxyImage(url);
          if (proxied) return proxied;
        }
      }

      const fallbackCoverUrl = resolved.metadata.book?.links?.coverUrl;
      if (fallbackCoverUrl && /^https?:\/\//i.test(fallbackCoverUrl)) {
        const proxied = await proxyImage(fallbackCoverUrl);
        if (proxied) return proxied;
      }
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
  const body = nodeStreamToWeb(stream);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': guessContentType(imageName),
      // Keep this uncached so newly dropped-in files show up immediately.
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
