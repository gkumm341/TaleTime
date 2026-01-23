'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bookmark, BookOpen, Moon, X, Home } from 'lucide-react';

import {
  clearAbridgedBookmark,
  getBookmarkEventName,
  listAbridgedBookmarks,
  type AbridgedVariant,
} from '@/lib/bookmarks';

type CatalogBook = {
  id: number;
  title: string;
  authors: string;
  coverUrl?: string | null;
  minutes?: number | null;
};

type BookmarkedItem = {
  book: CatalogBook;
  hasFull: boolean;
  hasBedtime: boolean;
  fullPageIndex: number | null;
  bedtimePageIndex: number | null;
  preferredVariant: AbridgedVariant;
  updatedAt: number;
};

function variantLabel(v: AbridgedVariant) {
  return v === 'full' ? 'Full story' : 'Bedtime adaptation';
}

function variantIcon(v: AbridgedVariant) {
  return v === 'full' ? <BookOpen className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
}

export default function ContinueBookmarked() {
  const isLocalContent = process.env.NEXT_PUBLIC_CONTENT_MODE === 'local';
  const [items, setItems] = useState<BookmarkedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [clearingKey, setClearingKey] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => void load();
    window.addEventListener(getBookmarkEventName(), handler as EventListener);
    return () => window.removeEventListener(getBookmarkEventName(), handler as EventListener);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const entries = await listAbridgedBookmarks();

      const grouped = new Map<
        number,
        {
          fullUpdatedAt: number | null;
          bedtimeUpdatedAt: number | null;
          fullPageIndex: number | null;
          bedtimePageIndex: number | null;
          updatedAt: number;
          preferred: AbridgedVariant;
        }
      >();

      for (const e of entries) {
        const current = grouped.get(e.bookId) ?? {
          fullUpdatedAt: null,
          bedtimeUpdatedAt: null,
          fullPageIndex: null,
          bedtimePageIndex: null,
          updatedAt: 0,
          preferred: 'full' as const,
        };

        const updatedAt = typeof e.bookmark.updatedAt === 'number' ? e.bookmark.updatedAt : 0;
        const pageIndex = typeof e.bookmark.pageIndex === 'number' ? e.bookmark.pageIndex : null;

        if (e.variant === 'full') {
          const nextFullUpdated = Math.max(current.fullUpdatedAt ?? 0, updatedAt);
          if (nextFullUpdated !== (current.fullUpdatedAt ?? 0)) {
            current.fullUpdatedAt = nextFullUpdated;
            current.fullPageIndex = pageIndex;
          }
        }

        if (e.variant === 'bedtime') {
          const nextBedUpdated = Math.max(current.bedtimeUpdatedAt ?? 0, updatedAt);
          if (nextBedUpdated !== (current.bedtimeUpdatedAt ?? 0)) {
            current.bedtimeUpdatedAt = nextBedUpdated;
            current.bedtimePageIndex = pageIndex;
          }
        }

        const latestVariant: AbridgedVariant =
          (current.bedtimeUpdatedAt ?? 0) >= (current.fullUpdatedAt ?? 0) ? 'bedtime' : 'full';

        current.preferred = latestVariant;
        current.updatedAt = Math.max(current.updatedAt, updatedAt);

        grouped.set(e.bookId, current);
      }

      const ids = Array.from(grouped.keys());
      if (ids.length === 0) {
        setItems([]);
        return;
      }

      const response = await fetch(`/api/catalog?ids=${ids.join(',')}&limit=${Math.min(ids.length, 100)}`);
      if (!response.ok) throw new Error('Failed to load bookmarked books');

      const payload = (await response.json()) as { results?: CatalogBook[] };
      const books = payload.results ?? [];
      const byId = new Map<number, CatalogBook>();
      for (const b of books) byId.set(b.id, b);

      const next: BookmarkedItem[] = [];
      for (const id of ids) {
        const book = byId.get(id);
        if (!book) continue;
        const meta = grouped.get(id);
        if (!meta) continue;

        next.push({
          book,
          hasFull: Boolean(meta.fullUpdatedAt),
          hasBedtime: Boolean(meta.bedtimeUpdatedAt),
          fullPageIndex: meta.fullPageIndex,
          bedtimePageIndex: meta.bedtimePageIndex,
          preferredVariant: meta.preferred,
          updatedAt: meta.updatedAt,
        });
      }

      next.sort((a, b) => b.updatedAt - a.updatedAt);
      setItems(next);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const empty = useMemo(() => !loading && items.length === 0, [items.length, loading]);

  async function handleUnbookmark(bookId: number, variant: AbridgedVariant) {
    const key = `${bookId}:${variant}`;
    setClearingKey(key);
    try {
      await clearAbridgedBookmark(bookId, variant);
      await load();
    } finally {
      setClearingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-tt bg-gradient-to-br from-tt-secondary to-tt-accent/40 ring-1 ring-tt-border/10 shadow-sm">
            <Bookmark className="h-6 w-6 text-tt-accent" />
          </span>
          <h1 className="text-2xl font-bold text-tt-tertiary">Continue</h1>
        </div>
        <div className="text-sm text-tt-muted dark:text-gray-300">Loading your bookmarked books…</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-tt bg-gradient-to-br from-tt-secondary to-tt-accent/40 ring-1 ring-tt-border/10 shadow-sm">
            <Bookmark className="h-6 w-6 text-tt-accent" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-tt-tertiary">Continue</h1>
            <div className="text-sm text-tt-muted dark:text-gray-300">Your bookmarked stories</div>
          </div>
        </div>
        
        <Link
          href="/"
          className="text-sm font-semibold text-tt-accent hover:text-tt-tertiary transition-all flex items-center gap-1.5 group"
        >
          Home
          <span className="group-hover:translate-x-1 transition-transform"><Home className="h-4 w-4" /></span>
        </Link>
      </div>

      {empty ? (
        <div className="rounded-tt-xl border border-tt-border/20 dark:border-tt-border/10 bg-tt-surface dark:bg-gray-900 p-8 shadow-tt">
          <div className="text-lg font-semibold text-tt-primary dark:text-gray-100">No bookmarks yet</div>
          <div className="mt-2 text-sm text-tt-muted dark:text-gray-300">
            Add a bookmark in Full story or Bedtime adaptation, then come back here to continue reading.
          </div>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-tt-tertiary px-5 py-2.5 text-sm font-semibold text-white hover:bg-tt-tertiary/90 transition-colors"
            >
              Find a story
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const primaryHref = `/book/${item.book.id}/abridged?variant=${item.preferredVariant}`;
            const coverSrc = isLocalContent
              ? `/api/local-image?title=${encodeURIComponent(item.book.title)}`
              : item.book.coverUrl;

            return (
              <div
                key={item.book.id}
                className="group rounded-tt-xl border border-tt-border/20 dark:border-tt-border/10 bg-tt-surface dark:bg-gray-900 overflow-hidden shadow-tt hover:shadow-lg hover:shadow-tt-tertiary/10 transition-all"
              >
                <Link href={primaryHref} className="block">
                  <div className="relative w-full aspect-[3/4] bg-gray-50 dark:bg-gray-800 overflow-hidden">
                    {coverSrc ? (
                      <Image
                        src={coverSrc}
                        alt={item.book.title}
                        fill
                        sizes="(min-width: 1024px) 240px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">No cover</div>
                    )}
                    <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-gray-950/50 backdrop-blur px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10">
                      {variantIcon(item.preferredVariant)}
                      {variantLabel(item.preferredVariant)}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="font-bold text-sm line-clamp-2 group-hover:text-tt-tertiary transition-colors">
                      {item.book.title}
                    </div>
                    <div className="mt-1 text-xs text-tt-muted dark:text-gray-400 line-clamp-1 font-medium">
                      {item.book.authors}
                    </div>
                  </div>
                </Link>

                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {item.hasFull && (
                    <div className="inline-flex items-center rounded-full border border-tt-tertiary/30 text-tt-tertiary overflow-hidden">
                      <Link
                        href={`/book/${item.book.id}/abridged?variant=full`}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-tt-tertiary/10 transition-colors"
                        title="Open Full story"
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>
                          Full{typeof item.fullPageIndex === 'number' ? ` · p${item.fullPageIndex}` : ''}
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleUnbookmark(item.book.id, 'full')}
                        disabled={clearingKey === `${item.book.id}:full`}
                        className="px-2 py-2 hover:bg-tt-tertiary/10 transition-colors disabled:opacity-50"
                        aria-label="Remove Full bookmark"
                        title="Remove Full bookmark"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {item.hasBedtime && (
                    <div className="inline-flex items-center rounded-full border border-tt-accent/40 text-tt-accent overflow-hidden">
                      <Link
                        href={`/book/${item.book.id}/abridged?variant=bedtime`}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-tt-accent/10 transition-colors"
                        title="Open Bedtime adaptation"
                      >
                        <Moon className="h-4 w-4" />
                        <span>
                          Bedtime{typeof item.bedtimePageIndex === 'number' ? ` · p${item.bedtimePageIndex}` : ''}
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleUnbookmark(item.book.id, 'bedtime')}
                        disabled={clearingKey === `${item.book.id}:bedtime`}
                        className="px-2 py-2 hover:bg-tt-accent/10 transition-colors disabled:opacity-50"
                        aria-label="Remove Bedtime bookmark"
                        title="Remove Bedtime bookmark"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
