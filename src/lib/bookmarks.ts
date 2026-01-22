import { del, get, getMany, keys, set } from 'idb-keyval';

export type AbridgedVariant = 'full' | 'bedtime';

export type BookmarkSide = 'left' | 'right';

export type AbridgedBookmark = {
  pageIndex: number;
  updatedAt: number;
  side?: BookmarkSide;
};

export type AbridgedBookmarkEntry = {
  bookId: number;
  variant: AbridgedVariant;
  bookmark: AbridgedBookmark;
};

const BOOKMARK_EVENT = 'taletime-bookmark-changed';
const BOOKMARK_KEY_PREFIX = 'taletime-bookmark:v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getBookmarkEventName(): string {
  return BOOKMARK_EVENT;
}

export function abridgedBookmarkKey(bookId: number, variant: AbridgedVariant): string {
  return `${BOOKMARK_KEY_PREFIX}:${bookId}:${variant}`;
}

export async function getAbridgedBookmark(
  bookId: number,
  variant: AbridgedVariant
): Promise<AbridgedBookmark | null> {
  const value = await get<AbridgedBookmark | null>(abridgedBookmarkKey(bookId, variant));
  if (!value) return null;
  if (typeof value !== 'object') return null;
  if (typeof (value as AbridgedBookmark).pageIndex !== 'number') return null;
  return value as AbridgedBookmark;
}

export async function listAbridgedBookmarks(): Promise<AbridgedBookmarkEntry[]> {
  if (!isBrowser()) return [];

  let allKeys: unknown[] = [];
  try {
    allKeys = (await keys()) as unknown[];
  } catch {
    return [];
  }

  const prefix = `${BOOKMARK_KEY_PREFIX}:`;
  const bookmarkKeys = allKeys
    .filter((k): k is string => typeof k === 'string' && k.startsWith(prefix))
    .map((k) => k as string);

  if (bookmarkKeys.length === 0) return [];

  let values: Array<AbridgedBookmark | null | undefined>;
  try {
    values = (await getMany(bookmarkKeys)) as Array<AbridgedBookmark | null | undefined>;
  } catch {
    values = await Promise.all(bookmarkKeys.map((k) => get<AbridgedBookmark | null>(k)));
  }

  const out: AbridgedBookmarkEntry[] = [];
  for (let i = 0; i < bookmarkKeys.length; i++) {
    const key = bookmarkKeys[i];
    const value = values[i];
    if (!value) continue;
    if (typeof value !== 'object') continue;
    if (typeof (value as AbridgedBookmark).pageIndex !== 'number') continue;

    // Key format: taletime-bookmark:v1:<bookId>:<variant>
    const parts = key.split(':');
    const bookIdRaw = parts[2];
    const variantRaw = parts[3];
    const bookId = parseInt(bookIdRaw);
    if (!Number.isFinite(bookId) || bookId <= 0) continue;
    if (variantRaw !== 'full' && variantRaw !== 'bedtime') continue;

    out.push({ bookId, variant: variantRaw, bookmark: value as AbridgedBookmark });
  }

  return out;
}

export async function setAbridgedBookmark(
  bookId: number,
  variant: AbridgedVariant,
  pageIndex: number,
  side?: BookmarkSide
): Promise<AbridgedBookmark> {
  const bookmark: AbridgedBookmark = {
    pageIndex,
    updatedAt: Date.now(),
    ...(side ? { side } : {}),
  };
  await set(abridgedBookmarkKey(bookId, variant), bookmark);
  notifyBookmarkChanged(bookId);
  return bookmark;
}

export async function clearAbridgedBookmark(bookId: number, variant: AbridgedVariant): Promise<void> {
  await del(abridgedBookmarkKey(bookId, variant));
  notifyBookmarkChanged(bookId);
}

export async function hasAbridgedBookmark(bookId: number, variant: AbridgedVariant): Promise<boolean> {
  const value = await getAbridgedBookmark(bookId, variant);
  return Boolean(value);
}

export async function getAnyAbridgedBookmarkMap(bookIds: number[]): Promise<Record<number, boolean>> {
  const ids = Array.from(new Set(bookIds.filter((id) => Number.isFinite(id))));
  if (ids.length === 0) return {};

  const keys: string[] = [];
  for (const id of ids) {
    keys.push(abridgedBookmarkKey(id, 'full'));
    keys.push(abridgedBookmarkKey(id, 'bedtime'));
  }

  let values: Array<AbridgedBookmark | null | undefined>;
  try {
    values = (await getMany(keys)) as Array<AbridgedBookmark | null | undefined>;
  } catch {
    // Fallback if getMany isn't available for some reason.
    values = await Promise.all(keys.map((k) => get<AbridgedBookmark | null>(k)));
  }

  const result: Record<number, boolean> = {};
  for (let i = 0; i < ids.length; i++) {
    const full = values[i * 2];
    const bedtime = values[i * 2 + 1];
    result[ids[i]] = Boolean(full) || Boolean(bedtime);
  }

  return result;
}

export async function getAbridgedBookmarkVariantMap(
  bookIds: number[]
): Promise<Record<number, AbridgedVariant | null>> {
  const ids = Array.from(new Set(bookIds.filter((id) => Number.isFinite(id))));
  if (ids.length === 0) return {};

  const keys: string[] = [];
  for (const id of ids) {
    keys.push(abridgedBookmarkKey(id, 'full'));
    keys.push(abridgedBookmarkKey(id, 'bedtime'));
  }

  let values: Array<AbridgedBookmark | null | undefined>;
  try {
    values = (await getMany(keys)) as Array<AbridgedBookmark | null | undefined>;
  } catch {
    values = await Promise.all(keys.map((k) => get<AbridgedBookmark | null>(k)));
  }

  const result: Record<number, AbridgedVariant | null> = {};
  for (let i = 0; i < ids.length; i++) {
    const full = values[i * 2];
    const bedtime = values[i * 2 + 1];

    if (full && !bedtime) {
      result[ids[i]] = 'full';
      continue;
    }
    if (!full && bedtime) {
      result[ids[i]] = 'bedtime';
      continue;
    }
    if (full && bedtime) {
      const fullUpdated = typeof full.updatedAt === 'number' ? full.updatedAt : 0;
      const bedtimeUpdated = typeof bedtime.updatedAt === 'number' ? bedtime.updatedAt : 0;
      result[ids[i]] = bedtimeUpdated >= fullUpdated ? 'bedtime' : 'full';
      continue;
    }
    result[ids[i]] = null;
  }

  return result;
}

export function notifyBookmarkChanged(bookId: number) {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent(BOOKMARK_EVENT, { detail: { bookId } }));
  } catch {
    // ignore
  }
}
