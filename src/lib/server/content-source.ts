export type ContentMode = 'local' | 'cloud';

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

export function getContentMode(): ContentMode {
  const mode = (process.env.CONTENT_MODE || '').trim().toLowerCase();
  if (mode === 'cloud') return 'cloud';
  if (mode === 'local') return 'local';

  if (process.env.VERCEL === '1') {
    return 'cloud';
  }

  return 'local';
}

export function getLocalTextDir(): string {
  return process.env.LOCAL_TEXT_DIR || '.data/texts';
}

export function buildCloudDataUrl(pathOrSegments: string | string[]): string | null {
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

export function buildCloudTextUrl(pathOrSegments: string | string[]): string | null {
  const relative = Array.isArray(pathOrSegments)
    ? ['texts', ...pathOrSegments].join('/')
    : `texts/${pathOrSegments}`;
  return buildCloudDataUrl(relative);
}
