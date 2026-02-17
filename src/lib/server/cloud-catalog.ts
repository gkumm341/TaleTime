import { buildCloudTextUrl } from '@/lib/server/content-source';

export interface CloudBookMetadata {
  book: {
    id: number | null;
    title: string;
    authors?: string[];
    languages?: string[];
    subjects?: string[];
    downloadCount?: number | null;
    links?: {
      txtUrl?: string | null;
      epubUrl?: string | null;
      coverUrl?: string | null;
    };
    estimate?: {
      minutes?: number | null;
      words?: number | null;
    } | null;
  };
  local?: {
    folderName?: string;
  };
}

let cloudCatalogCache: { expiresAt: number; items: CloudBookMetadata[] } | null = null;

function stableFallbackId(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return 900000 + (Math.abs(hash) % 100000);
}

function normalizeMetadata(input: unknown): CloudBookMetadata[] {
  if (Array.isArray(input)) {
    return input.filter((item): item is CloudBookMetadata => !!item && typeof item === 'object' && !!(item as CloudBookMetadata).book);
  }

  if (!input || typeof input !== 'object') return [];

  const obj = input as Record<string, unknown>;
  const candidates = [obj.books, obj.results, obj.items, obj.metadata];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is CloudBookMetadata => !!item && typeof item === 'object' && !!(item as CloudBookMetadata).book);
    }
  }

  return [];
}

function resolveCatalogUrl(): string | null {
  const explicit = (process.env.CLOUDFRONT_CATALOG_URL || '').trim();
  if (explicit) return explicit;

  const baseUrl = (process.env.CLOUDFRONT_BASE_URL || '').trim();
  if (!baseUrl || /your-cloudfront-domain/i.test(baseUrl)) {
    return null;
  }

  const byTitleCatalog = buildCloudTextUrl(['by-title', 'catalog.json']);
  if (byTitleCatalog) return byTitleCatalog;

  return buildCloudTextUrl(['catalog.json']);
}

export async function loadCloudCatalogMetadata(): Promise<CloudBookMetadata[]> {
  const now = Date.now();
  if (cloudCatalogCache && cloudCatalogCache.expiresAt > now) {
    return cloudCatalogCache.items;
  }

  const url = resolveCatalogUrl();
  if (!url) return [];

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];

    const json = (await res.json()) as unknown;
    const items = normalizeMetadata(json);
    cloudCatalogCache = {
      items,
      expiresAt: now + 30_000,
    };
    return items;
  } catch {
    return [];
  }
}

export function getCloudBookId(meta: CloudBookMetadata): number {
  const rawId = meta.book.id;
  if (typeof rawId === 'number' && Number.isFinite(rawId) && rawId > 0) return rawId;
  return stableFallbackId(meta.book.title || 'untitled');
}
